/**
 * Search tool implementation for OT security requirements
 */

import { DatabaseClient } from '../database/client.js';
import { OTRequirement, SearchOptions } from '../types/index.js';

/**
 * Search parameters interface
 */
export interface SearchRequirementsParams {
  query: string;
  options?: SearchOptions;
}

/**
 * Search for OT security requirements across all standards
 *
 * Performs full-text search across requirement title, description, and rationale fields.
 * Supports filtering by standard, security level, and component type.
 *
 * @param db - Database client instance
 * @param params - Search parameters including query string and optional filters
 * @returns Array of matching OTRequirement objects
 */
export async function searchRequirements(
  db: DatabaseClient,
  params: SearchRequirementsParams
): Promise<OTRequirement[]> {
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

  // Add limit
  sql += ` LIMIT ?`;
  queryParams.push(effectiveLimit);

  // Execute query
  try {
    const results = db.query<OTRequirement>(sql, queryParams);
    return results;
  } catch (error) {
    // Log error and return empty array for graceful degradation
    console.error('Error searching requirements:', error);
    return [];
  }
}
