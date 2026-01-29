#!/usr/bin/env tsx
import { DatabaseClient } from './src/database/client.js';
import { searchRequirements } from './src/tools/search.js';

async function verifyProductionReadiness() {
  const db = new DatabaseClient('data/ot-security.db');

  console.log('=== PRODUCTION READINESS VERIFICATION ===\n');

  let passCount = 0;
  let failCount = 0;

  // Test 1: Simple single-word search
  console.log('TEST 1: Search for "segmentation"');
  const test1 = await searchRequirements(db, {
    query: 'segmentation',
    options: { limit: 5 }
  });
  if (test1.length > 0) {
    console.log(`  ✓ PASS - Found ${test1.length} results`);
    test1.slice(0, 2).forEach(r => console.log(`    ${r.requirement_id}: ${r.title}`));
    passCount++;
  } else {
    console.log('  ✗ FAIL - No results found');
    failCount++;
  }

  // Test 2: IEC 62443 search
  console.log('\nTEST 2: Search IEC 62443 for "authentication"');
  const test2 = await searchRequirements(db, {
    query: 'authentication',
    options: { standards: ['iec62443-3-3', 'iec62443-4-2'], limit: 5 }
  });
  if (test2.length > 0) {
    console.log(`  ✓ PASS - Found ${test2.length} IEC requirements`);
    passCount++;
  } else {
    console.log('  ✗ FAIL - No IEC authentication requirements found');
    failCount++;
  }

  // Test 3: NIST 800-53 coverage
  console.log('\nTEST 3: NIST 800-53 control family coverage');
  const families = ['AC', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'PE', 'SA', 'SC', 'SI'];
  let missingFamilies = [];
  for (const family of families) {
    const count = db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ot_requirements
       WHERE standard_id = 'nist-800-53' AND component_type = ?`,
      [family.toLowerCase()]
    );
    if (!count || count.count === 0) {
      missingFamilies.push(family);
    }
  }
  if (missingFamilies.length === 0) {
    console.log(`  ✓ PASS - All 12 OT-relevant families present`);
    passCount++;
  } else {
    console.log(`  ✗ FAIL - Missing families: ${missingFamilies.join(', ')}`);
    failCount++;
  }

  // Test 4: Cross-standard mappings
  console.log('\nTEST 4: NIST 800-82 → 800-53 mappings exist');
  const mappings = db.queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM ot_mappings
     WHERE source_standard = 'nist-800-82' AND target_standard = 'nist-800-53'`
  );
  if (mappings && mappings.count > 10) {
    console.log(`  ✓ PASS - ${mappings.count} mappings found`);
    passCount++;
  } else {
    console.log(`  ✗ FAIL - Only ${mappings?.count || 0} mappings (expected >10)`);
    failCount++;
  }

  // Test 5: MITRE data completeness
  console.log('\nTEST 5: MITRE ATT&CK ICS data');
  const techniques = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_techniques');
  const mitigations = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_mitigations');
  if (techniques && techniques.count >= 80 && mitigations && mitigations.count >= 50) {
    console.log(`  ✓ PASS - ${techniques.count} techniques, ${mitigations.count} mitigations`);
    passCount++;
  } else {
    console.log(`  ✗ FAIL - Insufficient data: ${techniques?.count} techniques, ${mitigations?.count} mitigations`);
    failCount++;
  }

  // Data completeness summary
  console.log('\n=== DATA COMPLETENESS SUMMARY ===');
  const standards = [
    { id: 'iec62443-3-3', name: 'IEC 62443-3-3', expected: 'SAMPLE (2)', critical: false },
    { id: 'iec62443-4-2', name: 'IEC 62443-4-2', expected: 'SAMPLE (2)', critical: false },
    { id: 'nist-800-53', name: 'NIST 800-53', expected: '200+', critical: true },
    { id: 'nist-800-82', name: 'NIST 800-82', expected: '5-10', critical: true },
  ];

  for (const std of standards) {
    const count = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
      [std.id]
    );
    const status = std.critical ? (count && count.count > 0 ? '✓' : '✗') : 'ℹ';
    console.log(`  ${status} ${std.name}: ${count?.count || 0} (expected: ${std.expected})`);
  }

  const mitreCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_techniques');
  console.log(`  ✓ MITRE ATT&CK ICS: ${mitreCount?.count || 0} techniques (expected: 80+)`);

  // Final verdict
  console.log('\n=== FINAL VERDICT ===');
  console.log(`Tests Passed: ${passCount}/5`);
  console.log(`Tests Failed: ${failCount}/5`);

  if (failCount === 0) {
    console.log('\n✅ PRODUCTION READY - All critical tests passing');
  } else {
    console.log('\n⚠️  NOT PRODUCTION READY - Some tests failing');
    console.log('Note: IEC 62443 sample data is expected (requires licensed content)');
  }

  db.close();
}

verifyProductionReadiness().catch(console.error);
