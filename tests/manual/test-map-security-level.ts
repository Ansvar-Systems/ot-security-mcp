/**
 * Manual test for map_security_level_requirements with real database
 * Run with: npm run build && node --loader tsx tests/manual/test-map-security-level.ts
 */

import { DatabaseClient } from '../../src/database/client.js';
import { mapSecurityLevelRequirements } from '../../src/tools/map-security-level-requirements.js';

const db = new DatabaseClient('data/ot-security.db');

console.log('Testing map_security_level_requirements tool with real data...\n');

// Test 1: Get all SL-2 requirements
console.log('Test 1: SL-2 requirements');
const sl2 = await mapSecurityLevelRequirements(db, { security_level: 2 });
console.log(`Found ${sl2.length} requirements for SL-2`);
if (sl2.length > 0) {
  console.log('Sample:', sl2[0].requirement_id, '-', sl2[0].title);
  console.log(
    'Security levels:',
    sl2[0].security_levels.map((l) => `SL-${l.security_level}`).join(', ')
  );
}
console.log();

// Test 2: Get SL-3 requirements for host components
console.log('Test 2: SL-3 requirements for host components');
const sl3host = await mapSecurityLevelRequirements(db, {
  security_level: 3,
  component_type: 'host',
});
console.log(`Found ${sl3host.length} requirements for SL-3 host components`);
if (sl3host.length > 0) {
  console.log('Sample:', sl3host[0].requirement_id, '-', sl3host[0].title);
}
console.log();

// Test 3: Get SL-4 requirements excluding enhancements
console.log('Test 3: SL-4 requirements (excluding enhancements)');
const sl4base = await mapSecurityLevelRequirements(db, {
  security_level: 4,
  include_enhancements: false,
});
console.log(`Found ${sl4base.length} base requirements for SL-4`);
console.log();

// Test 4: Get SL-4 requirements including enhancements
console.log('Test 4: SL-4 requirements (including enhancements)');
const sl4all = await mapSecurityLevelRequirements(db, {
  security_level: 4,
  include_enhancements: true,
});
console.log(`Found ${sl4all.length} requirements for SL-4 (with enhancements)`);
if (sl4all.length > 0) {
  const re = sl4all.find((r) => r.parent_requirement_id);
  if (re) {
    console.log('Sample enhancement:', re.requirement_id, '-', re.title);
    console.log('  Parent:', re.parent_requirement_id);
  }
}
console.log();

// Test 5: Verify security levels are included
console.log('Test 5: Verify security levels are returned');
if (sl2.length > 0) {
  const req = sl2[0];
  console.log(
    `Requirement ${req.requirement_id} has ${req.security_levels.length} security levels:`
  );
  req.security_levels.forEach((sl) => {
    console.log(`  - SL-${sl.security_level} (${sl.sl_type}), CL-${sl.capability_level}`);
  });
}

db.close();
console.log('\nAll manual tests completed successfully!');
