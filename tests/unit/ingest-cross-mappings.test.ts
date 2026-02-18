import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { CrossMappingsIngester } from '../../scripts/ingest-cross-mappings.js';
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';

describe('CrossMappingsIngester', () => {
  let testDbPath: string;
  let db: DatabaseClient;
  let ingester: CrossMappingsIngester;

  beforeEach(() => {
    testDbPath = createTestDbPath('ingest-mappings');
    db = new DatabaseClient(testDbPath);
    ingester = new CrossMappingsIngester(db);
  });

  afterEach(async () => {
    db.close();
    await cleanupTestDb(testDbPath);
  });

  describe('IEC-NIST mapping validation', () => {
    it('should validate valid IEC-NIST mapping structure', () => {
      const validData = {
        meta: {
          title: 'Test IEC-NIST Mappings',
          description: 'Test',
          version: '1.0',
          created_date: '2026-01-01',
          sources: [],
          confidence_basis: 'Test',
        },
        mappings: [
          {
            source_standard: 'iec62443-3-3',
            source_requirement: 'SR 1.1',
            target_standard: 'nist-800-53',
            target_requirement: 'IA-02',
            mapping_type: 'related',
            confidence: 0.85,
            notes: 'Test mapping',
          },
        ],
      };

      expect(() => ingester.validateIecNistStructure(validData)).not.toThrow();
    });

    it('should reject missing meta.title', () => {
      const invalidData = {
        meta: {},
        mappings: [],
      };

      expect(() => ingester.validateIecNistStructure(invalidData)).toThrow(
        'Invalid IEC-NIST JSON: missing or invalid meta.title'
      );
    });

    it('should reject non-array mappings', () => {
      const invalidData = {
        meta: { title: 'Test' },
        mappings: 'not an array',
      };

      expect(() => ingester.validateIecNistStructure(invalidData)).toThrow(
        'mappings must be an array'
      );
    });

    it('should reject mappings with missing required fields', () => {
      const invalidData = {
        meta: { title: 'Test' },
        mappings: [{ source_standard: 'iec62443-3-3' }],
      };

      expect(() => ingester.validateIecNistStructure(invalidData)).toThrow(
        'missing required fields'
      );
    });

    it('should reject invalid confidence values', () => {
      const invalidData = {
        meta: { title: 'Test' },
        mappings: [
          {
            source_standard: 'iec62443-3-3',
            source_requirement: 'SR 1.1',
            target_standard: 'nist-800-53',
            target_requirement: 'IA-02',
            mapping_type: 'related',
            confidence: 1.5,
            notes: 'Invalid confidence',
          },
        ],
      };

      expect(() => ingester.validateIecNistStructure(invalidData)).toThrow(
        'confidence must be between 0 and 1'
      );
    });
  });

  describe('MITRE-NIST mapping validation', () => {
    it('should validate valid MITRE-NIST structure', () => {
      const validData = {
        meta: {
          title: 'Test MITRE-NIST Linkages',
          description: 'Test',
          version: '1.0',
          created_date: '2026-01-01',
          sources: [],
          confidence_basis: 'Test',
        },
        mitigation_mappings: [
          {
            mitigation_id: 'M0801',
            nist_controls: ['AC-03', 'AC-06'],
            notes: 'Test mapping',
          },
        ],
      };

      expect(() => ingester.validateMitreNistStructure(validData)).not.toThrow();
    });

    it('should reject missing mitigation_mappings', () => {
      const invalidData = {
        meta: { title: 'Test' },
      };

      expect(() => ingester.validateMitreNistStructure(invalidData)).toThrow(
        'mitigation_mappings must be an array'
      );
    });

    it('should reject empty nist_controls array', () => {
      const invalidData = {
        meta: { title: 'Test' },
        mitigation_mappings: [
          {
            mitigation_id: 'M0801',
            nist_controls: [],
            notes: 'Empty controls',
          },
        ],
      };

      expect(() => ingester.validateMitreNistStructure(invalidData)).toThrow(
        'nist_controls must have at least one entry'
      );
    });
  });

  describe('IEC-NIST mapping ingestion', () => {
    it('should insert IEC-NIST mappings into database', () => {
      const data = {
        meta: {
          title: 'Test',
          description: '',
          version: '1.0',
          created_date: '',
          sources: [],
          confidence_basis: '',
        },
        mappings: [
          {
            source_standard: 'iec62443-3-3',
            source_requirement: 'SR 1.1',
            target_standard: 'nist-800-53',
            target_requirement: 'IA-02',
            mapping_type: 'related',
            confidence: 0.85,
            notes: 'Test mapping',
          },
          {
            source_standard: 'iec62443-3-3',
            source_requirement: 'SR 2.1',
            target_standard: 'nist-800-53',
            target_requirement: 'AC-03',
            mapping_type: 'related',
            confidence: 0.9,
            notes: 'Authorization enforcement',
          },
        ],
      };

      const count = ingester.ingestIecNistMappings(data);
      expect(count).toBe(2);

      const mapping = db.queryOne<any>(
        `SELECT * FROM ot_mappings
         WHERE source_standard = 'iec62443-3-3'
         AND source_requirement = 'SR 1.1'
         AND target_standard = 'nist-800-53'`
      );

      expect(mapping).toBeDefined();
      expect(mapping.target_requirement).toBe('IA-02');
      expect(mapping.confidence).toBe(0.85);
    });

    it('should not create duplicates on re-run', () => {
      const data = {
        meta: {
          title: 'Test',
          description: '',
          version: '1.0',
          created_date: '',
          sources: [],
          confidence_basis: '',
        },
        mappings: [
          {
            source_standard: 'iec62443-3-3',
            source_requirement: 'SR 1.1',
            target_standard: 'nist-800-53',
            target_requirement: 'IA-02',
            mapping_type: 'related',
            confidence: 0.85,
            notes: 'Test mapping',
          },
        ],
      };

      ingester.ingestIecNistMappings(data);
      ingester.ingestIecNistMappings(data);

      const count = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ot_mappings
         WHERE source_standard = 'iec62443-3-3'
         AND source_requirement = 'SR 1.1'`
      );

      expect(count?.count).toBe(1);
    });
  });

  describe('MITRE-NIST mapping ingestion', () => {
    it('should insert MITRE-NIST mappings and update linkages', () => {
      // Setup: Create MITRE data
      db.run(`INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description)
              VALUES ('T0800', 'initial-access', 'Activate Firmware Update Mode', 'Test technique')`);
      db.run(`INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
              VALUES ('M0801', 'Access Management', 'Test mitigation')`);
      db.run(`INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id, ot_requirement_id)
              VALUES ('T0800', 'M0801', NULL)`);

      const data = {
        meta: {
          title: 'Test',
          description: '',
          version: '1.0',
          created_date: '',
          sources: [],
          confidence_basis: '',
        },
        mitigation_mappings: [
          {
            mitigation_id: 'M0801',
            nist_controls: ['AC-03', 'AC-06'],
            notes: 'Access management maps to access control',
          },
        ],
      };

      const result = ingester.ingestMitreMappings(data);
      expect(result.mappings).toBe(2); // Two NIST controls
      expect(result.linkages).toBe(1); // One technique-mitigation updated

      // Check ot_mappings
      const mappings = db.query<any>(
        `SELECT * FROM ot_mappings WHERE source_standard = 'mitre-ics'`
      );
      expect(mappings.length).toBe(2);

      // Check ot_requirement_id was populated
      const linkage = db.queryOne<any>(
        `SELECT ot_requirement_id FROM mitre_technique_mitigations
         WHERE mitigation_id = 'M0801'`
      );
      expect(linkage?.ot_requirement_id).toBe('AC-03'); // Primary NIST control
    });

    it('should not create duplicate MITRE mappings on re-run', () => {
      const data = {
        meta: {
          title: 'Test',
          description: '',
          version: '1.0',
          created_date: '',
          sources: [],
          confidence_basis: '',
        },
        mitigation_mappings: [
          {
            mitigation_id: 'M0801',
            nist_controls: ['AC-03'],
            notes: 'Test',
          },
        ],
      };

      ingester.ingestMitreMappings(data);
      ingester.ingestMitreMappings(data);

      const count = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ot_mappings
         WHERE source_standard = 'mitre-ics'
         AND source_requirement = 'M0801'`
      );

      expect(count?.count).toBe(1);
    });
  });
});
