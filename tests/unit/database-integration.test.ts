/**
 * Integration test for database client with real-world scenario
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';

describe('DatabaseClient - Integration Test', () => {
  let db: DatabaseClient;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = createTestDbPath('db-integration');
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

  it('should handle a complete workflow: standards, requirements, security levels, and mappings', () => {
    // Insert a standard
    db.run(
      `INSERT INTO ot_standards (id, name, version, published_date, url, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'iec62443-3-3',
        'IEC 62443-3-3',
        'v2.0',
        '2023-01-01',
        'https://www.isa.org/standards/iec-62443',
        'current',
        'Security Level Requirements',
      ]
    );

    // Insert requirements with different security levels
    const sr11Result = db.run(
      `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type, purdue_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'iec62443-3-3',
        'SR 1.1',
        'Human user identification',
        'The control system shall provide the capability to identify and authenticate all human users.',
        'host',
        3,
      ]
    );

    const sr12Result = db.run(
      `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type, purdue_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'iec62443-3-3',
        'SR 1.2',
        'Software process and device identification',
        'The control system shall provide the capability to identify and authenticate all software processes and devices.',
        'embedded',
        2,
      ]
    );

    // Add security levels for each requirement
    db.run(
      `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, notes)
       VALUES (?, ?, ?, ?)`,
      [sr11Result.lastInsertRowid, 1, 'SL-T', 'Basic authentication required']
    );

    db.run(
      `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, notes)
       VALUES (?, ?, ?, ?)`,
      [sr11Result.lastInsertRowid, 2, 'SL-T', 'Multi-factor authentication for elevated privileges']
    );

    db.run(
      `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, notes)
       VALUES (?, ?, ?, ?)`,
      [sr12Result.lastInsertRowid, 2, 'SL-T', 'Device identification and authentication']
    );

    // Add a NIST standard and create cross-mapping
    db.run(
      `INSERT INTO ot_standards (id, name, version, status)
       VALUES (?, ?, ?, ?)`,
      ['nist-800-82', 'NIST SP 800-82', 'r3', 'current']
    );

    db.run(
      `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'iec62443-3-3',
        'SR 1.1',
        'nist-800-82',
        'IA-2',
        'exact_match',
        0.95,
        'Both address user identification and authentication',
      ]
    );

    // Add MITRE ATT&CK data
    db.run(
      `INSERT INTO mitre_ics_techniques (technique_id, tactic, name, description, platforms, data_sources)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'T0800',
        'Initial Access',
        'Exploit Public-Facing Application',
        'Adversaries may attempt to exploit weaknesses in Internet-facing applications.',
        '["Windows", "Linux"]',
        '["Application logs", "Network traffic"]',
      ]
    );

    db.run(
      `INSERT INTO mitre_ics_mitigations (mitigation_id, name, description)
       VALUES (?, ?, ?)`,
      [
        'M0800',
        'Application Isolation and Sandboxing',
        'Restrict execution to isolated environments',
      ]
    );

    db.run(
      `INSERT INTO mitre_technique_mitigations (technique_id, mitigation_id, ot_requirement_id)
       VALUES (?, ?, ?)`,
      ['T0800', 'M0800', 'SR 1.1']
    );

    // Add zone and conduit guidance
    db.run(
      `INSERT INTO zones_conduits (zone_name, purdue_level, security_level_target, conduit_type, guidance_text, iec_reference)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'DMZ Zone',
        3,
        2,
        'Firewall',
        'Use application-level firewall between enterprise and control systems',
        'IEC 62443-3-2',
      ]
    );

    // Add sector applicability
    db.run(
      `INSERT INTO sector_applicability (sector, jurisdiction, standard, applicability, threshold, regulatory_driver, effective_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'Energy',
        'EU',
        'IEC 62443-3-3',
        'mandatory',
        'High impact entities',
        'NIS2 Directive',
        '2024-10-17',
      ]
    );

    // Now query the data to verify the workflow
    const standards = db.query<{ id: string; name: string }>(
      'SELECT id, name FROM ot_standards ORDER BY id'
    );
    expect(standards).toHaveLength(2);
    expect(standards[0]?.id).toBe('iec62443-3-3');
    expect(standards[1]?.id).toBe('nist-800-82');

    const requirements = db.query<{ requirement_id: string; title: string }>(
      'SELECT requirement_id, title FROM ot_requirements WHERE standard_id = ? ORDER BY requirement_id',
      ['iec62443-3-3']
    );
    expect(requirements).toHaveLength(2);
    expect(requirements[0]?.requirement_id).toBe('SR 1.1');
    expect(requirements[1]?.requirement_id).toBe('SR 1.2');

    const securityLevels = db.query<{ security_level: number; sl_type: string }>(
      'SELECT security_level, sl_type FROM security_levels ORDER BY id'
    );
    expect(securityLevels).toHaveLength(3);

    const mappings = db.query<{
      source_requirement: string;
      target_requirement: string;
      confidence: number;
    }>('SELECT source_requirement, target_requirement, confidence FROM ot_mappings');
    expect(mappings).toHaveLength(1);
    expect(mappings[0]?.source_requirement).toBe('SR 1.1');
    expect(mappings[0]?.target_requirement).toBe('IA-2');
    expect(mappings[0]?.confidence).toBe(0.95);

    const techniques = db.query<{ technique_id: string; name: string }>(
      'SELECT technique_id, name FROM mitre_ics_techniques'
    );
    expect(techniques).toHaveLength(1);
    expect(techniques[0]?.technique_id).toBe('T0800');

    const zones = db.query<{ zone_name: string; purdue_level: number }>(
      'SELECT zone_name, purdue_level FROM zones_conduits'
    );
    expect(zones).toHaveLength(1);
    expect(zones[0]?.zone_name).toBe('DMZ Zone');

    const sectors = db.query<{ sector: string; jurisdiction: string }>(
      'SELECT sector, jurisdiction FROM sector_applicability'
    );
    expect(sectors).toHaveLength(1);
    expect(sectors[0]?.sector).toBe('Energy');
  });

  it('should support complex queries across multiple tables', () => {
    // Set up test data
    db.run(
      `INSERT INTO ot_standards (id, name, version, status)
       VALUES (?, ?, ?, ?)`,
      ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
    );

    const reqResult = db.run(
      `INSERT INTO ot_requirements (standard_id, requirement_id, title, component_type, purdue_level)
       VALUES (?, ?, ?, ?, ?)`,
      ['iec62443-3-3', 'SR 1.1', 'Human user identification', 'host', 3]
    );

    db.run(
      `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
       VALUES (?, ?, ?)`,
      [reqResult.lastInsertRowid, 2, 'SL-T']
    );

    // Complex join query
    const results = db.query<{
      requirement_id: string;
      title: string;
      security_level: number;
      standard_name: string;
    }>(
      `SELECT r.requirement_id, r.title, sl.security_level, s.name as standard_name
       FROM ot_requirements r
       JOIN security_levels sl ON sl.requirement_db_id = r.id
       JOIN ot_standards s ON s.id = r.standard_id
       WHERE r.component_type = ?`,
      ['host']
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.requirement_id).toBe('SR 1.1');
    expect(results[0]?.security_level).toBe(2);
    expect(results[0]?.standard_name).toBe('IEC 62443-3-3');
  });
});
