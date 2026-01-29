#!/usr/bin/env node

import { DatabaseClient } from '../src/database/client.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface GuidanceMeta {
  title: string;
  version: string;
  published_date: string;
  url?: string;
  extraction_notes?: string;
}

interface GuidanceItem {
  id: string;
  section: string;
  title: string;
  description: string;
  ics_context: string;
  related_800_53_controls: string[];
}

interface GuidanceJson {
  meta: GuidanceMeta;
  guidance: GuidanceItem[];
}

interface ParsedGuidanceItem {
  requirement_id: string;
  title: string;
  description: string;
  rationale: string;
  related_controls: string[];
}

export class Nist80082Ingester {
  constructor(private db: DatabaseClient) {}

  /**
   * Validate the structure of the guidance JSON
   */
  validateGuidanceStructure(data: any): void {
    if (!data.meta || typeof data.meta.title !== 'string') {
      throw new Error('Invalid guidance JSON: missing or invalid meta.title');
    }

    if (!Array.isArray(data.guidance)) {
      throw new Error('Invalid guidance JSON: guidance must be an array');
    }

    for (const item of data.guidance) {
      if (!item.id || !item.title || !item.description) {
        throw new Error(`Invalid guidance item: missing required fields (id, title, description)`);
      }
    }
  }

  /**
   * Parse guidance JSON into database format
   */
  parseGuidance(data: GuidanceJson): ParsedGuidanceItem[] {
    const items: ParsedGuidanceItem[] = [];

    for (const item of data.guidance) {
      items.push({
        requirement_id: item.id,
        title: item.title,
        description: item.description,
        rationale: item.ics_context,
        related_controls: item.related_800_53_controls || [],
      });
    }

    console.log(`Parsed ${items.length} guidance items from JSON`);
    return items;
  }

  /**
   * Ingest guidance items into database
   */
  ingestGuidance(items: ParsedGuidanceItem[]): void {
    console.log(`Ingesting ${items.length} guidance items...`);

    for (const item of items) {
      // Insert guidance as requirement
      this.db.run(
        `
        INSERT OR REPLACE INTO ot_requirements (
          standard_id,
          requirement_id,
          title,
          description,
          rationale,
          component_type
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          'nist-800-82',
          item.requirement_id,
          item.title,
          item.description,
          item.rationale,
          'guidance',
        ]
      );

      // Create mappings to 800-53 controls
      for (const controlId of item.related_controls) {
        if (controlId === 'ALL_FAMILIES') continue; // Skip meta-control

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
            'nist-800-82',
            item.requirement_id,
            'nist-800-53',
            controlId,
            'related',
            0.9,
            'Guidance from NIST 800-82 for this control',
          ]
        );
      }
    }

    console.log(`Ingested ${items.length} guidance items`);
  }

  /**
   * Load and ingest all guidance
   */
  async ingestAll(): Promise<void> {
    console.log('Starting NIST 800-82 ingestion...\n');

    try {
      // Ensure standard exists
      this.db.run(
        `
        INSERT OR IGNORE INTO ot_standards (id, name, version, published_date, url, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          'nist-800-82',
          'NIST SP 800-82: Guide to Operational Technology Security',
          'Rev 3',
          '2023-11-01',
          'https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final',
          'current',
          'OT-specific security guidance and ICS overlay for NIST 800-53',
        ]
      );

      // Load guidance JSON
      const jsonPath = resolve('data/nist-80082-guidance.json');
      console.log(`Loading guidance from: ${jsonPath}`);

      const jsonContent = readFileSync(jsonPath, 'utf-8');
      const data: GuidanceJson = JSON.parse(jsonContent);

      // Validate structure
      this.validateGuidanceStructure(data);
      console.log(`Validated guidance JSON: ${data.meta.title}`);

      // Parse and ingest
      const items = this.parseGuidance(data);

      this.db.transaction(() => {
        this.ingestGuidance(items);
      });

      // Report
      const requirementCount = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
        ['nist-800-82']
      );

      const mappingCount = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM ot_mappings WHERE source_standard = ?',
        ['nist-800-82']
      );

      console.log('\n=== Ingestion Complete ===');
      console.log(`NIST 800-82 guidance items: ${requirementCount?.count || 0}`);
      console.log(`Mappings to NIST 800-53: ${mappingCount?.count || 0}`);
      console.log('==========================\n');
    } catch (error) {
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

  const ingester = new Nist80082Ingester(db);

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
