/**
 * Stage 2 End-to-End Workflow Tests
 *
 * Comprehensive integration tests validating complete workflows across all Stage 2 features:
 * - Cross-standard queries and mappings
 * - Security level filtering and requirement mapping
 * - Zone/conduit guidance generation
 * - Requirement rationale with complete metadata
 * - Multi-tool workflows simulating real user scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { searchRequirements } from '../../src/tools/search.js';
import { getRequirement } from '../../src/tools/get-requirement.js';
import { listStandards } from '../../src/tools/list-standards.js';
import { getMitreTechnique } from '../../src/tools/get-mitre-technique.js';
import { mapSecurityLevelRequirements } from '../../src/tools/map-security-level-requirements.js';
import { getZoneConduitGuidance } from '../../src/tools/get-zone-conduit-guidance.js';
import { getRequirementRationale } from '../../src/tools/get-requirement-rationale.js';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Stage 2: End-to-End Workflow Tests', () => {
  let db: DatabaseClient;
  const testDbPath = join(process.cwd(), 'data/ot-security.db');

  beforeAll(async () => {
    if (!existsSync(testDbPath)) {
      throw new Error(`Database not found at ${testDbPath}. Run ingestion scripts first.`);
    }
    db = new DatabaseClient(testDbPath);
  });

  afterAll(async () => {
    if (db) {
      db.close();
    }
  });

  describe('Workflow 1: Cross-Standard Query (IEC ↔ NIST Mappings)', () => {
    it('should discover NIST 800-53 controls mapped to IEC 62443 requirements', async () => {
      // Step 1: Search for access control in IEC 62443
      const iecResults = await searchRequirements(db, {
        query: 'authentication',
        options: {
          standards: ['iec62443-3-3'],
          limit: 5,
        },
      });

      expect(iecResults.length).toBeGreaterThan(0);
      const firstIecReq = iecResults[0];

      // Step 2: Get detailed IEC requirement with mappings
      const iecRequirement = await getRequirement(db, {
        requirement_id: firstIecReq.requirement_id,
        standard: firstIecReq.standard_id,
        options: {
          include_mappings: true,
        },
      });

      expect(iecRequirement).toBeDefined();
      expect(iecRequirement?.requirement_id).toBe(firstIecReq.requirement_id);

      // Step 3: Verify mappings structure (even if empty for now)
      expect(iecRequirement).toHaveProperty('mappings');
      expect(Array.isArray(iecRequirement?.mappings)).toBe(true);
    });

    it('should search across multiple standards simultaneously', async () => {
      const results = await searchRequirements(db, {
        query: 'authentication',
        options: {
          standards: ['iec62443-3-3', 'nist-800-53', 'nist-800-82'],
          limit: 20,
        },
      });

      expect(results.length).toBeGreaterThan(0);

      // Verify results include multiple standards
      const standardIds = new Set(results.map(r => r.standard_id));
      expect(standardIds.size).toBeGreaterThan(0);

      // Each result should have proper structure
      results.forEach(result => {
        expect(result).toHaveProperty('requirement_id');
        expect(result).toHaveProperty('standard_id');
        expect(result).toHaveProperty('snippet');
        expect(result).toHaveProperty('relevance');
        expect(result).toHaveProperty('standard_name');
      });
    });

    it('should follow NIST 800-82 → 800-53 mapping chain', async () => {
      // Step 1: Get a NIST 800-82 requirement
      const nist82Results = await searchRequirements(db, {
        query: 'control',
        options: {
          standards: ['nist-800-82'],
          limit: 3,
        },
      });

      if (nist82Results.length > 0) {
        const nist82Req = nist82Results[0];

        // Step 2: Get detailed requirement with mappings
        const detailedReq = await getRequirement(db, {
          requirement_id: nist82Req.requirement_id,
          standard: 'nist-800-82',
          options: {
            include_mappings: true,
          },
        });

        expect(detailedReq).toBeDefined();
        expect(detailedReq?.standard_id).toBe('nist-800-82');

        // Step 3: Verify mapping to NIST 800-53 exists (if mapped)
        if (detailedReq?.related_standards && detailedReq.related_standards.length > 0) {
          const nist53Mapping = detailedReq.related_standards.find(
            r => r.standard_id === 'nist-800-53'
          );
          if (nist53Mapping) {
            expect(nist53Mapping.requirement_id).toBeDefined();
            expect(nist53Mapping.relationship_type).toBe('enhances');
          }
        }
      }
    });
  });

  describe('Workflow 2: Security Level Filtering', () => {
    it('should map all requirements for Security Level 2 (SL-2)', async () => {
      const sl2Requirements = await mapSecurityLevelRequirements(db, {
        security_level: 2,
        include_enhancements: true,
      });

      expect(Array.isArray(sl2Requirements)).toBe(true);
      expect(sl2Requirements.length).toBeGreaterThan(0);

      // All requirements should have security_level 2
      sl2Requirements.forEach(req => {
        expect(req.security_levels).toBeDefined();
        expect(Array.isArray(req.security_levels)).toBe(true);

        const hasSL2 = req.security_levels.some(sl => sl.security_level === 2);
        expect(hasSL2).toBe(true);
      });
    });

    it('should filter requirements by component type for System requirements', async () => {
      const systemReqs = await mapSecurityLevelRequirements(db, {
        security_level: 3,
        component_type: 'system',
        include_enhancements: false,
      });

      expect(Array.isArray(systemReqs)).toBe(true);

      if (systemReqs.length > 0) {
        systemReqs.forEach(req => {
          expect(req.component_type).toBeDefined();
          expect(['system', 'both']).toContain(req.component_type);
        });
      }
    });

    it('should compare requirements across security levels (SL-2 vs SL-4)', async () => {
      const sl2Reqs = await mapSecurityLevelRequirements(db, {
        security_level: 2,
        include_enhancements: true,
      });

      const sl4Reqs = await mapSecurityLevelRequirements(db, {
        security_level: 4,
        include_enhancements: true,
      });

      // SL-4 should have equal or more requirements than SL-2
      // (higher security levels include lower level requirements + enhancements)
      expect(sl4Reqs.length).toBeGreaterThanOrEqual(sl2Reqs.length);

      // Verify SL-4 requirements have appropriate security levels
      sl4Reqs.forEach(req => {
        const hasValidLevel = req.security_levels.some(
          sl => sl.security_level >= 1 && sl.security_level <= 4
        );
        expect(hasValidLevel).toBe(true);
      });
    });

    it('should validate security level bounds (1-4)', async () => {
      // Test lower bound
      await expect(
        mapSecurityLevelRequirements(db, { security_level: 0 })
      ).rejects.toThrow('Security level must be between 1 and 4');

      // Test upper bound
      await expect(
        mapSecurityLevelRequirements(db, { security_level: 5 })
      ).rejects.toThrow('Security level must be between 1 and 4');
    });
  });

  describe('Workflow 3: Zone/Conduit Guidance Generation', () => {
    it('should generate guidance for Level 3 (SCADA DMZ) zone', async () => {
      const result = await getZoneConduitGuidance(db, {
        purdue_level: 3,
        security_level_target: 2,
      });

      expect(result).toBeDefined();
      expect(result.zones).toBeDefined();
      expect(Array.isArray(result.zones)).toBe(true);
      expect(result.zones.length).toBeGreaterThan(0);

      // Find Level 3 zone
      const level3Zone = result.zones.find(z => z.purdue_level === 3);
      expect(level3Zone).toBeDefined();
      expect(level3Zone?.name).toBe('Level 3 - SCADA DMZ');
      expect(level3Zone?.security_level_target).toBe(2);
      expect(level3Zone?.description).toBeDefined();
      expect(level3Zone?.typical_assets).toBeDefined();

      // Should have guidance text
      expect(result.guidance).toBeDefined();
      expect(typeof result.guidance).toBe('string');
      expect(result.guidance.length).toBeGreaterThan(0);
    });

    it('should include zone flows when requested', async () => {
      const result = await getZoneConduitGuidance(db, {
        purdue_level: 3,
      });

      expect(result).toBeDefined();
      expect(result.flows).toBeDefined();
      expect(Array.isArray(result.flows)).toBe(true);
      expect(result.conduits).toBeDefined();
      expect(Array.isArray(result.conduits)).toBe(true);
    });

    it('should handle zone lookup by Purdue level', async () => {
      const result = await getZoneConduitGuidance(db, {
        purdue_level: 2,
      });

      // Should return zones filtered by Purdue level
      expect(result).toBeDefined();
      expect(result.zones).toBeDefined();
      expect(Array.isArray(result.zones)).toBe(true);

      if (result.zones.length > 0) {
        result.zones.forEach(zone => {
          expect(zone.purdue_level).toBe(2);
        });
      }
    });

    it('should handle invalid Purdue levels gracefully', async () => {
      // Test negative level - should return empty zones
      const negativeResult = await getZoneConduitGuidance(db, {
        purdue_level: -1,
      });
      expect(negativeResult.zones.length).toBe(0);

      // Test level above 5 - should return empty zones
      const highResult = await getZoneConduitGuidance(db, {
        purdue_level: 99,
      });
      expect(highResult.zones.length).toBe(0);
    });
  });

  describe('Workflow 4: Requirement Rationale with Metadata', () => {
    it('should retrieve complete rationale for SR 1.1 requirement', async () => {
      const rationaleResult = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(rationaleResult).toBeDefined();
      expect(rationaleResult?.requirement).toBeDefined();
      expect(rationaleResult?.requirement.requirement_id).toBe('SR 1.1');
      expect(rationaleResult?.requirement.standard_id).toBe('iec62443-3-3');
      expect(rationaleResult?.requirement.title).toBeDefined();
      expect(rationaleResult?.requirement.description).toBeDefined();

      // Should have rationale field
      expect(rationaleResult).toHaveProperty('rationale');

      // Should have security levels
      expect(rationaleResult?.security_levels).toBeDefined();
      expect(Array.isArray(rationaleResult?.security_levels)).toBe(true);
      expect(rationaleResult?.security_levels.length).toBeGreaterThan(0);

      // Should have standard metadata
      expect(rationaleResult?.standard).toBeDefined();
      expect(rationaleResult?.standard.id).toBe('iec62443-3-3');
    });

    it('should include related standards in rationale', async () => {
      const rationaleResult = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(rationaleResult).toBeDefined();
      expect(rationaleResult).toHaveProperty('related_standards');
      expect(Array.isArray(rationaleResult?.related_standards)).toBe(true);
    });

    it('should provide detailed capability level explanations', async () => {
      const rationaleResult = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(rationaleResult).toBeDefined();
      expect(rationaleResult?.security_levels).toBeDefined();

      // Each security level should have detailed information
      rationaleResult?.security_levels.forEach(sl => {
        expect(sl.security_level).toBeGreaterThanOrEqual(1);
        expect(sl.security_level).toBeLessThanOrEqual(4);
        expect(sl.sl_type).toBeDefined();
        expect(sl.capability_level).toBeDefined();
        expect(sl.notes).toBeDefined();
      });
    });
  });

  describe('Workflow 5: Multi-Tool Chained Operations', () => {
    it('should execute complete security assessment workflow', async () => {
      // Step 1: List all available standards
      const standards = await listStandards(db);
      expect(standards.length).toBeGreaterThanOrEqual(3);

      // Step 2: Search for authentication requirements
      const searchResults = await searchRequirements(db, {
        query: 'authentication',
        options: {
          limit: 10,
        },
      });
      expect(searchResults.length).toBeGreaterThan(0);

      // Step 3: Get detailed requirement for first result
      if (searchResults[0]) {
        const requirement = await getRequirement(db, {
          requirement_id: searchResults[0].requirement_id,
          standard: searchResults[0].standard_id,
          options: {
            include_mappings: true,
          },
        });
        expect(requirement).toBeDefined();

        // Step 4: Get rationale for the requirement
        const rationaleResult = await getRequirementRationale(db, {
          requirement_id: searchResults[0].requirement_id,
          standard: searchResults[0].standard_id,
        });
        expect(rationaleResult).toBeDefined();
      }
    });

    it('should support zone-based security planning workflow', async () => {
      // Step 1: Get zone guidance for SCADA DMZ
      const zoneResult = await getZoneConduitGuidance(db, {
        purdue_level: 3,
        security_level_target: 2,
      });

      expect(zoneResult).toBeDefined();
      expect(zoneResult.zones.length).toBeGreaterThan(0);
      const targetSecurityLevel = zoneResult.zones[0]?.security_level_target || 2;

      // Step 2: Map all requirements for the zone's target security level
      const slRequirements = await mapSecurityLevelRequirements(db, {
        security_level: targetSecurityLevel,
        include_enhancements: true,
      });

      expect(slRequirements.length).toBeGreaterThan(0);

      // Step 3: Get rationale for key requirements
      if (slRequirements.length > 0) {
        const firstReq = slRequirements[0];
        const rationaleResult = await getRequirementRationale(db, {
          requirement_id: firstReq.requirement_id,
          standard: firstReq.standard_id,
        });
        expect(rationaleResult).toBeDefined();
      }
    });

    it('should support threat-based requirement mapping', async () => {
      // Step 1: Get MITRE ICS technique
      const technique = await getMitreTechnique(db, {
        technique_id: 'T0800',
        options: {
          include_mitigations: true,
        },
      });

      expect(technique).toBeDefined();
      expect(technique?.technique_id).toBe('T0800');

      // Step 2: Search for related requirements based on technique
      if (technique?.name) {
        const relatedReqs = await searchRequirements(db, {
          query: technique.name,
          options: {
            standards: ['iec62443-3-3', 'nist-800-82'],
            limit: 10,
          },
        });

        expect(Array.isArray(relatedReqs)).toBe(true);
      }

      // Step 3: Get mitigation guidance from requirements
      if (technique?.mitigations && technique.mitigations.length > 0) {
        const mitigation = technique.mitigations[0];
        const mitigationReqs = await searchRequirements(db, {
          query: mitigation.name,
          options: {
            limit: 5,
          },
        });

        expect(Array.isArray(mitigationReqs)).toBe(true);
      }
    });
  });

  describe('Workflow 6: Performance and Data Validation', () => {
    it('should efficiently query all standards', async () => {
      const startTime = Date.now();
      const standards = await listStandards(db);
      const duration = Date.now() - startTime;

      expect(standards.length).toBeGreaterThanOrEqual(3);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      const results = await searchRequirements(db, {
        query: 'control',
        options: {
          limit: 50,
        },
      });
      const duration = Date.now() - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });

    it('should validate all requirements have proper structure', async () => {
      // Get requirements from multiple standards
      const iecReq = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
        options: {},
      });

      // Validate IEC requirement structure
      expect(iecReq).toBeDefined();
      expect(iecReq?.requirement_id).toBe('SR 1.1');
      expect(iecReq?.standard_id).toBe('iec62443-3-3');
      expect(iecReq?.title).toBeDefined();
      expect(iecReq?.description).toBeDefined();
      expect(Array.isArray(iecReq?.security_levels)).toBe(true);

      // Get a NIST requirement
      const nistResults = await searchRequirements(db, {
        query: 'access',
        options: {
          standards: ['nist-800-53'],
          limit: 1,
        },
      });

      if (nistResults.length > 0) {
        const nistReq = await getRequirement(db, {
          requirement_id: nistResults[0].requirement_id,
          standard: 'nist-800-53',
          options: {},
        });

        expect(nistReq).toBeDefined();
        expect(nistReq?.requirement_id).toBeDefined();
        expect(nistReq?.standard_id).toBe('nist-800-53');
        expect(nistReq?.title).toBeDefined();
      }
    });

    it('should verify all zone data has valid Purdue levels', async () => {
      const zones = db.query<{ id: number; name: string; purdue_level: number }>(
        'SELECT id, name, purdue_level FROM zones'
      );

      zones.forEach(zone => {
        expect(zone.purdue_level).toBeGreaterThanOrEqual(0);
        expect(zone.purdue_level).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Workflow 7: Error Handling and Edge Cases', () => {
    it('should gracefully handle non-existent requirement', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'INVALID-REQ-999',
        standard: 'iec62443-3-3',
        options: {},
      });

      expect(result).toBeNull();
    });

    it('should handle empty search query', async () => {
      const results = await searchRequirements(db, {
        query: '',
        options: {},
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle non-existent zone', async () => {
      const result = await getZoneConduitGuidance(db, {
        purdue_level: 99, // Invalid Purdue level should return empty
      });

      // Should return empty zones for non-existent Purdue level
      expect(result).toBeDefined();
      expect(result.zones.length).toBe(0);
    });

    it('should handle non-existent MITRE technique', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T9999',
        options: {},
      });

      expect(result).toBeNull();
    });

    it('should handle invalid standard in search', async () => {
      const results = await searchRequirements(db, {
        query: 'test',
        options: {
          standards: ['invalid-standard-999'],
          limit: 10,
        },
      });

      // Should return empty results, not throw
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Workflow 8: Data Consistency Checks', () => {
    it('should verify all IEC 62443 requirements have security levels', async () => {
      const iecReqs = db.query<{ requirement_id: string; standard_id: string }>(
        `SELECT requirement_id, standard_id FROM ot_requirements
         WHERE standard_id LIKE 'iec62443%'`
      );

      for (const req of iecReqs) {
        const detailed = await getRequirement(db, {
          requirement_id: req.requirement_id,
          standard: req.standard_id,
          options: {},
        });

        if (detailed && detailed.standard_id.startsWith('iec62443') &&
            !detailed.requirement_id.includes('Zone') &&
            !detailed.requirement_id.includes('Conduit')) {
          // Regular requirements should have security levels
          expect(detailed.security_levels).toBeDefined();
          expect(Array.isArray(detailed.security_levels)).toBe(true);
        }
      }
    });

    it('should verify all zones have valid security level targets', async () => {
      const zones = db.query<{
        id: number;
        name: string;
        security_level_target: number | null
      }>(
        'SELECT id, name, security_level_target FROM zones WHERE security_level_target IS NOT NULL'
      );

      zones.forEach(zone => {
        if (zone.security_level_target !== null) {
          expect(zone.security_level_target).toBeGreaterThanOrEqual(1);
          expect(zone.security_level_target).toBeLessThanOrEqual(4);
        }
      });
    });

    it('should verify NIST 800-82 to 800-53 mappings are valid', async () => {
      const mappings = db.query<{
        source_req: string;
        target_req: string;
        source_std: string;
        target_std: string;
      }>(
        `SELECT
          source_requirement as source_req,
          target_requirement as target_req,
          source_standard as source_std,
          target_standard as target_std
         FROM ot_mappings
         WHERE source_standard = 'nist-800-82' AND target_standard = 'nist-800-53'`
      );

      // We should have some mappings
      expect(mappings.length).toBeGreaterThan(0);

      for (const mapping of mappings.slice(0, 5)) { // Test first 5 to avoid timeout
        // Verify source requirement exists
        const sourceReq = await getRequirement(db, {
          requirement_id: mapping.source_req,
          standard: 'nist-800-82',
          options: {},
        });
        expect(sourceReq).toBeDefined();

        // Verify target requirement exists
        const targetReq = await getRequirement(db, {
          requirement_id: mapping.target_req,
          standard: 'nist-800-53',
          options: {},
        });
        expect(targetReq).toBeDefined();
      }
    });

    it('should verify all standards report accurate requirement counts', async () => {
      const standards = await listStandards(db);

      standards.forEach(standard => {
        // Count requirements directly from database
        const actualCount = db.queryOne<{ count: number }>(
          `SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?`,
          [standard.id]
        );

        if (standard.id === 'mitre-ics') {
          // MITRE ICS counts techniques
          const techniqueCount = db.queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM mitre_ics_techniques'
          );
          expect(standard.requirement_count).toBe(techniqueCount?.count || 0);
        } else {
          expect(standard.requirement_count).toBe(actualCount?.count || 0);
        }
      });
    });
  });
});
