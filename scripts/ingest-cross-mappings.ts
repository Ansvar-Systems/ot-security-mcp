#!/usr/bin/env node

import { DatabaseClient } from '../src/database/client.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// --- MITRE <-> NIST 800-53 types ---
//
// Note: The IEC 62443 <-> NIST 800-53 mapping half was removed 2026-05-14 along
// with the iec-62443 source — ISA/IEC 62443 standards forbid bulk redistribution,
// so even publicly-known requirement IDs were pruned out of an abundance of
// caution. See sources.yml header for context.

interface MitreNistMeta {
  title: string;
  description: string;
  version: string;
  created_date: string;
  sources: string[];
  confidence_basis: string;
}

interface MitreMitigationMapping {
  mitigation_id: string;
  nist_controls: string[];
  notes: string;
}

interface MitreNistJson {
  meta: MitreNistMeta;
  mitigation_mappings: MitreMitigationMapping[];
}

export class CrossMappingsIngester {
  constructor(private db: DatabaseClient) {}

  /**
   * Validate MITRE-NIST linkage JSON structure
   */
  validateMitreNistStructure(data: any): void {
    if (!data.meta || typeof data.meta.title !== 'string') {
      throw new Error('Invalid MITRE-NIST JSON: missing or invalid meta.title');
    }

    if (!Array.isArray(data.mitigation_mappings)) {
      throw new Error('Invalid MITRE-NIST JSON: mitigation_mappings must be an array');
    }

    for (const mapping of data.mitigation_mappings) {
      if (!mapping.mitigation_id || !Array.isArray(mapping.nist_controls)) {
        throw new Error(
          `Invalid mitigation mapping: missing required fields (mitigation_id, nist_controls)`
        );
      }

      if (mapping.nist_controls.length === 0) {
        throw new Error(
          `Invalid mitigation mapping for ${mapping.mitigation_id}: nist_controls must have at least one entry`
        );
      }
    }
  }

  /**
   * Ingest MITRE <-> NIST 800-53 linkages
   * 1. Insert into ot_mappings (source: mitre-ics, target: nist-800-53)
   * 2. Update mitre_technique_mitigations.ot_requirement_id with primary NIST control
   */
  ingestMitreMappings(data: MitreNistJson): { mappings: number; linkages: number } {
    console.log(`Ingesting ${data.mitigation_mappings.length} MITRE-NIST mitigation mappings...`);

    // Clean up existing MITRE-sourced mappings for idempotent re-runs
    const deleted = this.db.run(
      `DELETE FROM ot_mappings WHERE source_standard = 'mitre-ics' AND target_standard = 'nist-800-53'`
    );
    if (deleted.changes > 0) {
      console.log(`  Cleaned ${deleted.changes} existing MITRE-NIST mappings`);
    }

    // Reset ot_requirement_id linkages so they can be re-populated
    this.db.run(
      `UPDATE mitre_technique_mitigations SET ot_requirement_id = NULL WHERE ot_requirement_id IS NOT NULL`
    );

    let mappingsInserted = 0;
    let linkagesUpdated = 0;

    for (const mapping of data.mitigation_mappings) {
      // Insert all NIST control mappings for this mitigation
      for (const nistControl of mapping.nist_controls) {
        this.db.run(
          `
          INSERT OR REPLACE INTO ot_mappings (
            source_standard,
            source_requirement,
            target_standard,
            target_requirement,
            mapping_type,
            confidence,
            notes,
            created_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
          [
            'mitre-ics',
            mapping.mitigation_id,
            'nist-800-53',
            nistControl,
            'related',
            0.8,
            mapping.notes,
          ]
        );
        mappingsInserted++;
      }

      // Update the junction table with the primary NIST control (first in list)
      const primaryControl = mapping.nist_controls[0];
      const result = this.db.run(
        `
        UPDATE mitre_technique_mitigations
        SET ot_requirement_id = ?
        WHERE mitigation_id = ? AND ot_requirement_id IS NULL
      `,
        [primaryControl, mapping.mitigation_id]
      );
      linkagesUpdated += result.changes;
    }

    console.log(`Ingested ${mappingsInserted} MITRE-NIST mappings`);
    console.log(`Updated ${linkagesUpdated} technique-mitigation linkages with NIST controls`);
    return { mappings: mappingsInserted, linkages: linkagesUpdated };
  }

  /**
   * Load and ingest all cross-standard mappings
   */
  async ingestAll(): Promise<void> {
    console.log('Starting cross-standard mappings ingestion...\n');
    const startTime = Date.now();

    try {
      // --- MITRE <-> NIST 800-53 ---
      const mitreNistPath = resolve('data/mappings/mitre-nist80053-linkages.json');
      console.log(`Loading MITRE-NIST linkages from: ${mitreNistPath}`);

      const mitreNistContent = readFileSync(mitreNistPath, 'utf-8');
      const mitreNistData: MitreNistJson = JSON.parse(mitreNistContent);

      this.validateMitreNistStructure(mitreNistData);
      console.log(`Validated MITRE-NIST JSON: ${mitreNistData.meta.title}`);

      let mitreResult = { mappings: 0, linkages: 0 };
      this.db.transaction(() => {
        mitreResult = this.ingestMitreMappings(mitreNistData);
      });

      // Log ingestion
      const duration = Date.now() - startTime;

      this.db.run(
        `
        INSERT INTO ingestion_log (operation, status, record_count, duration_ms, notes, data_version)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          'ingest:cross-mappings',
          'success',
          mitreResult.mappings,
          duration,
          `MITRE-NIST: ${mitreResult.mappings}, MITRE linkages: ${mitreResult.linkages}`,
          'v1.0',
        ]
      );

      // Report
      const totalMappingCount = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM ot_mappings'
      );

      const mitreLinkageCount = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM mitre_technique_mitigations WHERE ot_requirement_id IS NOT NULL'
      );

      console.log('\n=== Ingestion Complete ===');
      console.log(`MITRE ICS → NIST 800-53 mappings: ${mitreResult.mappings}`);
      console.log(`MITRE technique-mitigation linkages updated: ${mitreResult.linkages}`);
      console.log(`Total mappings in database: ${totalMappingCount?.count || 0}`);
      console.log(`MITRE records with NIST linkage: ${mitreLinkageCount?.count || 0}`);
      console.log(`Duration: ${duration}ms`);
      console.log('==========================\n');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.db.run(
        `
        INSERT INTO ingestion_log (operation, status, record_count, duration_ms, notes)
        VALUES (?, ?, ?, ?, ?)
      `,
        ['ingest:cross-mappings', 'failed', 0, duration, String(error)]
      );

      console.error('\n=== Ingestion Failed ===');
      console.error('Error:', error);
      throw error;
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.env.OT_MCP_DB_PATH || 'data/ot-security.db';
  const db = new DatabaseClient(dbPath);

  const ingester = new CrossMappingsIngester(db);

  ingester
    .ingestAll()
    .then(() => {
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      db.close();
      process.exit(1);
    });
}
