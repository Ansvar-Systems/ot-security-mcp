/**
 * Unit tests for get_ot_requirement tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { getRequirement } from '../../src/tools/get-requirement.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('getRequirement', () => {
  let db: DatabaseClient;
  const testDbPath = join(process.cwd(), 'tests/data/test-get-requirement.sqlite');

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
    it('should return null when requirement not found', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });
      expect(result).toBeNull();
    });

    it('should return null when standard does not exist', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'nonexistent-standard',
      });
      expect(result).toBeNull();
    });

    it('should return null when requirement_id does not match', async () => {
      // Insert standard but not the requirement
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });
      expect(result).toBeNull();
    });
  });

  describe('Basic Retrieval', () => {
    beforeEach(() => {
      // Insert test standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status, published_date, url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'IEC 62443-3-3',
          'v2.0',
          'current',
          '2023-01-01',
          'https://www.iec.ch/62443-3-3',
          'Test standard',
        ]
      );

      // Insert test requirement
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, parent_requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          null,
          'Human user identification',
          'The control system shall provide the capability to identify and authenticate all human users.',
          'Authentication is essential to ensure only authorized users can access the control system.',
          'host',
          3,
        ]
      );
    });

    it('should return RequirementDetail when requirement exists', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result?.requirement_id).toBe('SR 1.1');
      expect(result?.standard_id).toBe('iec62443-3-3');
    });

    it('should include all OTRequirement fields', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('standard_id');
      expect(result).toHaveProperty('requirement_id');
      expect(result).toHaveProperty('parent_requirement_id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('rationale');
      expect(result).toHaveProperty('component_type');
      expect(result).toHaveProperty('purdue_level');
    });

    it('should include standard metadata', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('standard');
      expect(result?.standard).toHaveProperty('id');
      expect(result?.standard.id).toBe('iec62443-3-3');
      expect(result?.standard.name).toBe('IEC 62443-3-3');
      expect(result?.standard.version).toBe('v2.0');
      expect(result?.standard.status).toBe('current');
      expect(result?.standard.published_date).toBe('2023-01-01');
      expect(result?.standard.url).toBe('https://www.iec.ch/62443-3-3');
      expect(result?.standard.notes).toBe('Test standard');
    });

    it('should include empty security_levels array when no levels exist', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('security_levels');
      expect(Array.isArray(result?.security_levels)).toBe(true);
      expect(result?.security_levels).toHaveLength(0);
    });

    it('should include empty mappings array when no mappings exist', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('mappings');
      expect(Array.isArray(result?.mappings)).toBe(true);
      expect(result?.mappings).toHaveLength(0);
    });
  });

  describe('Security Levels', () => {
    beforeEach(() => {
      // Insert test standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      // Insert test requirement
      const reqResult = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'Authentication', 'User authentication requirement', 'host']
      );

      // Insert security levels
      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [reqResult.lastInsertRowid, 2, 'SL-T', 1, 'Target security level 2']
      );

      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [reqResult.lastInsertRowid, 3, 'SL-C', 2, 'Capability security level 3']
      );
    });

    it('should include security_levels array when levels exist', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result?.security_levels).toHaveLength(2);
    });

    it('should include all security level fields', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      const sl = result?.security_levels[0];
      expect(sl).toHaveProperty('id');
      expect(sl).toHaveProperty('requirement_db_id');
      expect(sl).toHaveProperty('security_level');
      expect(sl).toHaveProperty('sl_type');
      expect(sl).toHaveProperty('capability_level');
      expect(sl).toHaveProperty('notes');
    });

    it('should include correct security level values', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      const sl2 = result?.security_levels.find((sl) => sl.security_level === 2);
      expect(sl2).toBeDefined();
      expect(sl2?.sl_type).toBe('SL-T');
      expect(sl2?.capability_level).toBe(1);
      expect(sl2?.notes).toBe('Target security level 2');
    });
  });

  describe('Mappings', () => {
    beforeEach(() => {
      // Insert test standards
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['nist-800-82', 'NIST SP 800-82', 'r3', 'current']
      );

      // Insert test requirement
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'Authentication', 'User authentication requirement', 'host']
      );

      // Insert mappings (bidirectional)
      db.run(
        `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'nist-800-82',
          'IA-2',
          'exact_match',
          1.0,
          'Direct mapping',
          '2024-01-01',
        ]
      );

      db.run(
        `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'nist-800-82',
          'IA-3',
          'iec62443-3-3',
          'SR 1.1',
          'partial_match',
          0.8,
          'Partial overlap',
          '2024-01-01',
        ]
      );
    });

    it('should include mappings by default', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result?.mappings).toHaveLength(2);
    });

    it('should include mappings when include_mappings is true', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
        options: { include_mappings: true },
      });

      expect(result).not.toBeNull();
      expect(result?.mappings).toHaveLength(2);
    });

    it('should exclude mappings when include_mappings is false', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
        options: { include_mappings: false },
      });

      expect(result).not.toBeNull();
      expect(result?.mappings).toHaveLength(0);
    });

    it('should include all mapping fields', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      const mapping = result?.mappings[0];
      expect(mapping).toHaveProperty('id');
      expect(mapping).toHaveProperty('source_standard');
      expect(mapping).toHaveProperty('source_requirement');
      expect(mapping).toHaveProperty('target_standard');
      expect(mapping).toHaveProperty('target_requirement');
      expect(mapping).toHaveProperty('mapping_type');
      expect(mapping).toHaveProperty('confidence');
      expect(mapping).toHaveProperty('notes');
      expect(mapping).toHaveProperty('created_date');
    });

    it('should include bidirectional mappings (source and target)', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result?.mappings).toHaveLength(2);

      // Find source mapping
      const sourceMapping = result?.mappings.find(
        (m) => m.source_standard === 'iec62443-3-3' && m.source_requirement === 'SR 1.1'
      );
      expect(sourceMapping).toBeDefined();
      expect(sourceMapping?.target_standard).toBe('nist-800-82');
      expect(sourceMapping?.target_requirement).toBe('IA-2');

      // Find target mapping
      const targetMapping = result?.mappings.find(
        (m) => m.target_standard === 'iec62443-3-3' && m.target_requirement === 'SR 1.1'
      );
      expect(targetMapping).toBeDefined();
      expect(targetMapping?.source_standard).toBe('nist-800-82');
      expect(targetMapping?.source_requirement).toBe('IA-3');
    });
  });

  describe('Version Parameter', () => {
    beforeEach(() => {
      // Insert test standard with version
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      // Insert test requirement
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'Authentication', 'User authentication requirement', 'host']
      );
    });

    it('should accept version parameter without error', async () => {
      // TODO: Stage 1 - version parameter is ignored for now
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
        options: { version: 'v2.0' },
      });

      expect(result).not.toBeNull();
      expect(result?.requirement_id).toBe('SR 1.1');
    });
  });

  describe('Parameter Validation', () => {
    it('should handle empty requirement_id', async () => {
      const result = await getRequirement(db, {
        requirement_id: '',
        standard: 'iec62443-3-3',
      });
      expect(result).toBeNull();
    });

    it('should handle empty standard', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: '',
      });
      expect(result).toBeNull();
    });

    it('should handle special SQL characters safely', async () => {
      // SQL injection attempt should be handled safely
      const result = await getRequirement(db, {
        requirement_id: "SR 1.1'; DROP TABLE ot_requirements; --",
        standard: 'iec62443-3-3',
      });
      expect(result).toBeNull();

      // Table should still exist
      const tables = db.query<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='ot_requirements'`
      );
      expect(tables).toHaveLength(1);
    });
  });

  describe('Complex Scenario', () => {
    beforeEach(() => {
      // Insert test standards
      db.run(
        `INSERT INTO ot_standards (id, name, version, status, published_date, url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'IEC 62443-3-3',
          'v2.0',
          'current',
          '2023-01-01',
          'https://www.iec.ch/62443-3-3',
          'Test standard',
        ]
      );

      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['nist-800-82', 'NIST SP 800-82', 'r3', 'current']
      );

      // Insert test requirement with parent
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1',
          'Identification and Authentication Control',
          'Parent requirement',
          'host',
        ]
      );

      const reqResult = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, parent_requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'SR 1',
          'Human user identification',
          'The control system shall provide the capability to identify and authenticate all human users.',
          'Authentication is essential to ensure only authorized users can access the control system.',
          'host',
          3,
        ]
      );

      // Insert multiple security levels
      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [reqResult.lastInsertRowid, 2, 'SL-T', 1, 'Target SL-2']
      );

      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [reqResult.lastInsertRowid, 3, 'SL-C', 2, 'Capability SL-3']
      );

      // Insert multiple mappings
      db.run(
        `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'nist-800-82',
          'IA-2',
          'exact_match',
          1.0,
          'Direct mapping',
          '2024-01-01',
        ]
      );

      db.run(
        `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'nist-800-82',
          'IA-3',
          'iec62443-3-3',
          'SR 1.1',
          'partial_match',
          0.8,
          'Partial overlap',
          '2024-01-01',
        ]
      );
    });

    it('should return complete RequirementDetail with all related data', async () => {
      const result = await getRequirement(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();

      // Check base requirement fields
      expect(result?.requirement_id).toBe('SR 1.1');
      expect(result?.parent_requirement_id).toBe('SR 1');
      expect(result?.title).toBe('Human user identification');
      expect(result?.component_type).toBe('host');
      expect(result?.purdue_level).toBe(3);

      // Check standard metadata
      expect(result?.standard.id).toBe('iec62443-3-3');
      expect(result?.standard.name).toBe('IEC 62443-3-3');
      expect(result?.standard.version).toBe('v2.0');

      // Check security levels
      expect(result?.security_levels).toHaveLength(2);
      expect(result?.security_levels.some((sl) => sl.security_level === 2)).toBe(true);
      expect(result?.security_levels.some((sl) => sl.security_level === 3)).toBe(true);

      // Check mappings
      expect(result?.mappings).toHaveLength(2);
      expect(result?.mappings.some((m) => m.target_requirement === 'IA-2')).toBe(true);
      expect(result?.mappings.some((m) => m.source_requirement === 'IA-3')).toBe(true);
    });
  });
});
