#!/usr/bin/env tsx
/**
 * Generate golden hashes for drift detection.
 * Hashes key database tables to detect when upstream data changes.
 */

import { createHash } from 'crypto';
import { DatabaseClient } from '../src/database/client.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = process.argv[2] || join(process.cwd(), 'data', 'ot-security.db');
const OUTPUT_PATH = join(process.cwd(), 'fixtures', 'golden-hashes.json');

function hashRows(rows: unknown[]): string {
  const content = JSON.stringify(rows, null, 0);
  return createHash('sha256').update(content).digest('hex');
}

const db = new DatabaseClient(DB_PATH);

const hashes: Record<string, { hash: string; row_count: number; description: string }> = {};

// NIST 800-53 controls
const nist53 = db.query(
  `SELECT requirement_id, title FROM ot_requirements WHERE standard_id = 'nist-800-53' ORDER BY requirement_id`
);
hashes['nist-800-53-requirements'] = {
  hash: hashRows(nist53),
  row_count: nist53.length,
  description: 'NIST 800-53 Rev 5 OT-relevant controls',
};

// MITRE ICS techniques
const mitre = db.query(
  `SELECT technique_id, name, tactic FROM mitre_ics_techniques ORDER BY technique_id`
);
hashes['mitre-ics-techniques'] = {
  hash: hashRows(mitre),
  row_count: mitre.length,
  description: 'MITRE ATT&CK for ICS techniques',
};

// MITRE mitigations
const mitigations = db.query(
  `SELECT mitigation_id, name FROM mitre_ics_mitigations ORDER BY mitigation_id`
);
hashes['mitre-ics-mitigations'] = {
  hash: hashRows(mitigations),
  row_count: mitigations.length,
  description: 'MITRE ATT&CK for ICS mitigations',
};

// Cross-standard mappings
const mappings = db.query(
  `SELECT source_standard, source_requirement, target_standard, target_requirement FROM ot_mappings ORDER BY source_standard, source_requirement`
);
hashes['cross-standard-mappings'] = {
  hash: hashRows(mappings),
  row_count: mappings.length,
  description: 'Cross-standard mappings (IEC<>NIST, MITRE<>NIST)',
};

// Standards registry
const standards = db.query(`SELECT id, name, version FROM ot_standards ORDER BY id`);
hashes['ot-standards'] = {
  hash: hashRows(standards),
  row_count: standards.length,
  description: 'OT standards registry',
};

const output = {
  generated: new Date().toISOString(),
  database: DB_PATH,
  description: 'Golden hashes for drift detection. Regenerate after intentional data updates.',
  hashes,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
console.log(`Golden hashes written to ${OUTPUT_PATH}`);
console.log(`Tables hashed: ${Object.keys(hashes).length}`);
for (const [key, val] of Object.entries(hashes)) {
  console.log(`  ${key}: ${val.row_count} rows -> ${val.hash.slice(0, 16)}...`);
}

db.close();
