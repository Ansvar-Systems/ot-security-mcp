#!/usr/bin/env tsx
import { DatabaseClient } from './src/database/client.js';
import { searchRequirements } from './src/tools/search.js';
import { getMitreTechnique } from './src/tools/get-mitre-technique.js';
import { mapSecurityLevelRequirements } from './src/tools/map-security-level-requirements.js';

async function testToughQueries() {
  const db = new DatabaseClient('data/ot-security.db');

  console.log('=== TESTING TOUGH REAL-WORLD QUERIES ===\n');

  // Test 1: Cross-standard authentication query
  console.log('Q1: What are authentication requirements across ALL standards?');
  const authResults = await searchRequirements(db, {
    query: 'authentication',
    options: { limit: 10 }
  });
  console.log(`  ✓ Found ${authResults.length} results across ${new Set(authResults.map(r => r.standard_id)).size} standards`);
  authResults.slice(0, 3).forEach(r => {
    console.log(`    - [${r.standard_id}] ${r.requirement_id}: ${r.title?.substring(0, 60)}...`);
  });

  // Test 2: IEC 62443 Security Level 3 requirements
  console.log(`\nQ2: How many IEC 62443 requirements apply to Security Level 3?`);
  const sl3Requirements = await mapSecurityLevelRequirements(db, {
    security_level: 3,
    include_enhancements: true
  });
  console.log(`  ✓ Found ${sl3Requirements.length} requirements for SL-3`);
  if (sl3Requirements.length > 0) {
    console.log(`    Sample: ${sl3Requirements[0].requirement_id} - ${sl3Requirements[0].title?.substring(0, 50)}...`);
  }

  // Test 3: NIST 800-82 to 800-53 mappings
  console.log(`\nQ3: NIST 800-82 guidance mapped to NIST 800-53 controls?`);
  const mappings = db.query<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM ot_mappings
    WHERE source_standard = 'nist-800-82' AND target_standard = 'nist-800-53'
  `);
  console.log(`  ✓ Found ${mappings[0].count} NIST 800-82 → 800-53 mappings`);

  // Test 4: MITRE PLC attack techniques
  console.log(`\nQ4: What MITRE ATT&CK techniques target PLCs?`);
  const plcTechnique = await getMitreTechnique(db, {
    technique_id: 'T0800',
    options: { include_mitigations: true }
  });
  if (plcTechnique) {
    console.log(`  ✓ Found T0800: ${plcTechnique.name}`);
    console.log(`    Platforms: ${plcTechnique.platforms?.join(', ')}`);
    console.log(`    Mitigations: ${plcTechnique.mitigations?.length || 0}`);
  }

  // Test 5: Network segmentation guidance
  console.log(`\nQ5: Search for network segmentation guidance`);
  const segmentResults = await searchRequirements(db, {
    query: 'network segmentation firewall',
    options: { limit: 5 }
  });
  console.log(`  ✓ Found ${segmentResults.length} results`);
  segmentResults.slice(0, 2).forEach(r => {
    console.log(`    - [${r.standard_id}] ${r.requirement_id}: ${r.title?.substring(0, 60)}...`);
  });

  // Test 6: Check data completeness
  console.log(`\n=== DATA COMPLETENESS ===`);
  const standards = db.query<{ id: string; name: string }>('SELECT id, name FROM ot_standards');
  for (const std of standards) {
    const count = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
      [std.id]
    );

    if (std.id === 'mitre-ics') {
      const techCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_techniques');
      console.log(`  ${std.name}: ${techCount?.count || 0} techniques`);
    } else {
      console.log(`  ${std.name}: ${count?.count || 0} requirements`);
    }
  }

  db.close();
  console.log('\n✓ All queries completed successfully');
}

testToughQueries().catch(console.error);
