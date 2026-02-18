import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { Iec62443Ingester } from '../../scripts/ingest-iec62443.js';
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';

describe('Iec62443Ingester', () => {
  let testDbPath: string;
  let db: DatabaseClient;
  let ingester: Iec62443Ingester;

  beforeEach(() => {
    testDbPath = createTestDbPath('ingest-iec');
    db = new DatabaseClient(testDbPath);
    ingester = new Iec62443Ingester(db);
  });

  afterEach(async () => {
    db.close();
    await cleanupTestDb(testDbPath);
  });

  describe('Part 3-3 (System Requirements)', () => {
    it('should ingest SR requirements with security levels', () => {
      const data = {
        meta: {
          part: '3-3',
          title: 'IEC 62443-3-3',
          version: 'v2.0',
          published_date: '2023-10-01',
        },
        requirements: [
          {
            requirement_id: 'SR 1.1',
            parent_requirement_id: null,
            title: 'Human user identification',
            description: 'Control system shall provide capability...',
            rationale: 'Authentication is essential...',
            component_type: 'host',
            security_levels: [
              { security_level: 2, sl_type: 'SL-T', capability_level: 1 },
              { security_level: 3, sl_type: 'SL-C', capability_level: 2 },
            ],
          },
        ],
      };

      ingester.ingestPart33(data);

      // Check requirement inserted
      const req = db.queryOne<any>('SELECT * FROM ot_requirements WHERE requirement_id = ?', [
        'SR 1.1',
      ]);
      expect(req).toBeDefined();
      expect(req.title).toBe('Human user identification');

      // Check security levels inserted
      const levels = db.query<any>('SELECT * FROM security_levels WHERE requirement_db_id = ?', [
        req.id,
      ]);
      expect(levels).toHaveLength(2);
      expect(levels[0].security_level).toBe(2);
      expect(levels[1].security_level).toBe(3);
    });

    it('should handle requirement enhancements (REs)', () => {
      const data = {
        meta: {
          part: '3-3',
          title: 'IEC 62443-3-3',
          version: 'v2.0',
          published_date: '2023-10-01',
        },
        requirements: [
          {
            requirement_id: 'SR 1.1',
            parent_requirement_id: null,
            title: 'Base requirement',
            description: 'Base description',
            rationale: 'Base rationale',
            component_type: 'host',
            security_levels: [{ security_level: 1, sl_type: 'SL-T', capability_level: 1 }],
          },
          {
            requirement_id: 'SR 1.1 RE 1',
            parent_requirement_id: 'SR 1.1',
            title: 'Enhancement 1',
            description: 'Enhanced capability',
            rationale: 'Provides additional security',
            component_type: 'host',
            security_levels: [{ security_level: 3, sl_type: 'SL-T', capability_level: 2 }],
          },
        ],
      };

      ingester.ingestPart33(data);

      const base = db.queryOne<any>('SELECT * FROM ot_requirements WHERE requirement_id = ?', [
        'SR 1.1',
      ]);
      const enhancement = db.queryOne<any>(
        'SELECT * FROM ot_requirements WHERE requirement_id = ?',
        ['SR 1.1 RE 1']
      );

      expect(base).toBeDefined();
      expect(enhancement).toBeDefined();
      expect(enhancement.parent_requirement_id).toBe('SR 1.1');
    });
  });

  describe('Part 4-2 (Component Requirements)', () => {
    it('should ingest CR requirements', () => {
      const data = {
        meta: {
          part: '4-2',
          title: 'IEC 62443-4-2',
          version: 'v2.0',
          published_date: '2023-10-01',
        },
        requirements: [
          {
            requirement_id: 'CR 2.1',
            parent_requirement_id: null,
            title: 'Authorization enforcement',
            description: 'Component shall enforce...',
            rationale: 'Prevents unauthorized access',
            component_type: 'embedded',
            security_levels: [{ security_level: 2, sl_type: 'SL-C', capability_level: 1 }],
          },
        ],
      };

      ingester.ingestPart42(data);

      const req = db.queryOne<any>('SELECT * FROM ot_requirements WHERE requirement_id = ?', [
        'CR 2.1',
      ]);
      expect(req).toBeDefined();
      expect(req.standard_id).toBe('iec62443-4-2');
    });
  });

  describe('Part 3-2 (Zones & Conduits)', () => {
    it('should ingest zones', () => {
      const data = {
        meta: {
          part: '3-2',
          title: 'IEC 62443-3-2',
          version: 'v1.0',
          published_date: '2020-06-01',
        },
        zones: [
          {
            name: 'Level 3 - SCADA DMZ',
            purdue_level: 3,
            security_level_target: 2,
            description: 'DMZ for SCADA',
            typical_assets: 'HMI, Historian',
          },
        ],
        conduits: [],
      };

      ingester.ingestPart32(data);

      const zone = db.queryOne<any>('SELECT * FROM zones WHERE name = ?', ['Level 3 - SCADA DMZ']);
      expect(zone).toBeDefined();
      expect(zone.purdue_level).toBe(3);
    });

    it('should ingest conduits', () => {
      const data = {
        meta: {
          part: '3-2',
          title: 'IEC 62443-3-2',
          version: 'v1.0',
          published_date: '2020-06-01',
        },
        zones: [],
        conduits: [
          {
            name: 'Firewall',
            conduit_type: 'filtered_bidirectional',
            description: 'Stateful firewall',
            minimum_security_level: 2,
          },
        ],
      };

      ingester.ingestPart32(data);

      const conduit = db.queryOne<any>('SELECT * FROM conduits WHERE name = ?', ['Firewall']);
      expect(conduit).toBeDefined();
      expect(conduit.conduit_type).toBe('filtered_bidirectional');
    });
  });

  describe('Validation Integration', () => {
    it('should validate before ingestion', () => {
      const invalidData = {
        meta: { part: '3-3' }, // Missing required fields
        requirements: [],
      };

      expect(() => ingester.ingestPart33(invalidData as any)).toThrow();
    });
  });

  describe('Flows and Reference Architectures', () => {
    it('should ingest zone-to-zone flows via conduits', () => {
      const data = {
        meta: {
          part: '3-2',
          title: 'IEC 62443-3-2',
          version: 'v1.0',
          published_date: '2020-06-01',
        },
        zones: [
          {
            name: 'Zone A',
            purdue_level: 2,
            security_level_target: 2,
            description: 'Control zone',
          },
          {
            name: 'Zone B',
            purdue_level: 3,
            security_level_target: 2,
            description: 'SCADA zone',
          },
        ],
        conduits: [
          {
            name: 'Firewall AB',
            conduit_type: 'filtered_bidirectional',
            description: 'Firewall between A and B',
          },
        ],
        flows: [
          {
            source_zone_name: 'Zone A',
            target_zone_name: 'Zone B',
            conduit_name: 'Firewall AB',
            data_flow_description: 'Process data flow',
            security_level_requirement: 2,
            bidirectional: true,
          },
        ],
        reference_architectures: [],
      };

      ingester.ingestPart32(data);

      // Verify flow was created with proper foreign keys
      const flow = db.queryOne<any>(
        `SELECT * FROM zone_conduit_flows WHERE data_flow_description = ?`,
        ['Process data flow']
      );
      expect(flow).toBeDefined();
      expect(flow.bidirectional).toBe(1); // SQLite stores boolean as 0/1
      expect(flow.security_level_requirement).toBe(2);
    });

    it('should ingest reference architectures', () => {
      const data = {
        meta: {
          part: '3-2',
          title: 'IEC 62443-3-2',
          version: 'v1.0',
          published_date: '2020-06-01',
        },
        zones: [],
        conduits: [],
        flows: [],
        reference_architectures: [
          {
            name: 'Purdue Model',
            description: 'Standard ICS segmentation',
            diagram_url: 'https://example.com/purdue',
            applicable_zones: 'Levels 0-5',
            industry_applicability: 'Manufacturing',
          },
        ],
      };

      ingester.ingestPart32(data);

      const arch = db.queryOne<any>('SELECT * FROM reference_architectures WHERE name = ?', [
        'Purdue Model',
      ]);
      expect(arch).toBeDefined();
      expect(arch.industry_applicability).toBe('Manufacturing');
    });
  });
});
