/**
 * Search tool implementation for OT security requirements
 */

import { DatabaseClient } from '../database/client.js';
import { OTRequirement, RequirementSearchResult, SearchOptions } from '../types/index.js';

/**
 * Search parameters interface
 */
export interface SearchRequirementsParams {
  query: string;
  options?: SearchOptions;
}

/**
 * Extract a snippet showing where the search query matched
 *
 * @param req - The requirement to extract snippet from
 * @param query - The search query
 * @returns A snippet of up to 150 characters showing the match context
 */
function extractSnippet(req: OTRequirement, query: string): string {
  const searchTerm = query.toLowerCase();

  // Check title first (highest priority)
  if (req.title && req.title.toLowerCase().includes(searchTerm)) {
    return req.title.length > 150 ? req.title.substring(0, 150) + '...' : req.title;
  }

  // Check description
  if (req.description && req.description.toLowerCase().includes(searchTerm)) {
    return extractContext(req.description, searchTerm, 150);
  }

  // Check rationale
  if (req.rationale && req.rationale.toLowerCase().includes(searchTerm)) {
    return extractContext(req.rationale, searchTerm, 150);
  }

  // Fallback to title or description
  return req.title || req.description?.substring(0, 150) || '';
}

/**
 * Extract context around a search term match
 *
 * @param text - The text to extract from
 * @param searchTerm - The search term to find (lowercase)
 * @param maxLength - Maximum length of the snippet
 * @returns Text snippet with context around the match
 */
function extractContext(text: string, searchTerm: string, maxLength: number): string {
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(searchTerm);

  if (index === -1) {
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Extract text around the match
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + searchTerm.length + 100);

  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Calculate relevance score based on where the match occurred
 *
 * @param req - The requirement to score
 * @param query - The search query
 * @returns Relevance score between 0.0 and 1.0
 */
function calculateRelevance(req: OTRequirement, query: string): number {
  const searchTerm = query.toLowerCase();

  // Title match: highest relevance
  if (req.title && req.title.toLowerCase().includes(searchTerm)) {
    return 1.0;
  }

  // Description match: medium-high relevance
  if (req.description && req.description.toLowerCase().includes(searchTerm)) {
    return 0.7;
  }

  // Rationale match: medium relevance
  if (req.rationale && req.rationale.toLowerCase().includes(searchTerm)) {
    return 0.5;
  }

  // Fallback for edge cases
  return 0.3;
}

/**
 * Search for OT security requirements across all standards
 *
 * Performs full-text search across requirement title, description, and rationale fields.
 * Supports filtering by standard, security level, and component type.
 * Returns results with relevance scoring and snippet extraction.
 *
 * @param db - Database client instance
 * @param params - Search parameters including query string and optional filters
 * @returns Array of RequirementSearchResult objects with relevance scoring and snippets
 */
export async function searchRequirements(
  db: DatabaseClient,
  params: SearchRequirementsParams
): Promise<RequirementSearchResult[]> {
  const { query, options = {} } = params;

  // Return empty array for empty queries
  if (!query || query.trim() === '') {
    return [];
  }

  // Extract options with defaults
  const {
    standards = [],
    security_level,
    component_type,
    limit = 10 // Default limit as per design doc
  } = options;

  // Enforce max limit of 100
  const effectiveLimit = Math.min(limit || 10, 100);

  // Build the SQL query dynamically based on filters
  let sql = `
    SELECT DISTINCT r.*
    FROM ot_requirements r
  `;

  // Add LEFT JOIN for security_level filtering if needed
  if (security_level !== undefined) {
    sql += `
    LEFT JOIN security_levels sl ON r.id = sl.requirement_db_id
    `;
  }

  // Add WHERE clause for search
  sql += `
    WHERE (
      r.title LIKE ? COLLATE NOCASE OR
      r.description LIKE ? COLLATE NOCASE OR
      r.rationale LIKE ? COLLATE NOCASE
    )
  `;

  // Build parameters array
  const searchPattern = `%${query}%`;
  const queryParams: any[] = [searchPattern, searchPattern, searchPattern];

  // Add standards filter
  if (standards && standards.length > 0) {
    const placeholders = standards.map(() => '?').join(', ');
    sql += ` AND r.standard_id IN (${placeholders})`;
    queryParams.push(...standards);
  }

  // Add security_level filter
  if (security_level !== undefined) {
    sql += ` AND sl.security_level = ?`;
    queryParams.push(security_level);
  }

  // Add component_type filter
  if (component_type !== undefined) {
    sql += ` AND r.component_type = ?`;
    queryParams.push(component_type);
  }

  // Add ORDER BY clause for relevance scoring
  // Title matches get highest priority (1.0), then description (0.7), then rationale (0.5)
  sql += `
    ORDER BY
      CASE
        WHEN r.title LIKE ? COLLATE NOCASE THEN 1.0
        WHEN r.description LIKE ? COLLATE NOCASE THEN 0.7
        WHEN r.rationale LIKE ? COLLATE NOCASE THEN 0.5
        ELSE 0.3
      END DESC,
      r.id ASC
  `;
  queryParams.push(searchPattern, searchPattern, searchPattern);

  // Add limit
  sql += ` LIMIT ?`;
  queryParams.push(effectiveLimit);

  // Execute query
  try {
    const results = db.query<OTRequirement>(sql, queryParams);

    // Build standards map for quick lookup
    const standardsMap = new Map<string, string>();
    const standards_data = db.query<{ id: string; name: string }>(
      'SELECT id, name FROM ot_standards'
    );
    for (const std of standards_data) {
      standardsMap.set(std.id, std.name);
    }

    // Transform results to RequirementSearchResult with snippet, relevance, and standard_name
    const searchResults: RequirementSearchResult[] = results.map(req => {
      const snippet = extractSnippet(req, query);
      const relevance = calculateRelevance(req, query);
      const standard_name = standardsMap.get(req.standard_id) || req.standard_id;

      return {
        ...req,
        snippet,
        relevance,
        standard_name
      };
    });

    return searchResults;
  } catch (error) {
    // Log error and return empty array for graceful degradation
    console.error('Error searching requirements:', error);
    return [];
  }
}
