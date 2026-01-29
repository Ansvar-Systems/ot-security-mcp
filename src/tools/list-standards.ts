/**
 * List standards tool implementation for OT security standards
 */

import { DatabaseClient } from '../database/client.js';
import { OTStandard } from '../types/index.js';

/**
 * List all OT security standards in the database
 *
 * Returns all standards ordered alphabetically by name.
 * In Stage 1, this will return an empty array since the ot_standards
 * table is not yet populated. Standards will be added in Stages 2-4.
 *
 * @param db - Database client instance
 * @returns Array of OTStandard objects, ordered by name
 */
export async function listStandards(
  db: DatabaseClient
): Promise<OTStandard[]> {
  try {
    // Query all standards ordered by name
    const standards = db.query<OTStandard>(
      `SELECT * FROM ot_standards ORDER BY name ASC`
    );

    return standards;
  } catch (error) {
    // Log error and return empty array for graceful degradation
    console.error('Error listing standards:', error);
    return [];
  }
}
