/**
 * Unit tests for MITRE ATT&CK ICS ingestion
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { MitreIngester } from '../../scripts/ingest-mitre-ics.js';
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';

describe('MitreIngester', () => {
  let db: DatabaseClient;
  let ingester: MitreIngester;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = createTestDbPath('ingest-mitre');
    // Create database client and ingester
    db = new DatabaseClient(testDbPath);
    ingester = new MitreIngester(db);
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      db.close();
    }
    // Clean up test database
    await cleanupTestDb(testDbPath);
  });

  describe('STIX Attack Pattern Parsing', () => {
    it('should parse and ingest a basic attack-pattern', () => {
      const stixAttackPattern = {
        type: 'attack-pattern',
        id: 'attack-pattern--123',
        name: 'Exploit Public-Facing Application',
        description: 'Adversaries may exploit vulnerabilities in public-facing applications.',
        external_references: [
          {
            source_name: 'mitre-attack',
            external_id: 'T0800',
            url: 'https://attack.mitre.org/techniques/T0800',
          },
        ],
        kill_chain_phases: [
          {
            kill_chain_name: 'mitre-ics-attack',
            phase_name: 'initial-access',
          },
        ],
        x_mitre_platforms: ['Windows', 'Linux'],
        x_mitre_data_sources: ['Network Traffic', 'Application Logs'],
      };

      ingester.ingestTechnique(stixAttackPattern as any);

      const result = db.queryOne<{
        technique_id: string;
        tactic: string;
        name: string;
        description: string;
        platforms: string;
        data_sources: string;
      }>('SELECT * FROM mitre_ics_techniques WHERE technique_id = ?', ['T0800']);

      expect(result).toBeDefined();
      expect(result?.technique_id).toBe('T0800');
      expect(result?.tactic).toBe('initial-access');
      expect(result?.name).toBe('Exploit Public-Facing Application');
      expect(result?.description).toContain('public-facing applications');
      expect(result?.platforms).toBe(JSON.stringify(['Windows', 'Linux']));
      expect(result?.data_sources).toBe(JSON.stringify(['Network Traffic', 'Application Logs']));
    });

    it('should handle attack-pattern without platforms or data sources', () => {
      const stixAttackPattern = {
        type: 'attack-pattern',
        id: 'attack-pattern--456',
        name: 'Test Technique',
        description: 'Test description',
        external_references: [
          {
            source_name: 'mitre-attack',
            external_id: 'T0801',
          },
        ],
        kill_chain_phases: [
          {
            kill_chain_name: 'mitre-ics-attack',
            phase_name: 'execution',
          },
        ],
      };

      ingester.ingestTechnique(stixAttackPattern as any);

      const result = db.queryOne<{
        technique_id: string;
        platforms: string | null;
        data_sources: string | null;
      }>(
        'SELECT technique_id, platforms, data_sources FROM mitre_ics_techniques WHERE technique_id = ?',
        ['T0801']
      );

      expect(result).toBeDefined();
      expect(result?.technique_id).toBe('T0801');
      expect(result?.platforms).toBeNull();
      expect(result?.data_sources).toBeNull();
    });

    it('should skip attack-pattern without external ID', () => {
      const stixAttackPattern = {
        type: 'attack-pattern',
        id: 'attack-pattern--no-id',
        name: 'Technique Without ID',
        description: 'Should be skipped',
        kill_chain_phases: [],
      };

      ingester.ingestTechnique(stixAttackPattern as any);

      const count =
        db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_techniques')
          ?.count || 0;

      expect(count).toBe(0);
    });

    it('should extract tactic from multiple kill chain phases', () => {
      const stixAttackPattern = {
        type: 'attack-pattern',
        id: 'attack-pattern--multi-tactic',
        name: 'Multi-Tactic Technique',
        description: 'Test',
        external_references: [
          {
            source_name: 'mitre-attack',
            external_id: 'T0802',
          },
        ],
        kill_chain_phases: [
          {
            kill_chain_name: 'mitre-ics-attack',
            phase_name: 'persistence',
          },
          {
            kill_chain_name: 'mitre-ics-attack',
            phase_name: 'privilege-escalation',
          },
        ],
      };

      ingester.ingestTechnique(stixAttackPattern as any);

      const result = db.queryOne<{ tactic: string }>(
        'SELECT tactic FROM mitre_ics_techniques WHERE technique_id = ?',
        ['T0802']
      );

      // Should extract first tactic
      expect(result?.tactic).toBe('persistence');
    });
  });

  describe('STIX Course of Action Parsing', () => {
    it('should parse and ingest a basic course-of-action', () => {
      const stixMitigation = {
        type: 'course-of-action',
        id: 'course-of-action--123',
        name: 'Application Isolation and Sandboxing',
        description: 'Restrict execution of code to a virtual environment.',
        external_references: [
          {
            source_name: 'mitre-attack',
            external_id: 'M0800',
            url: 'https://attack.mitre.org/mitigations/M0800',
          },
        ],
      };

      ingester.ingestMitigation(stixMitigation as any);

      const result = db.queryOne<{
        mitigation_id: string;
        name: string;
        description: string;
      }>('SELECT * FROM mitre_ics_mitigations WHERE mitigation_id = ?', ['M0800']);

      expect(result).toBeDefined();
      expect(result?.mitigation_id).toBe('M0800');
      expect(result?.name).toBe('Application Isolation and Sandboxing');
      expect(result?.description).toContain('virtual environment');
    });

    it('should skip course-of-action without external ID', () => {
      const stixMitigation = {
        type: 'course-of-action',
        id: 'course-of-action--no-id',
        name: 'Mitigation Without ID',
        description: 'Should be skipped',
      };

      ingester.ingestMitigation(stixMitigation as any);

      const count =
        db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_mitigations')
          ?.count || 0;

      expect(count).toBe(0);
    });
  });

  describe('STIX Relationship Parsing', () => {
    it('should resolve and ingest mitigation relationships', () => {
      // First ingest a technique
      const technique = {
        type: 'attack-pattern',
        id: 'attack-pattern--tech-1',
        name: 'Test Technique',
        description: 'Test',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T0900' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-ics-attack', phase_name: 'execution' }],
      };

      // Then ingest a mitigation
      const mitigation = {
        type: 'course-of-action',
        id: 'course-of-action--mit-1',
        name: 'Test Mitigation',
        description: 'Test mitigation',
        external_references: [{ source_name: 'mitre-attack', external_id: 'M0900' }],
      };

      // Create a relationship
      const relationship = {
        type: 'relationship',
        id: 'relationship--1',
        relationship_type: 'mitigates',
        source_ref: 'course-of-action--mit-1',
        target_ref: 'attack-pattern--tech-1',
      };

      ingester.ingestTechnique(technique as any);
      ingester.ingestMitigation(mitigation as any);
      ingester.ingestRelationships([technique, mitigation, relationship] as any);

      const result = db.queryOne<{
        technique_id: string;
        mitigation_id: string;
      }>('SELECT * FROM mitre_technique_mitigations WHERE technique_id = ? AND mitigation_id = ?', [
        'T0900',
        'M0900',
      ]);

      expect(result).toBeDefined();
      expect(result?.technique_id).toBe('T0900');
      expect(result?.mitigation_id).toBe('M0900');
    });

    it('should skip relationships with unresolved IDs', () => {
      const relationship = {
        type: 'relationship',
        id: 'relationship--orphan',
        relationship_type: 'mitigates',
        source_ref: 'course-of-action--nonexistent',
        target_ref: 'attack-pattern--nonexistent',
      };

      ingester.ingestRelationships([relationship] as any);

      const count =
        db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_technique_mitigations')
          ?.count || 0;

      expect(count).toBe(0);
    });

    it('should ignore non-mitigates relationships', () => {
      // Ingest technique and mitigation
      const technique = {
        type: 'attack-pattern',
        id: 'attack-pattern--tech-2',
        name: 'Test Technique 2',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T0901' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-ics-attack', phase_name: 'execution' }],
      };

      const mitigation = {
        type: 'course-of-action',
        id: 'course-of-action--mit-2',
        name: 'Test Mitigation 2',
        external_references: [{ source_name: 'mitre-attack', external_id: 'M0901' }],
      };

      // Create a non-mitigates relationship
      const relationship = {
        type: 'relationship',
        id: 'relationship--uses',
        relationship_type: 'uses',
        source_ref: 'course-of-action--mit-2',
        target_ref: 'attack-pattern--tech-2',
      };

      ingester.ingestTechnique(technique as any);
      ingester.ingestMitigation(mitigation as any);
      ingester.ingestRelationships([technique, mitigation, relationship] as any);

      const count =
        db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_technique_mitigations')
          ?.count || 0;

      expect(count).toBe(0);
    });
  });

  describe('Transaction and Data Replacement', () => {
    it('should replace existing technique data', () => {
      // Insert initial data
      const technique1 = {
        type: 'attack-pattern',
        id: 'attack-pattern--replace-test',
        name: 'Old Name',
        description: 'Old description',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T0999' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-ics-attack', phase_name: 'initial-access' }],
      };

      ingester.ingestTechnique(technique1 as any);

      let result = db.queryOne<{ name: string }>(
        'SELECT name FROM mitre_ics_techniques WHERE technique_id = ?',
        ['T0999']
      );
      expect(result?.name).toBe('Old Name');

      // Update with new data
      const technique2 = {
        type: 'attack-pattern',
        id: 'attack-pattern--replace-test',
        name: 'New Name',
        description: 'New description',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T0999' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-ics-attack', phase_name: 'execution' }],
      };

      ingester.ingestTechnique(technique2 as any);

      result = db.queryOne<{ name: string }>(
        'SELECT name FROM mitre_ics_techniques WHERE technique_id = ?',
        ['T0999']
      );
      expect(result?.name).toBe('New Name');

      // Should still have only one record
      const count =
        db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM mitre_ics_techniques WHERE technique_id = ?',
          ['T0999']
        )?.count || 0;
      expect(count).toBe(1);
    });
  });

  describe('JSON Array Storage', () => {
    it('should store platforms as valid JSON array', () => {
      const technique = {
        type: 'attack-pattern',
        id: 'attack-pattern--json-test',
        name: 'JSON Test',
        description: 'Testing JSON storage',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T1000' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-ics-attack', phase_name: 'execution' }],
        x_mitre_platforms: ['Windows', 'Linux', 'Control Server'],
      };

      ingester.ingestTechnique(technique as any);

      const result = db.queryOne<{ platforms: string }>(
        'SELECT platforms FROM mitre_ics_techniques WHERE technique_id = ?',
        ['T1000']
      );

      expect(result?.platforms).toBeDefined();

      // Parse and verify JSON
      const platforms = JSON.parse(result?.platforms || '[]');
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms).toHaveLength(3);
      expect(platforms).toContain('Windows');
      expect(platforms).toContain('Linux');
      expect(platforms).toContain('Control Server');
    });

    it('should store data_sources as valid JSON array', () => {
      const technique = {
        type: 'attack-pattern',
        id: 'attack-pattern--json-test-2',
        name: 'JSON Test 2',
        description: 'Testing JSON storage',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T1001' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-ics-attack', phase_name: 'execution' }],
        x_mitre_data_sources: ['Network Traffic', 'Process Monitoring', 'File Monitoring'],
      };

      ingester.ingestTechnique(technique as any);

      const result = db.queryOne<{ data_sources: string }>(
        'SELECT data_sources FROM mitre_ics_techniques WHERE technique_id = ?',
        ['T1001']
      );

      expect(result?.data_sources).toBeDefined();

      // Parse and verify JSON
      const dataSources = JSON.parse(result?.data_sources || '[]');
      expect(Array.isArray(dataSources)).toBe(true);
      expect(dataSources).toHaveLength(3);
      expect(dataSources).toContain('Network Traffic');
      expect(dataSources).toContain('Process Monitoring');
    });
  });
});
