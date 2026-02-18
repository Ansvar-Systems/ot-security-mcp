/**
 * Unit tests for NIST 800-53 OSCAL ingestion
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { Nist80053Ingester } from '../../scripts/ingest-nist-80053.js';
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';

describe('Nist80053Ingester', () => {
  let db: DatabaseClient;
  let ingester: Nist80053Ingester;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = createTestDbPath('ingest-nist53');
    // Create database client and ingester
    db = new DatabaseClient(testDbPath);
    ingester = new Nist80053Ingester(db);
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      db.close();
    }
    // Clean up test database
    await cleanupTestDb(testDbPath);
  });

  describe('OSCAL Catalog Parsing', () => {
    it('should parse OSCAL catalog JSON', () => {
      const mockOscal = {
        catalog: {
          metadata: {
            title: 'NIST SP 800-53 Rev 5',
            version: 'Rev 5',
          },
          groups: [
            {
              id: 'ac',
              title: 'Access Control',
              controls: [
                {
                  id: 'ac-1',
                  title: 'Policy and Procedures',
                  props: [{ name: 'label', value: 'AC-1' }],
                  parts: [
                    {
                      id: 'ac-1_smt',
                      name: 'statement',
                      prose: 'Develop, document, and disseminate access control policies...',
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const controls = ingester.parseOscalCatalog(mockOscal);
      expect(controls).toHaveLength(1);
      expect(controls[0].control_id).toBe('AC-1');
      expect(controls[0].title).toBe('Policy and Procedures');
      expect(controls[0].description).toContain('access control policies');
      expect(controls[0].family).toBe('AC');
    });

    it('should handle controls without statement parts', () => {
      const mockOscal = {
        catalog: {
          metadata: {
            title: 'NIST SP 800-53 Rev 5',
            version: 'Rev 5',
          },
          groups: [
            {
              id: 'au',
              title: 'Audit and Accountability',
              controls: [
                {
                  id: 'au-1',
                  title: 'Policy and Procedures',
                  props: [{ name: 'label', value: 'AU-1' }],
                  parts: [],
                },
              ],
            },
          ],
        },
      };

      const controls = ingester.parseOscalCatalog(mockOscal);
      expect(controls).toHaveLength(1);
      expect(controls[0].control_id).toBe('AU-1');
      // When no statement parts exist, a fallback message is provided
      expect(controls[0].description).toBe(
        'Policy and Procedures. See NIST SP 800-53 Rev 5 for complete guidance.'
      );
    });

    it('should extract control ID from props label', () => {
      const mockOscal = {
        catalog: {
          metadata: {
            title: 'NIST SP 800-53 Rev 5',
            version: 'Rev 5',
          },
          groups: [
            {
              id: 'cm',
              title: 'Configuration Management',
              controls: [
                {
                  id: 'cm-2',
                  title: 'Baseline Configuration',
                  props: [{ name: 'label', value: 'CM-2' }],
                  parts: [
                    {
                      id: 'cm-2_smt',
                      name: 'statement',
                      prose: 'Develop, document, and maintain baseline configurations...',
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const controls = ingester.parseOscalCatalog(mockOscal);
      expect(controls).toHaveLength(1);
      expect(controls[0].control_id).toBe('CM-2');
    });
  });

  describe('OT-Relevant Control Filtering', () => {
    it('should filter to OT-relevant control families', () => {
      const controls = [
        { control_id: 'AC-1', family: 'AC', title: 'Test', description: 'Test' }, // OT-relevant
        { control_id: 'AT-1', family: 'AT', title: 'Test', description: 'Test' }, // Not OT-relevant (Awareness Training)
        { control_id: 'IA-2', family: 'IA', title: 'Test', description: 'Test' }, // OT-relevant
        { control_id: 'PS-1', family: 'PS', title: 'Test', description: 'Test' }, // OT-relevant (Personnel Security)
        { control_id: 'SC-7', family: 'SC', title: 'Test', description: 'Test' }, // OT-relevant
        { control_id: 'PM-1', family: 'PM', title: 'Test', description: 'Test' }, // Not OT-relevant (Program Management)
      ];

      const filtered = ingester.filterOtRelevantControls(controls);
      expect(filtered).toHaveLength(4);
      expect(filtered.map((c) => c.control_id)).toEqual(['AC-1', 'IA-2', 'PS-1', 'SC-7']);
    });

    it('should include all 15 OT-relevant families', () => {
      const allFamilies = [
        'AC',
        'AU',
        'CA',
        'CM',
        'CP',
        'IA',
        'IR',
        'MA',
        'PE',
        'PL',
        'PS',
        'SA',
        'SC',
        'SI',
        'SR',
      ];
      const controls = allFamilies.map((family, idx) => ({
        control_id: `${family}-${idx + 1}`,
        family,
        title: 'Test',
        description: 'Test',
      }));

      const filtered = ingester.filterOtRelevantControls(controls);
      expect(filtered).toHaveLength(15);
      expect(filtered.map((c) => c.family).sort()).toEqual(allFamilies.sort());
    });
  });

  describe('Database Ingestion', () => {
    it('should ingest controls into database', () => {
      // Insert nist-800-53 standard first
      db.run(`
        INSERT INTO ot_standards (id, name, version, status)
        VALUES ('nist-800-53', 'NIST SP 800-53', 'Rev 5', 'current')
      `);

      const mockControls = [
        {
          control_id: 'AC-2',
          title: 'Account Management',
          description: 'Manage information system accounts...',
          family: 'AC',
        },
      ];

      ingester.ingestControls(mockControls);

      const control = db.queryOne<{
        standard_id: string;
        requirement_id: string;
        title: string;
        description: string;
        component_type: string;
      }>('SELECT * FROM ot_requirements WHERE standard_id = ? AND requirement_id = ?', [
        'nist-800-53',
        'AC-2',
      ]);

      expect(control).toBeDefined();
      expect(control?.standard_id).toBe('nist-800-53');
      expect(control?.requirement_id).toBe('AC-2');
      expect(control?.title).toBe('Account Management');
      expect(control?.description).toContain('information system accounts');
      expect(control?.component_type).toBe('ac');
    });

    it('should replace existing controls with INSERT OR REPLACE', () => {
      // Insert nist-800-53 standard first
      db.run(`
        INSERT INTO ot_standards (id, name, version, status)
        VALUES ('nist-800-53', 'NIST SP 800-53', 'Rev 5', 'current')
      `);

      const control1 = [
        {
          control_id: 'IA-5',
          title: 'Old Title',
          description: 'Old description',
          family: 'IA',
        },
      ];

      ingester.ingestControls(control1);

      let result = db.queryOne<{ title: string }>(
        'SELECT title FROM ot_requirements WHERE standard_id = ? AND requirement_id = ?',
        ['nist-800-53', 'IA-5']
      );
      expect(result?.title).toBe('Old Title');

      // Update with new data
      const control2 = [
        {
          control_id: 'IA-5',
          title: 'Authenticator Management',
          description: 'Manage system authenticators...',
          family: 'IA',
        },
      ];

      ingester.ingestControls(control2);

      result = db.queryOne<{ title: string }>(
        'SELECT title FROM ot_requirements WHERE standard_id = ? AND requirement_id = ?',
        ['nist-800-53', 'IA-5']
      );
      expect(result?.title).toBe('Authenticator Management');

      // Should still have only one record
      const count =
        db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ? AND requirement_id = ?',
          ['nist-800-53', 'IA-5']
        )?.count || 0;
      expect(count).toBe(1);
    });

    it('should ingest multiple controls in a batch', () => {
      // Insert nist-800-53 standard first
      db.run(`
        INSERT INTO ot_standards (id, name, version, status)
        VALUES ('nist-800-53', 'NIST SP 800-53', 'Rev 5', 'current')
      `);

      const mockControls = [
        {
          control_id: 'SC-7',
          title: 'Boundary Protection',
          description: 'Monitor and control communications...',
          family: 'SC',
        },
        {
          control_id: 'SC-8',
          title: 'Transmission Confidentiality and Integrity',
          description: 'Protect information during transmission...',
          family: 'SC',
        },
        {
          control_id: 'SC-12',
          title: 'Cryptographic Key Establishment and Management',
          description: 'Establish and manage cryptographic keys...',
          family: 'SC',
        },
      ];

      ingester.ingestControls(mockControls);

      const count =
        db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
          ['nist-800-53']
        )?.count || 0;

      expect(count).toBe(3);
    });
  });
});
