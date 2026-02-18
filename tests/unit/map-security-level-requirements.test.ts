/**
 * Unit tests for map_security_level_requirements tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { mapSecurityLevelRequirements } from '../../src/tools/map-security-level-requirements.js';
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';

describe('mapSecurityLevelRequirements', () => {
  let db: DatabaseClient;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = createTestDbPath('map-sl');
    // Create database client
    db = new DatabaseClient(testDbPath);

    // Set up test data
    db.run(
      `INSERT INTO ot_standards (id, name, version, status)
       VALUES (?, ?, ?, ?)`,
      ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
    );

    // SR 1.1 (base requirement)
    const sr11 = db.run(
      `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
       VALUES (?, ?, ?, ?, ?)`,
      ['iec62443-3-3', 'SR 1.1', 'User authentication', 'Provide authentication', 'host']
    );
    db.run(
      `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level)
       VALUES (?, ?, ?, ?)`,
      [sr11.lastInsertRowid, 2, 'SL-T', 1]
    );
    db.run(
      `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level)
       VALUES (?, ?, ?, ?)`,
      [sr11.lastInsertRowid, 3, 'SL-T', 2]
    );

    // SR 1.1 RE 1 (enhancement)
    const sr11re1 = db.run(
      `INSERT INTO ot_requirements (standard_id, requirement_id, parent_requirement_id, title, description, component_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['iec62443-3-3', 'SR 1.1 RE 1', 'SR 1.1', 'MFA enhancement', 'Multi-factor auth', 'host']
    );
    db.run(
      `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level)
       VALUES (?, ?, ?, ?)`,
      [sr11re1.lastInsertRowid, 4, 'SL-T', 3]
    );

    // SR 2.1 (network component)
    const sr21 = db.run(
      `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
       VALUES (?, ?, ?, ?, ?)`,
      ['iec62443-3-3', 'SR 2.1', 'Network segmentation', 'Segment networks', 'network']
    );
    db.run(
      `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level)
       VALUES (?, ?, ?, ?)`,
      [sr21.lastInsertRowid, 2, 'SL-T', 1]
    );
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      db.close();
    }
    // Clean up test database
    await cleanupTestDb(testDbPath);
  });

  it('should return requirements for SL-2', async () => {
    const result = await mapSecurityLevelRequirements(db, { security_level: 2 });

    expect(result).toHaveLength(2); // SR 1.1, SR 2.1
    expect(result.map((r) => r.requirement_id).sort()).toEqual(['SR 1.1', 'SR 2.1']);
  });

  it('should return requirements for SL-3', async () => {
    const result = await mapSecurityLevelRequirements(db, { security_level: 3 });

    expect(result).toHaveLength(1); // SR 1.1
    expect(result[0].requirement_id).toBe('SR 1.1');
  });

  it('should return requirements for SL-4 including enhancements', async () => {
    const result = await mapSecurityLevelRequirements(db, {
      security_level: 4,
      include_enhancements: true,
    });

    expect(result).toHaveLength(1); // SR 1.1 RE 1
    expect(result[0].requirement_id).toBe('SR 1.1 RE 1');
  });

  it('should exclude enhancements when include_enhancements is false', async () => {
    const result = await mapSecurityLevelRequirements(db, {
      security_level: 4,
      include_enhancements: false,
    });

    expect(result).toHaveLength(0); // No base requirements at SL-4
  });

  it('should filter by component type', async () => {
    const result = await mapSecurityLevelRequirements(db, {
      security_level: 2,
      component_type: 'network',
    });

    expect(result).toHaveLength(1); // SR 2.1
    expect(result[0].requirement_id).toBe('SR 2.1');
  });

  it('should return security levels with each requirement', async () => {
    const result = await mapSecurityLevelRequirements(db, { security_level: 2 });

    const sr11 = result.find((r) => r.requirement_id === 'SR 1.1');
    expect(sr11?.security_levels).toBeDefined();
    expect(sr11?.security_levels.length).toBeGreaterThan(0);
    expect(sr11?.security_levels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ security_level: 2 }),
        expect.objectContaining({ security_level: 3 }),
      ])
    );
  });
});
