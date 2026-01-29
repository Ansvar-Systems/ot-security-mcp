#!/usr/bin/env tsx
/**
 * Setup Verification Script
 *
 * Checks if the database is properly configured and has required data.
 * Provides clear instructions if setup is incomplete.
 */

import { existsSync } from 'fs';
import { DatabaseClient } from '../src/database/client.js';

interface StandardCount {
  id: string;
  name: string;
  count: number;
}

async function verifySetup(): Promise<boolean> {
  console.log('🔍 Verifying OT Security MCP Server setup...\n');

  let allGood = true;

  // Check 1: Database file exists
  const dbPath = process.env.OT_MCP_DB_PATH || 'data/ot-security.db';
  console.log(`📁 Checking database file: ${dbPath}`);

  if (!existsSync(dbPath)) {
    console.log('❌ Database file not found!\n');
    console.log('📋 Required setup steps:');
    console.log('   1. npm run ingest:mitre       # MITRE ATT&CK for ICS');
    console.log('   2. npm run ingest:nist-80053  # NIST 800-53 Rev 5');
    console.log('   3. npm run ingest:nist-80082  # NIST 800-82 Rev 3');
    console.log('   4. npm run ingest:iec62443 <file>  # IEC 62443 (requires licensed data)\n');
    return false;
  }
  console.log('✅ Database file exists\n');

  // Check 2: Database has required tables
  const db = new DatabaseClient(dbPath);

  console.log('📊 Checking database schema...');
  const tables = db.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );

  const requiredTables = [
    'ot_standards',
    'ot_requirements',
    'mitre_ics_techniques',
    'mitre_ics_mitigations',
    'security_levels',
    'zones',
    'conduits'
  ];

  const tableNames = tables.map(t => t.name);
  const missingTables = requiredTables.filter(t => !tableNames.includes(t));

  if (missingTables.length > 0) {
    console.log(`❌ Missing tables: ${missingTables.join(', ')}\n`);
    console.log('Run: npm run build  # to create database schema\n');
    allGood = false;
  } else {
    console.log(`✅ All ${requiredTables.length} required tables present\n`);
  }

  // Check 3: Standards ingested
  console.log('📚 Checking ingested standards...');

  const standards = db.query<StandardCount>(`
    SELECT
      s.id,
      s.name,
      CASE
        WHEN s.id = 'mitre-ics' THEN (SELECT COUNT(*) FROM mitre_ics_techniques)
        ELSE (SELECT COUNT(*) FROM ot_requirements WHERE standard_id = s.id)
      END as count
    FROM ot_standards s
    ORDER BY s.id
  `);

  if (standards.length === 0) {
    console.log('❌ No standards found in database\n');
    console.log('📋 Run ingestion scripts (see above)\n');
    allGood = false;
  } else {
    console.log(`Found ${standards.length} standards:\n`);

    const expectedStandards = [
      { id: 'mitre-ics', minCount: 80, name: 'MITRE ATT&CK for ICS' },
      { id: 'nist-800-53', minCount: 200, name: 'NIST SP 800-53 Rev 5' },
      { id: 'nist-800-82', minCount: 5, name: 'NIST SP 800-82 Rev 3' }
    ];

    for (const standard of standards) {
      const expected = expectedStandards.find(e => e.id === standard.id);
      const status = expected && standard.count >= expected.minCount ? '✅' : '⚠️';
      console.log(`   ${status} ${standard.name}: ${standard.count} items`);

      if (expected && standard.count < expected.minCount) {
        console.log(`      Expected at least ${expected.minCount} items`);
        allGood = false;
      }
    }
    console.log();

    // Check for MITRE
    const hasMitre = standards.some(s => s.id === 'mitre-ics');
    if (!hasMitre) {
      console.log('⚠️  MITRE ATT&CK for ICS not ingested');
      console.log('    Run: npm run ingest:mitre\n');
      allGood = false;
    }

    // Check for NIST 800-53
    const hasNist80053 = standards.some(s => s.id === 'nist-800-53');
    if (!hasNist80053) {
      console.log('⚠️  NIST 800-53 not ingested');
      console.log('    Run: npm run ingest:nist-80053\n');
      allGood = false;
    }

    // Check for NIST 800-82
    const hasNist80082 = standards.some(s => s.id === 'nist-800-82');
    if (!hasNist80082) {
      console.log('⚠️  NIST 800-82 not ingested');
      console.log('    Run: npm run ingest:nist-80082\n');
      allGood = false;
    }
  }

  db.close();

  // Final verdict
  console.log('━'.repeat(60));
  if (allGood) {
    console.log('✅ Setup complete! Your OT Security MCP Server is ready.\n');
    console.log('Optional: Ingest IEC 62443 data (requires licensed standards)');
    console.log('   npm run ingest:iec62443 data/templates/iec62443-3-3-template.json\n');
    return true;
  } else {
    console.log('❌ Setup incomplete. Please follow the instructions above.\n');
    return false;
  }
}

// Run verification
verifySetup()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
