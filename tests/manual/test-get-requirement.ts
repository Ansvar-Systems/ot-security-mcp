#!/usr/bin/env node

/**
 * Manual test script for get_ot_requirement tool
 * This demonstrates the tool works with real data
 */

import { DatabaseClient } from '../../src/database/client.js';
import { getRequirement } from '../../src/tools/get-requirement.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

async function main() {
  const testDbPath = 'tests/data/manual-test-get-requirement.sqlite';

  // Clean up any existing test database
  if (existsSync(testDbPath)) {
    await unlink(testDbPath);
  }

  // Create database client
  const db = new DatabaseClient(testDbPath);

  console.log('Manual test for get_ot_requirement');
  console.log('=====================================\n');

  // Test 1: Empty database
  console.log('Test 1: Empty database (should return null)');
  const result1 = await getRequirement(db, {
    requirement_id: 'SR 1.1',
    standard: 'iec62443-3-3'
  });
  console.log('Result:', result1);
  console.log('Expected: null');
  console.log('Pass:', result1 === null ? '✓' : '✗');
  console.log();

  // Test 2: Insert data and retrieve
  console.log('Test 2: Insert data and retrieve requirement');

  // Insert standard
  db.run(
    `INSERT INTO ot_standards (id, name, version, status, published_date, url, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'iec62443-3-3',
      'IEC 62443-3-3',
      'v2.0',
      'current',
      '2023-01-01',
      'https://www.iec.ch/62443-3-3',
      'Industrial communication networks - Network and system security'
    ]
  );

  // Insert requirement
  const reqResult = db.run(
    `INSERT INTO ot_requirements (standard_id, requirement_id, parent_requirement_id, title, description, rationale, component_type, purdue_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'iec62443-3-3',
      'SR 1.1',
      'SR 1',
      'Human user identification and authentication',
      'The control system shall provide the capability to identify and authenticate all human users.',
      'Authentication is essential to ensure only authorized users can access the control system. This helps prevent unauthorized access and maintains accountability.',
      'host',
      3
    ]
  );

  // Insert security levels
  db.run(
    `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [reqResult.lastInsertRowid, 2, 'SL-T', 1, 'Target security level 2']
  );

  db.run(
    `INSERT INTO security_levels (requirement_db_id, security_level, sl_type, capability_level, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [reqResult.lastInsertRowid, 3, 'SL-C', 2, 'Capability security level 3']
  );

  // Insert another standard for mapping
  db.run(
    `INSERT INTO ot_standards (id, name, version, status)
     VALUES (?, ?, ?, ?)`,
    ['nist-800-82', 'NIST SP 800-82', 'r3', 'current']
  );

  // Insert mapping
  db.run(
    `INSERT INTO ot_mappings (source_standard, source_requirement, target_standard, target_requirement, mapping_type, confidence, notes, created_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'iec62443-3-3',
      'SR 1.1',
      'nist-800-82',
      'IA-2',
      'exact_match',
      1.0,
      'Direct mapping to NIST identification and authentication control',
      '2024-01-01'
    ]
  );

  const result2 = await getRequirement(db, {
    requirement_id: 'SR 1.1',
    standard: 'iec62443-3-3'
  });

  console.log('Result:');
  console.log(JSON.stringify(result2, null, 2));
  console.log();
  console.log('Validation:');
  console.log('  - Has requirement_id:', result2?.requirement_id === 'SR 1.1' ? '✓' : '✗');
  console.log('  - Has standard metadata:', result2?.standard?.name === 'IEC 62443-3-3' ? '✓' : '✗');
  console.log('  - Has security_levels:', result2?.security_levels?.length === 2 ? '✓' : '✗');
  console.log('  - Has mappings:', result2?.mappings?.length === 1 ? '✓' : '✗');
  console.log();

  // Test 3: Exclude mappings
  console.log('Test 3: Exclude mappings');
  const result3 = await getRequirement(db, {
    requirement_id: 'SR 1.1',
    standard: 'iec62443-3-3',
    options: { include_mappings: false }
  });

  console.log('Mappings count:', result3?.mappings?.length);
  console.log('Expected: 0');
  console.log('Pass:', result3?.mappings?.length === 0 ? '✓' : '✗');
  console.log();

  // Clean up
  db.close();
  if (existsSync(testDbPath)) {
    await unlink(testDbPath);
  }

  console.log('Manual tests completed!');
}

main().catch(console.error);
