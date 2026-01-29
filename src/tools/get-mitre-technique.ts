/**
 * Get MITRE technique tool implementation for MITRE ATT&CK for ICS techniques
 */

import { DatabaseClient } from '../database/client.js';
import {
  MitreTechnique,
  MitreTechniqueDetail,
  MitreTechniqueOptions,
  MitreMitigation,
  OTRequirement,
} from '../types/index.js';

/**
 * Get MITRE technique parameters interface
 */
export interface GetMitreTechniqueParams {
  technique_id: string;
  options?: MitreTechniqueOptions;
}

/**
 * Retrieve detailed information about a MITRE ATT&CK for ICS technique
 *
 * Fetches a technique by ID, including optional mitigations and mappings
 * to OT security requirements. Parses JSON fields (platforms, data_sources)
 * from the database.
 *
 * @param db - Database client instance
 * @param params - Parameters including technique_id and optional filters
 * @returns MitreTechniqueDetail object with all related data, or null if not found
 */
export async function getMitreTechnique(
  db: DatabaseClient,
  params: GetMitreTechniqueParams
): Promise<MitreTechniqueDetail | null> {
  const { technique_id, options = {} } = params;

  // Extract options with defaults
  const { include_mitigations = true, map_to_standards = [] } = options;

  // Validate required parameters
  if (!technique_id || technique_id.trim() === '') {
    return null;
  }

  try {
    // Step 1: Get the technique
    const rawTechnique = db.queryOne<{
      technique_id: string;
      tactic: string | null;
      name: string | null;
      description: string | null;
      platforms: string | null;
      data_sources: string | null;
    }>(
      `SELECT * FROM mitre_ics_techniques
       WHERE technique_id = ?
       LIMIT 1`,
      [technique_id]
    );

    if (!rawTechnique) {
      return null;
    }

    // Parse JSON fields
    let platforms: string[] | null = null;
    let data_sources: string[] | null = null;

    try {
      if (rawTechnique.platforms) {
        platforms = JSON.parse(rawTechnique.platforms);
      }
    } catch (error) {
      console.error('Error parsing platforms JSON:', error);
      platforms = null;
    }

    try {
      if (rawTechnique.data_sources) {
        data_sources = JSON.parse(rawTechnique.data_sources);
      }
    } catch (error) {
      console.error('Error parsing data_sources JSON:', error);
      data_sources = null;
    }

    // Construct the technique object
    const technique: MitreTechnique = {
      technique_id: rawTechnique.technique_id,
      tactic: rawTechnique.tactic,
      name: rawTechnique.name,
      description: rawTechnique.description,
      platforms,
      data_sources,
    };

    // Step 2: Get mitigations (if requested)
    let mitigations: MitreMitigation[] = [];
    if (include_mitigations) {
      mitigations = db.query<MitreMitigation>(
        `SELECT m.*
         FROM mitre_ics_mitigations m
         INNER JOIN mitre_technique_mitigations mtm ON m.mitigation_id = mtm.mitigation_id
         WHERE mtm.technique_id = ?`,
        [technique_id]
      );
    }

    // Step 3: Map to OT requirements (if standards provided)
    let mapped_requirements: OTRequirement[] = [];
    if (map_to_standards && map_to_standards.length > 0) {
      // Build placeholders for IN clause
      const placeholders = map_to_standards.map(() => '?').join(', ');

      mapped_requirements = db.query<OTRequirement>(
        `SELECT DISTINCT r.*
         FROM ot_requirements r
         INNER JOIN mitre_technique_mitigations mtm ON r.requirement_id = mtm.ot_requirement_id
         WHERE mtm.technique_id = ?
           AND r.standard_id IN (${placeholders})`,
        [technique_id, ...map_to_standards]
      );
    }

    // Step 4: Construct and return MitreTechniqueDetail
    const result: MitreTechniqueDetail = {
      ...technique,
      mitigations,
      mapped_requirements,
    };

    return result;
  } catch (error) {
    // Log error and return null for graceful degradation
    console.error('Error getting MITRE technique:', error);
    return null;
  }
}
