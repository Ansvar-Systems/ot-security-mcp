/**
 * Get requirement rationale tool implementation
 * Returns detailed rationale for requirements including regulatory context
 */

import { DatabaseClient } from '../database/client.js';
import {
  OTRequirement,
  OTStandard,
  SecurityLevel,
  SectorApplicability,
  OTMapping
} from '../types/index.js';

/**
 * Parameters for get_requirement_rationale tool
 */
export interface GetRequirementRationaleParams {
  requirement_id: string;
  standard: string;
}

/**
 * Detailed rationale information for a requirement
 */
export interface RequirementRationale {
  /** The requirement */
  readonly requirement: OTRequirement;
  /** Standard metadata */
  readonly standard: OTStandard;
  /** Rationale text explaining why the requirement exists */
  readonly rationale: string | null;
  /** Security levels this requirement applies to (IEC 62443) */
  readonly security_levels: SecurityLevel[];
  /** Sector applicability and regulatory drivers */
  readonly regulatory_context: SectorApplicability[];
  /** Related requirements from other standards */
  readonly related_standards: Array<{
    standard: string;
    requirement_id: string;
    mapping_type: string;
    confidence: number | null;
  }>;
}

/**
 * Get detailed rationale for a specific requirement
 *
 * Returns comprehensive context about why a requirement exists, including:
 * - The rationale text explaining the requirement's purpose
 * - Security levels (for IEC 62443 requirements)
 * - Regulatory drivers and sector applicability
 * - Related requirements from other standards
 *
 * @param db - Database client instance
 * @param params - Parameters including requirement_id and standard
 * @returns RequirementRationale object with detailed context, or null if not found
 */
export async function getRequirementRationale(
  db: DatabaseClient,
  params: GetRequirementRationaleParams
): Promise<RequirementRationale | null> {
  const { requirement_id, standard } = params;

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
      return null;
    }

    // Step 3: Get security levels (for IEC 62443)
    const security_levels = db.query<SecurityLevel>(
      `SELECT * FROM security_levels WHERE requirement_db_id = ?
       ORDER BY security_level ASC`,
      [requirement.id]
    );

    // Step 4: Get regulatory context (sector applicability)
    const regulatory_context = db.query<SectorApplicability>(
      `SELECT * FROM sector_applicability
       WHERE standard = ?
       ORDER BY sector ASC, jurisdiction ASC`,
      [standard]
    );

    // Step 5: Get related standards via mappings
    const mappings = db.query<OTMapping>(
      `SELECT * FROM ot_mappings
       WHERE (source_standard = ? AND source_requirement = ?)
          OR (target_standard = ? AND target_requirement = ?)
       ORDER BY confidence DESC`,
      [standard, requirement_id, standard, requirement_id]
    );

    // Transform mappings into related_standards format
    const related_standards = mappings.map(mapping => {
      // Determine which side is the "other" standard
      const isSource = mapping.source_standard === standard &&
                       mapping.source_requirement === requirement_id;

      return {
        standard: isSource ? mapping.target_standard : mapping.source_standard,
        requirement_id: isSource ? mapping.target_requirement : mapping.source_requirement,
        mapping_type: mapping.mapping_type,
        confidence: mapping.confidence
      };
    });

    // Step 6: Construct and return RequirementRationale
    const result: RequirementRationale = {
      requirement,
      standard: standardData,
      rationale: requirement.rationale,
      security_levels,
      regulatory_context,
      related_standards
    };

    return result;
  } catch (error) {
    // Log error and return null for graceful degradation
    console.error('Error getting requirement rationale:', error);
    return null;
  }
}
