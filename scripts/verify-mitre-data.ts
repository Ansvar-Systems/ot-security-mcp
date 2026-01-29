#!/usr/bin/env tsx
/**
 * Verification script for MITRE ATT&CK ICS data
 */

import { DatabaseClient } from '../src/database/client.js';

const db = new DatabaseClient();

console.log('\n=== MITRE ATT&CK ICS Data Verification ===\n');

// Count totals
const techniqueCount =
  db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_techniques')?.count || 0;

const mitigationCount =
  db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_mitigations')?.count || 0;

const relationshipCount =
  db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_technique_mitigations')
    ?.count || 0;

console.log(`Total Techniques: ${techniqueCount}`);
console.log(`Total Mitigations: ${mitigationCount}`);
console.log(`Total Relationships: ${relationshipCount}`);

// Sample a few techniques
console.log('\n=== Sample Techniques ===');
const techniques = db.query('SELECT * FROM mitre_ics_techniques LIMIT 3');
techniques.forEach((t: any) => {
  console.log(`\nTechnique: ${t.technique_id} - ${t.name}`);
  console.log(`Tactic: ${t.tactic}`);
  console.log(`Platforms: ${t.platforms}`);
  console.log(`Data Sources: ${t.data_sources}`);
});

// Sample a mitigation
console.log('\n=== Sample Mitigations ===');
const mitigations = db.query('SELECT * FROM mitre_ics_mitigations LIMIT 2');
mitigations.forEach((m: any) => {
  console.log(`\nMitigation: ${m.mitigation_id} - ${m.name}`);
  console.log(`Description: ${m.description?.substring(0, 100)}...`);
});

// Sample relationships
console.log('\n=== Sample Relationships ===');
const relationships = db.query(`
  SELECT
    tm.technique_id,
    t.name as technique_name,
    tm.mitigation_id,
    m.name as mitigation_name
  FROM mitre_technique_mitigations tm
  JOIN mitre_ics_techniques t ON tm.technique_id = t.technique_id
  JOIN mitre_ics_mitigations m ON tm.mitigation_id = m.mitigation_id
  LIMIT 5
`);

relationships.forEach((r: any) => {
  console.log(`\n${r.technique_id} (${r.technique_name})`);
  console.log(`  → mitigated by ${r.mitigation_id} (${r.mitigation_name})`);
});

console.log('\n=== Verification Complete ===\n');

db.close();
