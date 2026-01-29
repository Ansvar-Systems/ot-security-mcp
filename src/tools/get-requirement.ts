/**
 * Get requirement tool implementation for OT security requirements
 */

import { DatabaseClient } from '../database/client.js';
import {
  RequirementDetail,
  GetRequirementOptions,
  OTRequirement,
  OTStandard,
  OTMapping,
  SecurityLevel
} from '../types/index.js';

/**
 * Get requirement parameters interface
 */
export interface GetRequirementParams {
  requirement_id: string;
  standard: string;
  options?: GetRequirementOptions;
}

/**
 * Retrieve detailed information about a specific OT security requirement
 *
 * Fetches a requirement by ID and standard, including standard metadata,
 * security level mappings, and cross-standard mappings. Supports filtering
 * by version and optional inclusion/exclusion of mappings.
 *
 * @param db - Database client instance
 * @param params - Parameters including requirement_id, standard, and optional filters
 * @returns RequirementDetail object with all related data, or null if not found
 */
export async function getRequirement(
  db: DatabaseClient,
  params: GetRequirementParams
): Promise<RequirementDetail | null> {
  const { requirement_id, standard, options = {} } = params;

  // Extract options with defaults
  const {
    include_mappings = true
    // TODO: Stage 1 - version parameter will be implemented when multi-version support is added
    // version
  } = options;

  // Validate required parameters
  if (!requirement_id || requirement_id.trim() === '') {
    return null;
  }

  if (!standard || standard.trim() === '') {
    return null;
  }

  try {
    // Step 1: Get the requirement
    const requirement = db.queryOne<OTRequirement>(
      `SELECT * FROM ot_requirements
       WHERE requirement_id = ? AND standard_id = ?
       LIMIT 1`,
      [requirement_id, standard]
    );

    if (!requirement) {
      return null;
    }

    // Step 2: Get the standard metadata
    const standardData = db.queryOne<OTStandard>(
      `SELECT * FROM ot_standards WHERE id = ?`,
      [standard]
    );

    if (!standardData) {
      // This shouldn't happen if FK constraints are working, but handle gracefully
      return null;
    }

    // Step 3: Get security levels
    const security_levels = db.query<SecurityLevel>(
      `SELECT * FROM security_levels WHERE requirement_db_id = ?`,
      [requirement.id]
    );

    // Step 4: Get mappings (if requested)
    let mappings: OTMapping[] = [];
    if (include_mappings) {
      // Get bidirectional mappings: where this requirement is source OR target
      mappings = db.query<OTMapping>(
        `SELECT * FROM ot_mappings
         WHERE (source_standard = ? AND source_requirement = ?)
            OR (target_standard = ? AND target_requirement = ?)`,
        [standard, requirement_id, standard, requirement_id]
      );
    }

    // Step 5: Construct and return RequirementDetail
    const result: RequirementDetail = {
      ...requirement,
      standard: standardData,
      mappings,
      security_levels
    };

    return result;
  } catch (error) {
    // Log error and return null for graceful degradation
    console.error('Error getting requirement:', error);
    return null;
  }
}
