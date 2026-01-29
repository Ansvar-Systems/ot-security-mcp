/**
 * List standards tool implementation for OT security standards
 */

import { DatabaseClient } from '../database/client.js';
import { OTStandard } from '../types/index.js';

/**
 * Standard with requirement count
 */
export interface OTStandardWithCount extends OTStandard {
  /** Number of requirements/controls for this standard */
  readonly requirement_count: number;
}

/**
 * List all OT security standards in the database
 *
 * Returns all standards ordered alphabetically by name with requirement counts.
 * For MITRE ICS, the count includes techniques from mitre_ics_techniques table.
 *
 * @param db - Database client instance
 * @returns Array of OTStandardWithCount objects, ordered by name
 */
export async function listStandards(
  db: DatabaseClient
): Promise<OTStandardWithCount[]> {
  try {
    // Query all standards with requirement counts
    // For MITRE ICS, count from mitre_ics_techniques; for others, from ot_requirements
    const standards = db.query<OTStandardWithCount>(
      `SELECT
        s.*,
        CASE
          WHEN s.id = 'mitre-ics' THEN (SELECT COUNT(*) FROM mitre_ics_techniques)
          ELSE (SELECT COUNT(*) FROM ot_requirements WHERE standard_id = s.id)
        END as requirement_count
      FROM ot_standards s
      ORDER BY s.name ASC`
    );

    return standards;
  } catch (error) {
    // Log error and return empty array for graceful degradation
    console.error('Error listing standards:', error);
    return [];
  }
}
