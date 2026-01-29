import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { Nist80082Ingester } from '../../scripts/ingest-nist-80082.js';
import { existsSync, unlinkSync } from 'fs';

describe('Nist80082Ingester', () => {
  const testDbPath = 'tests/data/test-nist-80082.db';
  let db: DatabaseClient;
  let ingester: Nist80082Ingester;

  beforeEach(() => {
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
    db = new DatabaseClient(testDbPath);
    ingester = new Nist80082Ingester(db);
  });

  afterEach(() => {
    db.close();
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
  });

  it('should validate guidance JSON structure', () => {
    const validGuidance = {
      meta: {
        title: 'NIST SP 800-82 Rev 3',
        version: 'Rev 3',
        published_date: '2023-11-01'
      },
      guidance: [
        {
          id: 'G-5.1',
          section: 'Chapter 5',
          title: 'Risk Assessment for ICS',
          description: 'Organizations should conduct risk assessments...',
          ics_context: 'ICS environments have unique risk factors...',
          related_800_53_controls: ['RA-3', 'RA-5']
        }
      ]
    };

    expect(() => ingester.validateGuidanceStructure(validGuidance)).not.toThrow();
  });

  it('should reject invalid guidance structure', () => {
    const invalidGuidance = {
      guidance: [
        { id: 'G-1' } // Missing required fields
      ]
    };

    expect(() => ingester.validateGuidanceStructure(invalidGuidance)).toThrow();
  });

  it('should parse guidance into database format', () => {
    const mockGuidance = {
      meta: {
        title: 'NIST SP 800-82 Rev 3',
        version: 'Rev 3',
        published_date: '2023-11-01'
      },
      guidance: [
        {
          id: 'G-6.2',
          section: 'Chapter 6',
          title: 'Network Segmentation',
          description: 'Implement zones and conduits...',
          ics_context: 'Critical for ICS environments',
          related_800_53_controls: ['SC-7', 'AC-4']
        }
      ]
    };

    const items = ingester.parseGuidance(mockGuidance);
    expect(items).toHaveLength(1);
    expect(items[0].requirement_id).toBe('G-6.2');
    expect(items[0].related_controls).toEqual(['SC-7', 'AC-4']);
  });

  it('should ingest guidance into database', () => {
    // Setup: Create nist-800-82 standard
    db.run(`
      INSERT INTO ot_standards (id, name, version, status)
      VALUES ('nist-800-82', 'NIST SP 800-82', 'Rev 3', 'current')
    `);

    const mockItems = [
      {
        requirement_id: 'G-5.3',
        title: 'Vulnerability Management',
        description: 'Establish vulnerability management process...',
        rationale: 'ICS systems often cannot be patched immediately',
        related_controls: ['SI-2', 'RA-5']
      }
    ];

    ingester.ingestGuidance(mockItems);

    const item = db.queryOne<any>(
      'SELECT * FROM ot_requirements WHERE standard_id = ? AND requirement_id = ?',
      ['nist-800-82', 'G-5.3']
    );

    expect(item).toBeDefined();
    expect(item.title).toBe('Vulnerability Management');
    expect(item.rationale).toContain('ICS systems');
  });

  it('should link guidance to 800-53 controls via mappings table', () => {
    // Setup standards
    db.run(`INSERT INTO ot_standards (id, name, version, status)
            VALUES ('nist-800-82', 'NIST SP 800-82', 'Rev 3', 'current')`);
    db.run(`INSERT INTO ot_standards (id, name, version, status)
            VALUES ('nist-800-53', 'NIST SP 800-53', 'Rev 5', 'current')`);

    const mockItems = [
      {
        requirement_id: 'G-5.1',
        title: 'Risk Assessment',
        description: 'Conduct ICS-specific risk assessments',
        rationale: 'ICS risk factors differ from IT',
        related_controls: ['RA-3']
      }
    ];

    ingester.ingestGuidance(mockItems);

    // Check mapping was created
    const mapping = db.queryOne<any>(
      `SELECT * FROM ot_mappings
       WHERE source_standard = 'nist-800-82'
       AND source_requirement = 'G-5.1'
       AND target_standard = 'nist-800-53'`,
      []
    );

    expect(mapping).toBeDefined();
    expect(mapping.target_requirement).toBe('RA-3');
  });
});
