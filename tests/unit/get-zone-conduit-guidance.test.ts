/**
 * Unit tests for get_zone_conduit_guidance tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { getZoneConduitGuidance } from '../../src/tools/get-zone-conduit-guidance.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('getZoneConduitGuidance', () => {
  let db: DatabaseClient;
  const testDbPath = join(process.cwd(), 'tests/data/test-zone-conduit.sqlite');

  beforeEach(async () => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
    // Create database client
    db = new DatabaseClient(testDbPath);

    // Set up test zones
    const zone1 = db.run(
      `INSERT INTO zones (name, purdue_level, security_level_target, description, iec_reference, typical_assets)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Level 1 - Basic Control',
        1,
        3,
        'Basic control zone with PLCs',
        'IEC 62443-3-2',
        'PLCs, DCS controllers'
      ]
    );

    const zone2 = db.run(
      `INSERT INTO zones (name, purdue_level, security_level_target, description, iec_reference, typical_assets)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Level 2 - Area Supervisory',
        2,
        3,
        'Area supervisory control zone',
        'IEC 62443-3-2',
        'Supervisory controllers, HMI'
      ]
    );

    const zone3 = db.run(
      `INSERT INTO zones (name, purdue_level, security_level_target, description, iec_reference, typical_assets)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Level 3 - SCADA DMZ',
        3,
        2,
        'SCADA DMZ zone',
        'IEC 62443-3-2',
        'SCADA servers, Historians'
      ]
    );

    // Set up test conduits
    const conduit1 = db.run(
      `INSERT INTO conduits (name, conduit_type, security_requirements, description, iec_reference, minimum_security_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Firewall - Level 1 to Level 2',
        'filtered_bidirectional',
        'Deep packet inspection',
        'Stateful firewall between zones',
        'IEC 62443-3-2',
        2
      ]
    );

    const conduit2 = db.run(
      `INSERT INTO conduits (name, conduit_type, security_requirements, description, iec_reference, minimum_security_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Data Diode - Level 1 to Level 3',
        'unidirectional',
        'Hardware-enforced',
        'One-way data flow for historian',
        'IEC 62443-3-2',
        3
      ]
    );

    // Set up test flows
    db.run(
      `INSERT INTO zone_conduit_flows (source_zone_id, target_zone_id, conduit_id, data_flow_description, security_level_requirement, bidirectional)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        zone1.lastInsertRowid,
        zone2.lastInsertRowid,
        conduit1.lastInsertRowid,
        'Process control commands and data',
        2,
        1
      ]
    );

    db.run(
      `INSERT INTO zone_conduit_flows (source_zone_id, target_zone_id, conduit_id, data_flow_description, security_level_requirement, bidirectional)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        zone1.lastInsertRowid,
        zone3.lastInsertRowid,
        conduit2.lastInsertRowid,
        'Historian data replication',
        3,
        0
      ]
    );
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

  it('should return all zones and conduits when no filters provided', async () => {
    const result = await getZoneConduitGuidance(db, {});

    expect(result.zones).toHaveLength(3);
    expect(result.conduits).toHaveLength(2);
    expect(result.flows).toHaveLength(2);
    expect(result.reference_architecture).toBe('IEC 62443-3-2 Purdue Model');
    expect(result.guidance).toContain('Network Segmentation Guidance');
  });

  it('should filter zones by Purdue level', async () => {
    const result = await getZoneConduitGuidance(db, { purdue_level: 1 });

    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].name).toBe('Level 1 - Basic Control');
    expect(result.zones[0].purdue_level).toBe(1);
  });

  it('should filter zones by security level target', async () => {
    const result = await getZoneConduitGuidance(db, { security_level_target: 3 });

    expect(result.zones).toHaveLength(2);
    expect(result.zones.every(z => z.security_level_target === 3)).toBe(true);
  });

  it('should filter by both Purdue level and security level', async () => {
    const result = await getZoneConduitGuidance(db, {
      purdue_level: 2,
      security_level_target: 3
    });

    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].name).toBe('Level 2 - Area Supervisory');
    expect(result.zones[0].purdue_level).toBe(2);
    expect(result.zones[0].security_level_target).toBe(3);
  });

  it('should filter by reference architecture', async () => {
    const result = await getZoneConduitGuidance(db, {
      reference_architecture: 'IEC 62443-3-2'
    });

    expect(result.zones).toHaveLength(3);
    expect(result.zones.every(z => z.iec_reference.includes('IEC 62443-3-2'))).toBe(true);
  });

  it('should include conduit information', async () => {
    const result = await getZoneConduitGuidance(db, {});

    expect(result.conduits).toHaveLength(2);
    expect(result.conduits[0]).toHaveProperty('name');
    expect(result.conduits[0]).toHaveProperty('conduit_type');
    expect(result.conduits[0]).toHaveProperty('minimum_security_level');
  });

  it('should include flow information with zone and conduit names', async () => {
    const result = await getZoneConduitGuidance(db, {});

    expect(result.flows).toHaveLength(2);
    expect(result.flows[0]).toHaveProperty('source_zone_name');
    expect(result.flows[0]).toHaveProperty('target_zone_name');
    expect(result.flows[0]).toHaveProperty('conduit_name');
    expect(result.flows[0]).toHaveProperty('data_flow_description');
    expect(result.flows[0]).toHaveProperty('bidirectional');
  });

  it('should filter flows when zones are filtered', async () => {
    const result = await getZoneConduitGuidance(db, { purdue_level: 1 });

    // Should show flows involving Level 1 zone
    expect(result.flows.length).toBeGreaterThan(0);
    const flowInvolvesLevel1 = result.flows.some(
      f => f.source_zone_name.includes('Level 1') || f.target_zone_name.includes('Level 1')
    );
    expect(flowInvolvesLevel1).toBe(true);
  });

  it('should generate guidance text', async () => {
    const result = await getZoneConduitGuidance(db, {});

    expect(result.guidance).toBeDefined();
    expect(result.guidance).toContain('Network Segmentation Guidance');
    expect(result.guidance).toContain('Zone Security Considerations');
    expect(result.guidance).toContain('Best Practices');
  });

  it('should include zone details in guidance', async () => {
    const result = await getZoneConduitGuidance(db, { purdue_level: 1 });

    expect(result.guidance).toContain('Level 1 - Basic Control');
    expect(result.guidance).toContain('Purdue Level 1');
  });

  it('should order zones by Purdue level', async () => {
    const result = await getZoneConduitGuidance(db, {});

    expect(result.zones[0].purdue_level).toBeLessThanOrEqual(result.zones[1].purdue_level);
    expect(result.zones[1].purdue_level).toBeLessThanOrEqual(result.zones[2].purdue_level);
  });

  it('should return empty arrays when no matches found', async () => {
    const result = await getZoneConduitGuidance(db, { purdue_level: 5 });

    expect(result.zones).toHaveLength(0);
    expect(result.flows).toHaveLength(0);
    expect(result.conduits).toHaveLength(2); // Conduits are not filtered
  });
});
