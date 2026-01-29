/**
 * Map requirements to specific IEC 62443 security levels
 */

import { DatabaseClient } from '../database/client.js';

export interface MapSecurityLevelOptions {
  security_level: number;
  component_type?: string;
  include_enhancements?: boolean;
}

export interface SecurityLevel {
  security_level: number;
  sl_type: string;
  capability_level: number;
  notes?: string;
}

export interface Requirement {
  requirement_id: string;
  standard_id: string;
  title: string;
  description: string;
  rationale?: string;
  component_type?: string;
  parent_requirement_id?: string;
  security_levels: SecurityLevel[];
}

/**
 * Map requirements to a specific IEC 62443 security level
 * @param db - Database client instance
 * @param options - Query options including security level and filters
 * @returns Array of requirements that apply to the specified security level
 */
export async function mapSecurityLevelRequirements(
  db: DatabaseClient,
  options: MapSecurityLevelOptions
): Promise<Requirement[]> {
  const { security_level, component_type, include_enhancements = true } = options;

  // Validate security level
  if (security_level < 1 || security_level > 4) {
    throw new Error('Security level must be between 1 and 4');
  }

  // Build query with optional filters
  let query = `
    SELECT DISTINCT
      r.id,
      r.standard_id,
      r.requirement_id,
      r.parent_requirement_id,
      r.title,
      r.description,
      r.rationale,
      r.component_type
    FROM ot_requirements r
    INNER JOIN security_levels sl ON r.id = sl.requirement_db_id
    WHERE sl.security_level = ?
  `;

  const params: any[] = [security_level];

  // Filter by component type if specified
  if (component_type) {
    query += ` AND r.component_type = ?`;
    params.push(component_type);
  }

  // Exclude enhancements if requested
  if (!include_enhancements) {
    query += ` AND r.parent_requirement_id IS NULL`;
  }

  query += ` ORDER BY r.requirement_id`;

  const requirements = db.query<any>(query, params);

  // Fetch security levels for each requirement
  const result: Requirement[] = [];
  for (const req of requirements) {
    const levels = db.query<SecurityLevel>(
      `SELECT security_level, sl_type, capability_level, notes
       FROM security_levels
       WHERE requirement_db_id = ?
       ORDER BY security_level`,
      [req.id]
    );

    result.push({
      requirement_id: req.requirement_id,
      standard_id: req.standard_id,
      title: req.title,
      description: req.description,
      rationale: req.rationale,
      component_type: req.component_type,
      parent_requirement_id: req.parent_requirement_id,
      security_levels: levels
    });
  }

  return result;
}
