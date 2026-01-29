#!/usr/bin/env tsx
/**
 * NIST 800-53 Rev 5 OSCAL Ingestion Script
 *
 * Fetches and ingests NIST 800-53 Rev 5 security controls from the official OSCAL catalog.
 * Data is sourced from: https://github.com/usnistgov/oscal-content
 *
 * OSCAL Format:
 * - catalog → groups (control families) → controls
 * - Filters to 12 OT-relevant control families (~200 controls)
 * - Populates ot_requirements table
 */

import { DatabaseClient } from '../src/database/client.js';

const NIST_OSCAL_URL = 'https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json';

// OT-relevant control families (12 families)
const OT_RELEVANT_FAMILIES = [
  'AC',  // Access Control
  'AU',  // Audit and Accountability
  'CA',  // Assessment, Authorization, and Monitoring
  'CM',  // Configuration Management
  'CP',  // Contingency Planning
  'IA',  // Identification and Authentication
  'IR',  // Incident Response
  'MA',  // Maintenance
  'PE',  // Physical and Environmental Protection
  'SA',  // System and Services Acquisition
  'SC',  // System and Communications Protection
  'SI'   // System and Information Integrity
];

/**
 * OSCAL Catalog structure
 */
interface OscalCatalog {
  catalog: {
    metadata: {
      title: string;
      version: string;
      [key: string]: unknown;
    };
    groups: OscalGroup[];
  };
}

/**
 * OSCAL Control Group (family)
 */
interface OscalGroup {
  id: string;
  title: string;
  controls: OscalControl[];
}

/**
 * OSCAL Control
 */
interface OscalControl {
  id: string;
  title: string;
  props?: Array<{
    name: string;
    value: string;
    [key: string]: unknown;
  }>;
  parts?: Array<{
    id: string;
    name: string;
    prose?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Parsed NIST Control
 */
interface NistControl {
  control_id: string;
  title: string;
  description: string;
  family: string;
}

/**
 * NIST 800-53 OSCAL Ingester
 */
export class Nist80053Ingester {
  constructor(private db: DatabaseClient) {}

  /**
   * Fetch NIST 800-53 OSCAL catalog from GitHub with retry logic
   */
  async fetchOscalCatalog(): Promise<OscalCatalog> {
    console.log(`Fetching NIST 800-53 OSCAL catalog from: ${NIST_OSCAL_URL}`);

    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(NIST_OSCAL_URL);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as OscalCatalog;

        if (!data.catalog || !Array.isArray(data.catalog.groups)) {
          throw new Error('Invalid OSCAL catalog format');
        }

        console.log(`Fetched OSCAL catalog: ${data.catalog.metadata.title}`);
        return data;

      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (isLastAttempt) {
          throw new Error(`Failed to fetch NIST 800-53 data after ${maxRetries + 1} attempts: ${errorMessage}`);
        }

        const delay = retryDelays[attempt];
        console.warn(`Attempt ${attempt + 1} failed: ${errorMessage}. Retrying in ${delay}ms...`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // TypeScript requires this, but it's unreachable
    throw new Error('Unexpected error in fetchOscalCatalog');
  }

  /**
   * Extract description from OSCAL control parts
   * OSCAL stores control text across multiple nested parts
   */
  private extractDescription(control: any): string {
    const parts: string[] = [];

    // 1. Try statement prose first (control requirement)
    const statementPart = control.parts?.find((p: any) => p.name === 'statement');
    if (statementPart?.prose) {
      parts.push(statementPart.prose);
    }

    // 2. Try guidance prose (implementation guidance)
    const guidancePart = control.parts?.find((p: any) => p.name === 'guidance');
    if (guidancePart?.prose) {
      parts.push(guidancePart.prose);
    }

    // 3. If still empty, collect prose from all parts
    if (parts.length === 0 && control.parts) {
      for (const part of control.parts) {
        if (part.prose && typeof part.prose === 'string') {
          parts.push(part.prose);
        }
        // Also check nested parts
        if (part.parts) {
          for (const nestedPart of part.parts) {
            if (nestedPart.prose && typeof nestedPart.prose === 'string') {
              parts.push(nestedPart.prose);
            }
          }
        }
      }
    }

    // 4. Fallback to control title if no prose found
    if (parts.length === 0) {
      return `${control.title}. See NIST SP 800-53 Rev 5 for complete guidance.`;
    }

    // Join all collected parts, truncate if too long
    const description = parts.join(' ');
    return description.length > 2000
      ? description.substring(0, 2000) + '...'
      : description;
  }

  /**
   * Parse OSCAL catalog and extract controls
   */
  parseOscalCatalog(oscal: OscalCatalog): NistControl[] {
    const controls: NistControl[] = [];

    for (const group of oscal.catalog.groups) {
      const family = group.id.toUpperCase();

      for (const control of group.controls || []) {
        // Get control ID from props label (e.g., "AC-1")
        const labelProp = control.props?.find((p) => p.name === 'label');
        const controlId = labelProp?.value || control.id.toUpperCase();

        // Extract description using enhanced parsing
        const description = this.extractDescription(control);

        controls.push({
          control_id: controlId,
          title: control.title,
          description,
          family
        });
      }
    }

    console.log(`Parsed ${controls.length} controls from OSCAL catalog`);
    return controls;
  }

  /**
   * Filter controls to OT-relevant families
   */
  filterOtRelevantControls(controls: NistControl[]): NistControl[] {
    const filtered = controls.filter(c => OT_RELEVANT_FAMILIES.includes(c.family));
    console.log(`Filtered to ${filtered.length} OT-relevant controls from ${OT_RELEVANT_FAMILIES.length} families`);
    return filtered;
  }

  /**
   * Ingest controls into database
   */
  ingestControls(controls: NistControl[]): void {
    console.log(`Ingesting ${controls.length} controls...`);

    for (const control of controls) {
      this.db.run(
        `INSERT OR REPLACE INTO ot_requirements (
          standard_id,
          requirement_id,
          title,
          description,
          component_type
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          'nist-800-53',
          control.control_id,
          control.title,
          control.description,
          control.family.toLowerCase()
        ]
      );
    }

    console.log(`Ingested ${controls.length} controls`);
  }

  /**
   * Main ingestion workflow
   */
  async ingestAll(): Promise<void> {
    console.log('Starting NIST 800-53 Rev 5 ingestion...\n');
    const startTime = Date.now();

    try {
      // Ensure standard exists
      console.log('Ensuring NIST 800-53 standard exists...');
      this.db.run(
        `INSERT OR IGNORE INTO ot_standards (id, name, version, published_date, url, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'nist-800-53',
          'NIST SP 800-53: Security and Privacy Controls',
          'Rev 5',
          '2020-09-01',
          'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
          'current'
        ]
      );

      // Fetch and parse OSCAL catalog
      const oscal = await this.fetchOscalCatalog();
      const allControls = this.parseOscalCatalog(oscal);
      const otControls = this.filterOtRelevantControls(allControls);

      // Ingest in transaction for atomicity
      console.log('Ingesting controls in transaction...');
      this.db.transaction(() => {
        this.ingestControls(otControls);
      });

      // Report final counts
      const count = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
        ['nist-800-53']
      );

      console.log('\n=== Ingestion Complete ===');
      console.log(`NIST 800-53 controls ingested: ${count?.count || 0}`);
      console.log(`Control families included: ${OT_RELEVANT_FAMILIES.join(', ')}`);
      console.log('==========================\n');

      // Log ingestion to audit trail
      const duration = Date.now() - startTime;
      this.db.run(
        `INSERT INTO ingestion_log (operation, status, record_count, duration_ms, data_version, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'ingest:nist-80053',
          'success',
          count?.count || 0,
          duration,
          'NIST SP 800-53 Rev 5',
          `Control families: ${OT_RELEVANT_FAMILIES.join(', ')}`
        ]
      );

    } catch (error) {
      // Transaction automatically rolled back by better-sqlite3
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('\n=== Ingestion Failed ===');
      console.error(`Error: ${errorMessage}`);
      console.error('Database transaction has been rolled back to maintain consistency.');
      console.error('========================\n');

      // Log failure to audit trail
      const duration = Date.now() - startTime;
      try {
        this.db.run(
          `INSERT INTO ingestion_log (operation, status, record_count, duration_ms, data_version, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            'ingest:nist-80053',
            'failed',
            0,
            duration,
            'NIST SP 800-53 Rev 5',
            `Error: ${errorMessage}`
          ]
        );
      } catch (logError) {
        // Silently fail if logging fails
      }

      throw error; // Re-throw to signal failure to caller
    }
  }
}

/**
 * CLI execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.env.OT_MCP_DB_PATH || 'data/ot-security.db';
  const db = new DatabaseClient(dbPath);
  const ingester = new Nist80053Ingester(db);

  try {
    await ingester.ingestAll();
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Ingestion failed:', error);
    db.close();
    process.exit(1);
  }
}
