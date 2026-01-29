/**
 * Unit tests for database schema and client
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('DatabaseClient', () => {
  let db: DatabaseClient;
  const testDbPath = join(process.cwd(), 'tests/data/test-db.sqlite');

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

  describe('Schema Initialization', () => {
    it('should create all required tables', () => {
      const tables = db.query<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
      );

      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('ot_standards');
      expect(tableNames).toContain('ot_requirements');
      expect(tableNames).toContain('security_levels');
      expect(tableNames).toContain('ot_mappings');
      expect(tableNames).toContain('zones_conduits');
      expect(tableNames).toContain('mitre_ics_techniques');
      expect(tableNames).toContain('mitre_ics_mitigations');
      expect(tableNames).toContain('mitre_technique_mitigations');
      expect(tableNames).toContain('sector_applicability');
    });

    it('should enable foreign keys', () => {
      const result = db.queryOne<{ foreign_keys: number }>(
        'PRAGMA foreign_keys'
      );
      expect(result?.foreign_keys).toBe(1);
    });

    it('should use WAL mode', () => {
      const result = db.queryOne<{ journal_mode: string }>(
        'PRAGMA journal_mode'
      );
      expect(result?.journal_mode).toBe('wal');
    });
  });

  describe('CRUD Operations', () => {
    it('should insert and query data from ot_standards', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, published_date, url, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', '2023-01-01', 'https://example.com', 'current', 'Test standard']
      );

      const standards = db.query<{ id: string; name: string }>(
        'SELECT id, name FROM ot_standards WHERE id = ?',
        ['iec62443-3-3']
      );

      expect(standards).toHaveLength(1);
      expect(standards[0]?.id).toBe('iec62443-3-3');
      expect(standards[0]?.name).toBe('IEC 62443-3-3');
    });

    it('should insert and query data from ot_requirements', () => {
      // First insert a standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      // Then insert a requirement
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'Human user identification', 'The control system shall provide the capability to identify and authenticate all human users.', 'host', 3]
      );

      const requirements = db.query<{ requirement_id: string; title: string }>(
        'SELECT requirement_id, title FROM ot_requirements WHERE requirement_id = ?',
        ['SR 1.1']
      );

      expect(requirements).toHaveLength(1);
      expect(requirements[0]?.requirement_id).toBe('SR 1.1');
      expect(requirements[0]?.title).toBe('Human user identification');
    });

    it('should update existing data', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['test-standard', 'Test Standard', 'v1.0', 'draft']
      );

      db.run(
        `UPDATE ot_standards SET status = ? WHERE id = ?`,
        ['current', 'test-standard']
      );

      const result = db.queryOne<{ status: string }>(
        'SELECT status FROM ot_standards WHERE id = ?',
        ['test-standard']
      );

      expect(result?.status).toBe('current');
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key constraint on ot_requirements', () => {
      expect(() => {
        db.run(
          `INSERT INTO ot_requirements (standard_id, requirement_id, title)
           VALUES (?, ?, ?)`,
          ['nonexistent-standard', 'SR 1.1', 'Test Requirement']
        );
      }).toThrow();
    });

    it('should enforce foreign key constraint on security_levels', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      const result = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title)
         VALUES (?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'Test Requirement']
      );

      const requirementDbId = result.lastInsertRowid;

      // This should work with valid requirement_db_id
      expect(() => {
        db.run(
          `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
           VALUES (?, ?, ?)`,
          [requirementDbId, 2, 'SL-T']
        );
      }).not.toThrow();
    });

    it('should cascade delete from mitre_ics_techniques to junction table', () => {
      // Insert MITRE technique
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description)
         VALUES (?, ?, ?, ?)`,
        ['T0800', 'Initial Access', 'Exploit Public-Facing Application', 'Test description']
      );

      // Insert mitigation
      db.run(
        `INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
         VALUES (?, ?, ?)`,
        ['M0800', 'Application Isolation', 'Test mitigation']
      );

      // Insert junction record
      db.run(
        `INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id)
         VALUES (?, ?)`,
        ['T0800', 'M0800']
      );

      // Verify junction record exists
      let junctionRecords = db.query(
        'SELECT * FROM mitre_technique_mitigations WHERE technique_id = ?',
        ['T0800']
      );
      expect(junctionRecords).toHaveLength(1);

      // Delete technique - should cascade to junction table
      db.run('DELETE FROM mitre_ics_techniques WHERE technique_id = ?', ['T0800']);

      // Verify junction record is deleted
      junctionRecords = db.query(
        'SELECT * FROM mitre_technique_mitigations WHERE technique_id = ?',
        ['T0800']
      );
      expect(junctionRecords).toHaveLength(0);
    });
  });

  describe('CHECK Constraints', () => {
    it('should enforce security_level CHECK constraint (1-4)', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      const result = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title)
         VALUES (?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'Test Requirement']
      );

      const requirementDbId = result.lastInsertRowid;

      // Valid security levels (1-4) should work
      expect(() => {
        db.run(
          `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
           VALUES (?, ?, ?)`,
          [requirementDbId, 1, 'SL-T']
        );
      }).not.toThrow();

      // Invalid security level (0) should fail
      expect(() => {
        db.run(
          `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
           VALUES (?, ?, ?)`,
          [requirementDbId, 0, 'SL-T']
        );
      }).toThrow();

      // Invalid security level (5) should fail
      expect(() => {
        db.run(
          `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
           VALUES (?, ?, ?)`,
          [requirementDbId, 5, 'SL-T']
        );
      }).toThrow();
    });

    it('should enforce purdue_level CHECK constraint (0-5)', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      // Valid purdue levels (0-5) should work
      expect(() => {
        db.run(
          `INSERT INTO ot_requirements (standard_id, requirement_id, title, purdue_level)
           VALUES (?, ?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.1', 'Test Requirement', 0]
        );
      }).not.toThrow();

      // Invalid purdue level (-1) should fail
      expect(() => {
        db.run(
          `INSERT INTO ot_requirements (standard_id, requirement_id, title, purdue_level)
           VALUES (?, ?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.2', 'Test Requirement', -1]
        );
      }).toThrow();

      // Invalid purdue level (6) should fail
      expect(() => {
        db.run(
          `INSERT INTO ot_requirements (standard_id, requirement_id, title, purdue_level)
           VALUES (?, ?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.3', 'Test Requirement', 6]
        );
      }).toThrow();
    });

    it('should enforce confidence CHECK constraint (0.0-1.0)', () => {
      // Valid confidence values should work
      expect(() => {
        db.run(
          `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.1', 'nist-800-82', 'AC-1', 'exact_match', 1.0]
        );
      }).not.toThrow();

      // Invalid confidence (< 0.0) should fail
      expect(() => {
        db.run(
          `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.2', 'nist-800-82', 'AC-2', 'partial', -0.1]
        );
      }).toThrow();

      // Invalid confidence (> 1.0) should fail
      expect(() => {
        db.run(
          `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.3', 'nist-800-82', 'AC-3', 'partial', 1.1]
        );
      }).toThrow();
    });
  });

  describe('UNIQUE Constraints', () => {
    it('should enforce unique constraint on standard_id + requirement_id', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title)
         VALUES (?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'First Requirement']
      );

      // Attempting to insert duplicate should fail
      expect(() => {
        db.run(
          `INSERT INTO ot_requirements (standard_id, requirement_id, title)
           VALUES (?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.1', 'Duplicate Requirement']
        );
      }).toThrow();
    });

    it('should enforce unique constraint on MITRE technique_id', () => {
      db.run(
        `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description)
         VALUES (?, ?, ?, ?)`,
        ['T0800', 'Initial Access', 'Exploit Public-Facing Application', 'Test description']
      );

      // Attempting to insert duplicate technique_id should fail
      expect(() => {
        db.run(
          `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description)
           VALUES (?, ?, ?, ?)`,
          ['T0800', 'Execution', 'Different Technique', 'Different description']
        );
      }).toThrow();
    });
  });

  describe('Transactions', () => {
    it('should commit transaction on success', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      db.transaction(() => {
        db.run(
          `INSERT INTO ot_requirements (standard_id, requirement_id, title)
           VALUES (?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.1', 'Requirement 1']
        );
        db.run(
          `INSERT INTO ot_requirements (standard_id, requirement_id, title)
           VALUES (?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.2', 'Requirement 2']
        );
      });

      const requirements = db.query('SELECT * FROM ot_requirements');
      expect(requirements).toHaveLength(2);
    });

    it('should rollback transaction on error', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      expect(() => {
        db.transaction(() => {
          db.run(
            `INSERT INTO ot_requirements (standard_id, requirement_id, title)
             VALUES (?, ?, ?)`,
            ['iec62443-3-3', 'SR 1.1', 'Requirement 1']
          );
          // This will fail due to duplicate
          db.run(
            `INSERT INTO ot_requirements (standard_id, requirement_id, title)
             VALUES (?, ?, ?)`,
            ['iec62443-3-3', 'SR 1.1', 'Duplicate']
          );
        });
      }).toThrow();

      const requirements = db.query('SELECT * FROM ot_requirements');
      expect(requirements).toHaveLength(0);
    });

    it('should return value from transaction', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      const result = db.transaction(() => {
        db.run(
          `INSERT INTO ot_requirements (standard_id, requirement_id, title)
           VALUES (?, ?, ?)`,
          ['iec62443-3-3', 'SR 1.1', 'Requirement 1']
        );
        return db.query('SELECT COUNT(*) as count FROM ot_requirements');
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('count', 1);
    });
  });

  describe('Database Access', () => {
    it('should expose raw database instance', () => {
      const rawDb = db.database;
      expect(rawDb).toBeDefined();
      expect(typeof rawDb.prepare).toBe('function');
    });
  });

  describe('queryOne method', () => {
    it('should return single row when data exists', () => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['test-standard', 'Test Standard', 'v1.0', 'current']
      );

      const result = db.queryOne<{ id: string; name: string }>(
        'SELECT id, name FROM ot_standards WHERE id = ?',
        ['test-standard']
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-standard');
      expect(result?.name).toBe('Test Standard');
    });

    it('should return undefined when no data exists', () => {
      const result = db.queryOne<{ id: string }>(
        'SELECT id FROM ot_standards WHERE id = ?',
        ['nonexistent']
      );

      expect(result).toBeUndefined();
    });
  });

  describe('Indexes', () => {
    it('should create indexes for common queries', () => {
      const indexes = db.query<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name`
      );

      const indexNames = indexes.map(i => i.name);

      // Check for requirement search indexes
      expect(indexNames.some(name => name.includes('requirement'))).toBe(true);

      // Check for mapping indexes
      expect(indexNames.some(name => name.includes('mapping'))).toBe(true);

      // Check for MITRE tactic index
      expect(indexNames.some(name => name.includes('tactic'))).toBe(true);
    });
  });
});
