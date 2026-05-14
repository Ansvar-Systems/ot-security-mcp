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

  // IEC-NIST mapping validation removed 2026-05-14 — ISA/IEC 62443 source
  // pulled (forbids bulk redistribution); see scripts/migrations/2026-05-14-
  // remove-iec62443-mappings.ts.

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

  // IEC-NIST mapping ingestion test block removed 2026-05-14 — see header note.

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
