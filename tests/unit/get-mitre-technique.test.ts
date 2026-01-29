/**
 * Unit tests for get_mitre_ics_technique tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { getMitreTechnique } from '../../src/tools/get-mitre-technique.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('getMitreTechnique', () => {
  let db: DatabaseClient;
  const testDbPath = join(process.cwd(), 'tests/data/test-get-mitre-technique.sqlite');

  beforeEach(async () => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
    // Create database client
    db = new DatabaseClient(testDbPath);
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      db.close();
    }
    // Clean up test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
  });

  describe('Empty Database', () => {
    it('should return null when technique not found', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
      });
      expect(result).toBeNull();
    });

    it('should return null when technique_id is empty', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: '',
      });
      expect(result).toBeNull();
    });
  });

  describe('Basic Technique Retrieval', () => {
    beforeEach(() => {
      // Insert test technique with JSON fields
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description, platforms, data_sources)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'T0800',
          'initial-access',
          'Exploit Public-Facing Application',
          'Adversaries may exploit vulnerabilities in public-facing applications to gain initial access.',
          JSON.stringify(['Windows', 'Linux', 'Control Server']),
          JSON.stringify(['Network Traffic', 'Application Logs']),
        ]
      );
    });

    it('should return technique with all fields', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
      });

      expect(result).toBeDefined();
      expect(result?.technique_id).toBe('T0800');
      expect(result?.tactic).toBe('initial-access');
      expect(result?.name).toBe('Exploit Public-Facing Application');
      expect(result?.description).toContain('public-facing applications');
    });

    it('should parse platforms JSON array correctly', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
      });

      expect(result?.platforms).toEqual(['Windows', 'Linux', 'Control Server']);
      expect(Array.isArray(result?.platforms)).toBe(true);
    });

    it('should parse data_sources JSON array correctly', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
      });

      expect(result?.data_sources).toEqual(['Network Traffic', 'Application Logs']);
      expect(Array.isArray(result?.data_sources)).toBe(true);
    });

    it('should include mitigations array by default', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
      });

      expect(result).toHaveProperty('mitigations');
      expect(Array.isArray(result?.mitigations)).toBe(true);
    });

    it('should include mapped_requirements array', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
      });

      expect(result).toHaveProperty('mapped_requirements');
      expect(Array.isArray(result?.mapped_requirements)).toBe(true);
    });
  });

  describe('Technique with Null Fields', () => {
    beforeEach(() => {
      // Insert technique with minimal fields (nulls)
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description, platforms, data_sources)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['T0801', 'execution', 'Test Technique', null, null, null]
      );
    });

    it('should handle null platforms', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0801',
      });

      expect(result?.platforms).toBeNull();
    });

    it('should handle null data_sources', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0801',
      });

      expect(result?.data_sources).toBeNull();
    });

    it('should handle null description', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0801',
      });

      expect(result?.description).toBeNull();
    });
  });

  describe('Mitigations', () => {
    beforeEach(() => {
      // Insert technique
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description, platforms, data_sources)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'T0802',
          'persistence',
          'Modify Program',
          'Adversaries may modify industrial control logic.',
          JSON.stringify(['Engineering Workstation']),
          JSON.stringify(['File Monitoring']),
        ]
      );

      // Insert mitigations
      db.run(
        `INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
         VALUES (?, ?, ?)`,
        [
          'M0800',
          'Application Whitelisting',
          'Use application whitelisting to prevent execution of unauthorized programs.',
        ]
      );

      db.run(
        `INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
         VALUES (?, ?, ?)`,
        ['M0801', 'Code Signing', 'Enforce code signing for all control logic.']
      );

      // Link technique to mitigations
      db.run(
        `INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id)
         VALUES (?, ?)`,
        ['T0802', 'M0800']
      );

      db.run(
        `INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id)
         VALUES (?, ?)`,
        ['T0802', 'M0801']
      );
    });

    it('should include mitigations when include_mitigations is true (default)', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0802',
      });

      expect(result?.mitigations).toHaveLength(2);
      expect(result?.mitigations.map((m) => m.mitigation_id)).toContain('M0800');
      expect(result?.mitigations.map((m) => m.mitigation_id)).toContain('M0801');
    });

    it('should include mitigations when explicitly set to true', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0802',
        options: {
          include_mitigations: true,
        },
      });

      expect(result?.mitigations).toHaveLength(2);
    });

    it('should exclude mitigations when include_mitigations is false', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0802',
        options: {
          include_mitigations: false,
        },
      });

      expect(result?.mitigations).toHaveLength(0);
      expect(result?.mitigations).toEqual([]);
    });

    it('should return mitigation details with all fields', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0802',
      });

      const mitigation = result?.mitigations.find((m) => m.mitigation_id === 'M0800');
      expect(mitigation).toBeDefined();
      expect(mitigation?.name).toBe('Application Whitelisting');
      expect(mitigation?.description).toContain('whitelisting');
    });

    it('should handle technique with no mitigations', async () => {
      // Insert technique without mitigations
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description, platforms, data_sources)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['T0803', 'defense-evasion', 'Masquerading', 'Hide malicious activity.', null, null]
      );

      const result = await getMitreTechnique(db, {
        technique_id: 'T0803',
      });

      expect(result?.mitigations).toEqual([]);
    });
  });

  describe('Standard Mapping', () => {
    beforeEach(() => {
      // Insert technique
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description, platforms, data_sources)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['T0804', 'impact', 'Damage to Property', 'Cause physical damage.', null, null]
      );

      // Insert standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      // Insert requirements
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'Human user identification', 'Identify all human users.', 'host']
      );

      // Insert mitigation
      db.run(
        `INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
         VALUES (?, ?, ?)`,
        ['M0802', 'Access Control', 'Implement access controls.']
      );

      // Link technique to mitigation with requirement mapping
      db.run(
        `INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id, ot_requirement_id)
         VALUES (?, ?, ?)`,
        ['T0804', 'M0802', 'SR 1.1']
      );
    });

    it('should return empty mapped_requirements when map_to_standards not provided', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0804',
      });

      expect(result?.mapped_requirements).toEqual([]);
    });

    it('should map to requirements when map_to_standards provided', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0804',
        options: {
          map_to_standards: ['iec62443-3-3'],
        },
      });

      expect(result?.mapped_requirements).toHaveLength(1);
      expect(result?.mapped_requirements[0].requirement_id).toBe('SR 1.1');
      expect(result?.mapped_requirements[0].standard_id).toBe('iec62443-3-3');
    });

    it('should return empty array when standard has no mappings', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0804',
        options: {
          map_to_standards: ['nist-csf'],
        },
      });

      expect(result?.mapped_requirements).toEqual([]);
    });

    it('should handle multiple standards in map_to_standards', async () => {
      // Add another standard and requirement
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['nist-csf', 'NIST CSF', 'v1.1', 'current']
      );

      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        ['nist-csf', 'ID.AM-1', 'Physical devices and systems', 'Inventory devices.', 'host']
      );

      // Add another mitigation to avoid UNIQUE constraint violation
      db.run(
        `INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
         VALUES (?, ?, ?)`,
        ['M0806', 'Network Segmentation', 'Implement network segmentation.']
      );

      db.run(
        `INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id, ot_requirement_id)
         VALUES (?, ?, ?)`,
        ['T0804', 'M0806', 'ID.AM-1']
      );

      const result = await getMitreTechnique(db, {
        technique_id: 'T0804',
        options: {
          map_to_standards: ['iec62443-3-3', 'nist-csf'],
        },
      });

      expect(result?.mapped_requirements).toHaveLength(2);
      const reqIds = result?.mapped_requirements.map((r) => r.requirement_id);
      expect(reqIds).toContain('SR 1.1');
      expect(reqIds).toContain('ID.AM-1');
    });

    it('should return unique requirements even with multiple mitigations', async () => {
      // Add another mitigation linking to the same requirement
      db.run(
        `INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
         VALUES (?, ?, ?)`,
        ['M0803', 'Audit', 'Perform regular audits.']
      );

      db.run(
        `INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id, ot_requirement_id)
         VALUES (?, ?, ?)`,
        ['T0804', 'M0803', 'SR 1.1']
      );

      const result = await getMitreTechnique(db, {
        technique_id: 'T0804',
        options: {
          map_to_standards: ['iec62443-3-3'],
        },
      });

      // Should return only one requirement despite two mitigations
      expect(result?.mapped_requirements).toHaveLength(1);
      expect(result?.mapped_requirements[0].requirement_id).toBe('SR 1.1');
    });
  });

  describe('Error Handling', () => {
    it('should return null for invalid technique_id format', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'INVALID',
      });

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Close the database to force an error
      db.close();

      const result = await getMitreTechnique(db, {
        technique_id: 'T0800',
      });

      expect(result).toBeNull();
    });

    it('should handle malformed JSON in platforms field', async () => {
      // Insert technique with invalid JSON
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description, platforms, data_sources)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['T0805', 'execution', 'Test', 'Description', 'INVALID_JSON', null]
      );

      const result = await getMitreTechnique(db, {
        technique_id: 'T0805',
      });

      // Should handle gracefully - either return null or parse error
      expect(result).toBeDefined();
    });
  });

  describe('Complete Integration', () => {
    beforeEach(() => {
      // Insert a complete technique with all relationships
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description, platforms, data_sources)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'T0806',
          'initial-access',
          'Drive-by Compromise',
          'Adversaries may gain access through drive-by compromise.',
          JSON.stringify(['Human-Machine Interface']),
          JSON.stringify(['Web Proxy', 'Network Traffic']),
        ]
      );

      // Insert mitigations
      db.run(
        `INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
         VALUES (?, ?, ?)`,
        ['M0804', 'Update Software', 'Keep software updated.']
      );

      // Insert standard and requirement
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'SR 2.1', 'Software identification', 'Identify all software.', 'host']
      );

      // Link technique to mitigation with requirement mapping (single insert)
      db.run(
        `INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id, ot_requirement_id)
         VALUES (?, ?, ?)`,
        ['T0806', 'M0804', 'SR 2.1']
      );
    });

    it('should return complete technique detail with all relationships', async () => {
      const result = await getMitreTechnique(db, {
        technique_id: 'T0806',
        options: {
          include_mitigations: true,
          map_to_standards: ['iec62443-3-3'],
        },
      });

      expect(result).toBeDefined();
      expect(result?.technique_id).toBe('T0806');
      expect(result?.name).toBe('Drive-by Compromise');
      expect(result?.platforms).toEqual(['Human-Machine Interface']);
      expect(result?.data_sources).toEqual(['Web Proxy', 'Network Traffic']);
      expect(result?.mitigations).toHaveLength(1);
      expect(result?.mitigations[0].mitigation_id).toBe('M0804');
      expect(result?.mapped_requirements).toHaveLength(1);
      expect(result?.mapped_requirements[0].requirement_id).toBe('SR 2.1');
    });
  });
});
