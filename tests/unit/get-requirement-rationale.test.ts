/**
 * Unit tests for get_requirement_rationale tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { getRequirementRationale } from '../../src/tools/get-requirement-rationale.js';
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';

describe('getRequirementRationale', () => {
  let db: DatabaseClient;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = createTestDbPath('rationale');
    // Create database client
    db = new DatabaseClient(testDbPath);
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      db.close();
    }
    // Clean up test database
    await cleanupTestDb(testDbPath);
  });

  describe('Not Found Cases', () => {
    it('should return null when requirement not found', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });
      expect(result).toBeNull();
    });

    it('should return null when standard does not exist', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'nonexistent-standard',
      });
      expect(result).toBeNull();
    });

    it('should return null with empty requirement_id', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: '',
        standard: 'iec62443-3-3',
      });
      expect(result).toBeNull();
    });

    it('should return null with empty standard', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: '',
      });
      expect(result).toBeNull();
    });
  });

  describe('IEC 62443 Requirement with Rationale', () => {
    beforeEach(() => {
      // Insert IEC 62443 standard
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
          'Security for industrial automation and control systems',
        ]
      );

      // Insert requirement with rationale
      const reqResult = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, parent_requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          null,
          'Human user identification and authentication',
          'The control system shall provide the capability to identify and authenticate all human users.',
          'User authentication is essential to ensure that only authorized individuals can access the control system. Without proper authentication, unauthorized users could potentially compromise system integrity, manipulate process variables, or exfiltrate sensitive operational data. This requirement mitigates risks associated with unauthorized access and supports non-repudiation.',
          'host',
          3,
        ]
      );

      // Insert security levels
      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [reqResult.lastInsertRowid, 1, 'SL-T', 1, 'Basic authentication required']
      );

      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [reqResult.lastInsertRowid, 2, 'SL-T', 2, 'Multi-factor authentication recommended']
      );

      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [reqResult.lastInsertRowid, 3, 'SL-T', 3, 'Strong authentication required']
      );

      // Insert sector applicability
      db.run(
        `INSERT INTO sector_applicability (sector, jurisdiction, standard, applicability, threshold, regulatory_driver, effective_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'energy',
          'US',
          'iec62443-3-3',
          'mandatory',
          'critical infrastructure',
          'NERC CIP, TSA Security Directive',
          '2024-01-01',
          'Required for critical energy infrastructure',
        ]
      );

      db.run(
        `INSERT INTO sector_applicability (sector, jurisdiction, standard, applicability, threshold, regulatory_driver, effective_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'manufacturing',
          'EU',
          'iec62443-3-3',
          'recommended',
          'industrial facilities',
          'NIS2 Directive',
          '2024-10-17',
          'Recommended for essential entities under NIS2',
        ]
      );
    });

    it('should return complete rationale for IEC 62443 requirement', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result).not.toBeNull();
      expect(result?.requirement.requirement_id).toBe('SR 1.1');
      expect(result?.requirement.title).toBe('Human user identification and authentication');
      expect(result?.rationale).toContain('User authentication is essential');
      expect(result?.rationale).toContain('unauthorized access');
    });

    it('should include standard metadata', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result?.standard.id).toBe('iec62443-3-3');
      expect(result?.standard.name).toBe('IEC 62443-3-3');
      expect(result?.standard.version).toBe('v2.0');
      expect(result?.standard.status).toBe('current');
    });

    it('should include security levels ordered by level', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result?.security_levels).toHaveLength(3);
      expect(result?.security_levels[0].security_level).toBe(1);
      expect(result?.security_levels[1].security_level).toBe(2);
      expect(result?.security_levels[2].security_level).toBe(3);
      expect(result?.security_levels[0].sl_type).toBe('SL-T');
    });

    it('should include regulatory context', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result?.regulatory_context).toHaveLength(2);

      // Check energy sector context
      const energyContext = result?.regulatory_context.find((rc) => rc.sector === 'energy');
      expect(energyContext).toBeDefined();
      expect(energyContext?.jurisdiction).toBe('US');
      expect(energyContext?.applicability).toBe('mandatory');
      expect(energyContext?.regulatory_driver).toContain('NERC CIP');

      // Check manufacturing sector context
      const mfgContext = result?.regulatory_context.find((rc) => rc.sector === 'manufacturing');
      expect(mfgContext).toBeDefined();
      expect(mfgContext?.jurisdiction).toBe('EU');
      expect(mfgContext?.regulatory_driver).toContain('NIS2');
    });

    it('should have empty related_standards when no mappings exist', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result?.related_standards).toHaveLength(0);
    });
  });

  describe('NIST 800-53 Requirement with Rationale', () => {
    beforeEach(() => {
      // Insert NIST 800-53 standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status, published_date, url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'nist-800-53',
          'NIST SP 800-53',
          'r5',
          'current',
          '2020-09-23',
          'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
        ]
      );

      // Insert requirement with rationale
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale, component_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'nist-800-53',
          'AC-2',
          'Account Management',
          'The organization manages information system accounts.',
          'Proper account management is critical for maintaining system security and ensuring that access is granted only to authorized users. This control helps prevent unauthorized access, supports accountability through audit trails, and enables timely detection of suspicious activities. Account management includes processes for account creation, activation, modification, review, and termination.',
          'host',
        ]
      );

      // Insert sector applicability for NIST
      db.run(
        `INSERT INTO sector_applicability (sector, jurisdiction, standard, applicability, threshold, regulatory_driver, effective_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'government',
          'US',
          'nist-800-53',
          'mandatory',
          'federal information systems',
          'FISMA',
          '2021-09-23',
        ]
      );
    });

    it('should return complete rationale for NIST requirement', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'AC-2',
        standard: 'nist-800-53',
      });

      expect(result).not.toBeNull();
      expect(result?.requirement.requirement_id).toBe('AC-2');
      expect(result?.requirement.title).toBe('Account Management');
      expect(result?.rationale).toContain('Proper account management');
      expect(result?.rationale).toContain('unauthorized access');
    });

    it('should have empty security_levels for NIST (non-IEC) standard', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'AC-2',
        standard: 'nist-800-53',
      });

      expect(result?.security_levels).toHaveLength(0);
    });

    it('should include NIST regulatory context', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'AC-2',
        standard: 'nist-800-53',
      });

      expect(result?.regulatory_context).toHaveLength(1);
      expect(result?.regulatory_context[0].sector).toBe('government');
      expect(result?.regulatory_context[0].regulatory_driver).toBe('FISMA');
      expect(result?.regulatory_context[0].applicability).toBe('mandatory');
    });
  });

  describe('Requirement with Missing Rationale', () => {
    beforeEach(() => {
      // Insert standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['test-standard', 'Test Standard', 'v1.0', 'current']
      );

      // Insert requirement WITHOUT rationale
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'test-standard',
          'REQ-1',
          'Test Requirement',
          'A test requirement description',
          null, // No rationale provided
        ]
      );
    });

    it('should return result with null rationale', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'REQ-1',
        standard: 'test-standard',
      });

      expect(result).not.toBeNull();
      expect(result?.requirement.requirement_id).toBe('REQ-1');
      expect(result?.rationale).toBeNull();
    });

    it('should include other fields even without rationale', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'REQ-1',
        standard: 'test-standard',
      });

      expect(result?.requirement).toBeDefined();
      expect(result?.standard).toBeDefined();
      expect(result?.security_levels).toBeDefined();
      expect(result?.regulatory_context).toBeDefined();
      expect(result?.related_standards).toBeDefined();
    });
  });

  describe('Requirement with Related Standards', () => {
    beforeEach(() => {
      // Insert multiple standards
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['nist-800-53', 'NIST SP 800-53', 'r5', 'current']
      );

      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['nist-800-82', 'NIST SP 800-82', 'r3', 'current']
      );

      // Insert requirement
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'Authentication',
          'User authentication',
          'Ensures authorized access only',
        ]
      );

      // Insert cross-standard mappings
      db.run(
        `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'nist-800-53',
          'IA-2',
          'exact_match',
          1.0,
          'Direct mapping for authentication',
          '2024-01-01',
        ]
      );

      db.run(
        `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'nist-800-82',
          'AC-2',
          'iec62443-3-3',
          'SR 1.1',
          'partial',
          0.8,
          'Partial overlap with account management',
          '2024-01-01',
        ]
      );

      db.run(
        `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'nist-800-53',
          'IA-8',
          'related',
          0.6,
          'Related to identification',
          '2024-01-01',
        ]
      );
    });

    it('should include related standards from mappings', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      expect(result?.related_standards).toHaveLength(3);
    });

    it('should order related standards by confidence (descending)', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      // Should be ordered: 1.0, 0.8, 0.6
      expect(result?.related_standards[0].confidence).toBe(1.0);
      expect(result?.related_standards[1].confidence).toBe(0.8);
      expect(result?.related_standards[2].confidence).toBe(0.6);
    });

    it('should correctly identify target standards when source', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      const nist53Mapping = result?.related_standards.find(
        (rs) => rs.standard === 'nist-800-53' && rs.requirement_id === 'IA-2'
      );
      expect(nist53Mapping).toBeDefined();
      expect(nist53Mapping?.mapping_type).toBe('exact_match');
      expect(nist53Mapping?.confidence).toBe(1.0);
    });

    it('should correctly identify source standards when target', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      const nist82Mapping = result?.related_standards.find(
        (rs) => rs.standard === 'nist-800-82' && rs.requirement_id === 'AC-2'
      );
      expect(nist82Mapping).toBeDefined();
      expect(nist82Mapping?.mapping_type).toBe('partial');
      expect(nist82Mapping?.confidence).toBe(0.8);
    });

    it('should include mapping_type for all related standards', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: 'iec62443-3-3',
      });

      result?.related_standards.forEach((rs) => {
        expect(rs.mapping_type).toBeDefined();
        expect(['exact_match', 'partial', 'related']).toContain(rs.mapping_type);
      });
    });
  });

  describe('Parameter Validation', () => {
    it('should handle SQL injection attempts safely', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: "SR 1.1'; DROP TABLE ot_requirements; --",
        standard: 'iec62443-3-3',
      });

      expect(result).toBeNull();

      // Verify table still exists
      const tables = db.query<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='ot_requirements'`
      );
      expect(tables).toHaveLength(1);
    });

    it('should handle whitespace-only requirement_id', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: '   ',
        standard: 'iec62443-3-3',
      });

      expect(result).toBeNull();
    });

    it('should handle whitespace-only standard', async () => {
      const result = await getRequirementRationale(db, {
        requirement_id: 'SR 1.1',
        standard: '   ',
      });

      expect(result).toBeNull();
    });
  });
});
