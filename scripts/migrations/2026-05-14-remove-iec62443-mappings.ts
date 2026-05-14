#!/usr/bin/env node

/**
 * Migration 2026-05-14: Remove IEC 62443 + ISA-95 derived rows.
 *
 * Context: sources.yml previously declared the IEC 62443 source with the note
 * "ISA/IEC Copyright - requires license" — an explicit self-acknowledgment that
 * the upstream forbids bulk redistribution. ISA-95 (Purdue Enterprise Reference
 * Architecture) shipped via the same isa.org channel. Both fail the Ansvar
 * 100%-commercial-use-legal floor and ADR-030 GREEN posture.
 *
 * This migration removes any DB rows that carry IEC 62443 lineage:
 *   - ot_mappings rows where source_standard LIKE 'iec62443%'   (102 rows)
 *   - ot_standards rows with id LIKE 'iec62443%'                (0 rows on canonical DB)
 *   - ot_requirements rows where standard_id LIKE 'iec62443%'   (0 rows on canonical DB)
 *   - security_levels rows joining the above                    (cascade)
 *   - zones / conduits / zone_conduit_flows rows                (0 rows on canonical DB)
 *   - reference_architectures rows                              (0 rows on canonical DB)
 *
 * Idempotent — safe to run repeatedly.
 *
 * Companion arch-docs commit transitions ot-security-mcp's at-risk-mcps.yml
 * entry to recovery.stage=in-review.
 */

import { DatabaseClient } from '../../src/database/client.js';

const TABLES_TO_CLEAN: Array<{ sql: string; description: string }> = [
  {
    sql: `DELETE FROM ot_mappings WHERE source_standard LIKE 'iec62443%' OR target_standard LIKE 'iec62443%'`,
    description: 'ot_mappings (IEC 62443 source or target)',
  },
  {
    sql: `DELETE FROM security_levels WHERE requirement_db_id IN (SELECT id FROM ot_requirements WHERE standard_id LIKE 'iec62443%')`,
    description: 'security_levels (FK to IEC 62443 requirements)',
  },
  {
    sql: `DELETE FROM ot_requirements WHERE standard_id LIKE 'iec62443%'`,
    description: 'ot_requirements (IEC 62443)',
  },
  {
    sql: `DELETE FROM ot_standards WHERE id LIKE 'iec62443%'`,
    description: 'ot_standards (IEC 62443)',
  },
  {
    sql: `DELETE FROM zone_conduit_flows`,
    description: 'zone_conduit_flows (ISA-95/Purdue derived)',
  },
  {
    sql: `DELETE FROM zones_conduits`,
    description: 'zones_conduits (ISA-95/Purdue derived)',
  },
  {
    sql: `DELETE FROM zones`,
    description: 'zones (ISA-95/Purdue derived)',
  },
  {
    sql: `DELETE FROM conduits`,
    description: 'conduits (ISA-95/Purdue derived)',
  },
  {
    sql: `DELETE FROM reference_architectures`,
    description: 'reference_architectures (Purdue Model)',
  },
];

async function main(): Promise<void> {
  const dbPath = process.env.OT_MCP_DB_PATH || 'data/ot-security.db';
  const db = new DatabaseClient(dbPath);
  const startTime = Date.now();

  console.log(`Running migration 2026-05-14-remove-iec62443-mappings against ${dbPath}\n`);

  let totalDeleted = 0;
  const details: string[] = [];

  db.transaction(() => {
    for (const step of TABLES_TO_CLEAN) {
      const result = db.run(step.sql);
      const changes = result.changes ?? 0;
      totalDeleted += changes;
      console.log(`  ${step.description}: ${changes} row(s) deleted`);
      details.push(`${step.description}=${changes}`);
    }
  });

  const duration = Date.now() - startTime;

  db.run(
    `
    INSERT INTO ingestion_log (operation, status, record_count, duration_ms, notes, data_version)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      'migrate:remove-iec-2026-05-14',
      'success',
      totalDeleted,
      duration,
      details.join(', '),
      '2026-05-14',
    ]
  );

  console.log(`\n=== Migration Complete ===`);
  console.log(`Total rows deleted: ${totalDeleted}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`==========================\n`);

  db.close();
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
