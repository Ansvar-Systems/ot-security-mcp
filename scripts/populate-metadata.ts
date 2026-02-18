#!/usr/bin/env tsx
/**
 * Populate db_metadata table with schema version, tier, and data currency info.
 */
import { DatabaseClient } from '../src/database/client.js';
import { join } from 'path';
import { readFileSync } from 'fs';

const DB_PATH = process.argv[2] || join(process.cwd(), 'data', 'ot-security.db');
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

const db = new DatabaseClient(DB_PATH);

const entries: [string, string][] = [
  ['schema_version', pkg.version],
  ['tier', 'full'],
  ['jurisdiction', 'international'],
  ['build_date', new Date().toISOString()],
  ['node_version', process.version],
];

for (const [key, value] of entries) {
  db.run(
    `INSERT OR REPLACE INTO db_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
    [key, value]
  );
}

console.log('db_metadata populated:');
const rows = db.query<{ key: string; value: string }>(
  'SELECT key, value FROM db_metadata ORDER BY key'
);
for (const row of rows) {
  console.log(`  ${row.key}: ${row.value}`);
}

db.close();
