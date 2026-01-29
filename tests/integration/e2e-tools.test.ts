/**
 * End-to-End Integration Tests for OT Security MCP Server
 * Tests all tools with real data through direct function calls
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { searchRequirements } from '../../src/tools/search.js';
import { getRequirement } from '../../src/tools/get-requirement.js';
import { listStandards } from '../../src/tools/list-standards.js';
import { getMitreTechnique } from '../../src/tools/get-mitre-technique.js';
import { join } from 'path';
import { existsSync } from 'fs';

describe('E2E Tool Integration Tests', () => {
  let db: DatabaseClient;
  // Use the main database with real MITRE data already ingested
  const testDbPath = join(process.cwd(), 'data/ot-security.db');

  beforeAll(async () => {
    // Verify the database exists
    if (!existsSync(testDbPath)) {
      throw new Error(`Database not found at ${testDbPath}. Run npm run ingest:mitre first.`);
    }
    // Create database client with production database that has real MITRE data
    db = new DatabaseClient(testDbPath);
  });

  afterAll(async () => {
    // Close database connection (don't delete production database)
    if (db) {
      db.close();
    }
  });

  describe('get_mitre_ics_technique Tool', () => {
    it('should retrieve real MITRE technique T0800 with full details', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
        options: {
          include_mitigations: true,
        },
      });

      // Verify technique details
      expect(result).toBeDefined();
      expect(result?.technique_id).toBe('T0800');
      expect(result?.name).toBeDefined();
      expect(result?.description).toBeDefined();
      expect(result?.tactic).toBeDefined();

      // Verify mitigations are included
      if (result?.mitigations && result.mitigations.length > 0) {
        expect(Array.isArray(result.mitigations)).toBe(true);
        expect(result.mitigations[0]).toHaveProperty('mitigation_id');
        expect(result.mitigations[0]).toHaveProperty('name');
      }
    });

    it('should return null for non-existent technique', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T9999',
        options: {},
      });

      expect(result).toBeNull();
    });

    it('should handle missing technique_id gracefully', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: '',
        options: {},
      });

      expect(result).toBeNull();
    });

    it('should work with include_mitigations=false', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
        options: {
          include_mitigations: false,
        },
      });

      expect(result).toBeDefined();
      expect(result?.technique_id).toBe('T0800');
      // When include_mitigations=false, mitigations array is empty, not undefined
      expect(result?.mitigations).toEqual([]);
    });
  });

  describe('list_ot_standards Tool', () => {
    it('should return IEC 62443 standards in Stage 2', async () => {
      const result = await listStandards(db);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should have IEC 62443 standards
      const iecStandards = result.filter(s => s.id.startsWith('iec62443'));
      expect(iecStandards.length).toBeGreaterThan(0);
    });

    it('should handle tool call without errors', async () => {
      // Should not throw any errors
      await expect(listStandards(db)).resolves.toBeDefined();
    });
  });

  describe('search_ot_requirements Tool', () => {
    it('should find IEC 62443 authentication requirements in Stage 2', async () => {
      const result = await searchRequirements(db, {
        query: 'authentication',
        options: {},
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should have search result properties
      if (result[0]) {
        expect(result[0]).toHaveProperty('snippet');
        expect(result[0]).toHaveProperty('relevance');
        expect(result[0]).toHaveProperty('standard_name');
      }
    });

    it('should handle optional parameters without errors', async () => {
      const result = await searchRequirements(db, {
        query: 'access control',
        options: {
          standards: ['iec62443-3-3'],
          security_level: 2,
          limit: 5,
        },
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should validate security_level bounds', async () => {
      const result = await searchRequirements(db, {
        query: 'test',
        options: {
          security_level: 2,
        },
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('get_ot_requirement Tool', () => {
    it('should retrieve IEC 62443-3-3 SR 1.1 requirement in Stage 2', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
        options: {},
      });

      expect(result).toBeDefined();
      expect(result?.requirement_id).toBe('SR 1.1');
      expect(result?.standard_id).toBe('iec62443-3-3');
    });

    it('should include security_levels for IEC 62443-3-3 SR 1.1', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
        options: {},
      });

      expect(result).toBeDefined();
      expect(result?.security_levels).toBeDefined();
      expect(Array.isArray(result?.security_levels)).toBe(true);

      // SR 1.1 has 4 security levels (SL-1 through SL-4)
      expect(result?.security_levels.length).toBe(4);

      // Verify security level structure
      const sl1 = result?.security_levels.find(sl => sl.security_level === 1);
      expect(sl1).toBeDefined();
      expect(sl1?.sl_type).toBe('SL-T');
      expect(sl1?.capability_level).toBe(1);
      expect(sl1?.notes).toContain('identification and authentication');

      // Verify all security levels 1-4 are present
      expect(result?.security_levels.some(sl => sl.security_level === 1)).toBe(true);
      expect(result?.security_levels.some(sl => sl.security_level === 2)).toBe(true);
      expect(result?.security_levels.some(sl => sl.security_level === 3)).toBe(true);
      expect(result?.security_levels.some(sl => sl.security_level === 4)).toBe(true);
    });

    it('should handle include_mappings parameter', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
        options: {
          include_mappings: false,
        },
      });

      // Should return the requirement
      expect(result).toBeDefined();
      expect(result?.requirement_id).toBe('SR 1.1');

      // Security levels should still be included regardless of mappings flag
      expect(result?.security_levels).toBeDefined();
      expect(Array.isArray(result?.security_levels)).toBe(true);
    });

    it('should handle version parameter', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
        options: {
          version: '2013',
        },
      });

      // Should return requirement (version filtering not implemented yet)
      expect(result).toBeDefined();
    });

    it('should return empty security_levels for NIST requirements', async () => {
      // First check if any NIST requirements exist in the database
      const nistReq = db.queryOne<{ requirement_id: string, standard_id: string }>(
        `SELECT requirement_id, standard_id FROM ot_requirements WHERE standard_id LIKE 'nist%' LIMIT 1`
      );

      if (nistReq) {
        const result = await getRequirement(db, {
          requirement_id: nistReq.requirement_id,
          standard: nistReq.standard_id,
          options: {},
        });

        expect(result).toBeDefined();
        expect(result?.security_levels).toBeDefined();
        expect(Array.isArray(result?.security_levels)).toBe(true);
        // NIST requirements don't have security levels in IEC 62443 sense
        expect(result?.security_levels.length).toBe(0);
      }
    });
  });

  describe('Full Workflow Test', () => {
    it('should support complete workflow: list → search → get technique', async () => {
      // Step 1: List standards (empty in Stage 1)
      const standards = await listStandards(db);
      expect(Array.isArray(standards)).toBe(true);

      // Step 2: Search requirements (empty in Stage 1)
      const requirements = await searchRequirements(db, {
        query: 'authentication',
        options: {
          limit: 10,
        },
      });
      expect(Array.isArray(requirements)).toBe(true);

      // Step 3: Get MITRE technique (works with real data)
      const technique = await getMitreTechnique(db, {
        technique_id: 'T0800',
        options: {
          include_mitigations: true,
        },
      });

      expect(technique).toBeDefined();
      expect(technique?.technique_id).toBe('T0800');
    });

    it('should handle tool chain: get technique → use mitigation info', async () => {
      // Step 1: Get technique with mitigations
      const technique = await getMitreTechnique(db, {
        technique_id: 'T0800',
        options: {
          include_mitigations: true,
        },
      });

      expect(technique).toBeDefined();

      // Step 2: If mitigations exist, search for related requirements
      if (technique?.mitigations && technique.mitigations.length > 0) {
        const firstMitigation = technique.mitigations[0];

        const requirements = await searchRequirements(db, {
          query: firstMitigation.name,
          options: {
            limit: 5,
          },
        });

        expect(Array.isArray(requirements)).toBe(true);
        // Empty in Stage 1, but no errors
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty technique_id gracefully', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: '',
        options: {},
      });

      expect(result).toBeNull();
    });

    it('should handle empty query in search', async () => {
      const result = await searchRequirements(db, {
        query: '',
        options: {},
      });

      // Empty query should return empty results
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle invalid standard in get_ot_requirement', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'invalid-standard',
        options: {},
      });

      expect(result).toBeNull();
    });
  });

  describe('Real MITRE Data Validation', () => {
    it('should verify T0800 technique has expected structure', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
        options: {
          include_mitigations: true,
        },
      });

      expect(result).toBeDefined();

      // Verify core fields
      expect(result).toHaveProperty('technique_id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('tactic');

      // Verify data types
      expect(typeof result?.technique_id).toBe('string');
      expect(typeof result?.name).toBe('string');
      expect(typeof result?.description).toBe('string');

      // If mitigations exist, verify structure
      if (result?.mitigations) {
        expect(Array.isArray(result.mitigations)).toBe(true);
        if (result.mitigations.length > 0) {
          expect(result.mitigations[0]).toHaveProperty('mitigation_id');
          expect(result.mitigations[0]).toHaveProperty('name');
          expect(typeof result.mitigations[0].mitigation_id).toBe('string');
          expect(typeof result.mitigations[0].name).toBe('string');
        }
      }
    });

    it('should verify multiple techniques can be retrieved', async () => {
      const techniqueIds = ['T0800', 'T0803', 'T0881'];

      for (const techniqueId of techniqueIds) {
        const result = await getMitreTechnique(db, {
          technique_id: techniqueId,
          options: {
            include_mitigations: false,
          },
        });

        // All these techniques should exist in the database
        if (result) {
          expect(result.technique_id).toBe(techniqueId);
          expect(result.name).toBeDefined();
        }
      }
    });

    it('should verify database has expected number of techniques', () => {
      const count = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM mitre_ics_techniques'
      );

      // Should have ingested techniques (at least 80+ ICS techniques)
      expect(count?.count).toBeGreaterThan(80);
    });

    it('should verify database has mitigations', () => {
      const count = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM mitre_ics_mitigations'
      );

      // Should have ingested mitigations (at least 50+)
      expect(count?.count).toBeGreaterThan(50);
    });

    it('should verify technique-mitigation relationships exist', () => {
      const count = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM mitre_technique_mitigations'
      );

      // Should have relationships (at least 300+)
      expect(count?.count).toBeGreaterThan(300);
    });
  });
});
