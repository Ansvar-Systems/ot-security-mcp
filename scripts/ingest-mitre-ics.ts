#!/usr/bin/env tsx
/**
 * MITRE ATT&CK for ICS Ingestion Script
 *
 * Fetches and ingests MITRE ATT&CK for ICS data from the official STIX 2.0 repository.
 * Data is sourced from: https://github.com/mitre-attack/attack-stix-data
 *
 * STIX Object Types processed:
 * - attack-pattern → mitre_ics_techniques
 * - course-of-action → mitre_ics_mitigations
 * - relationship (type: "mitigates") → mitre_technique_mitigations
 */

import { DatabaseClient } from '../src/database/client.js';

const MITRE_ICS_STIX_URL =
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/ics-attack/ics-attack.json';

/**
 * STIX 2.0 Bundle structure
 */
interface StixBundle {
  type: 'bundle';
  id: string;
  objects: StixObject[];
}

/**
 * Base STIX object
 */
interface StixObject {
  type: string;
  id: string;
  created?: string;
  modified?: string;
  [key: string]: unknown;
}

/**
 * STIX Attack Pattern (maps to MITRE Technique)
 */
interface StixAttackPattern extends StixObject {
  type: 'attack-pattern';
  name: string;
  description?: string;
  external_references?: Array<{
    source_name: string;
    external_id?: string;
    url?: string;
  }>;
  kill_chain_phases?: Array<{
    kill_chain_name: string;
    phase_name: string;
  }>;
  x_mitre_platforms?: string[];
  x_mitre_data_sources?: string[];
}

/**
 * STIX Course of Action (maps to MITRE Mitigation)
 */
interface StixCourseOfAction extends StixObject {
  type: 'course-of-action';
  name: string;
  description?: string;
  external_references?: Array<{
    source_name: string;
    external_id?: string;
    url?: string;
  }>;
}

/**
 * STIX Relationship
 */
interface StixRelationship extends StixObject {
  type: 'relationship';
  relationship_type: string;
  source_ref: string;
  target_ref: string;
}

/**
 * MITRE ATT&CK ICS Ingester
 */
export class MitreIngester {
  private stixIdToTechniqueId: Map<string, string> = new Map();
  private stixIdToMitigationId: Map<string, string> = new Map();

  constructor(private db: DatabaseClient) {}

  /**
   * Fetch MITRE ATT&CK ICS STIX data from GitHub with retry logic
   */
  async fetchMitreData(): Promise<StixBundle> {
    console.log(`Fetching MITRE ATT&CK ICS data from: ${MITRE_ICS_STIX_URL}`);

    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(MITRE_ICS_STIX_URL);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as StixBundle;

        if (data.type !== 'bundle' || !Array.isArray(data.objects)) {
          throw new Error('Invalid STIX bundle format');
        }

        console.log(`Fetched ${data.objects.length} STIX objects`);
        return data;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (isLastAttempt) {
          throw new Error(
            `Failed to fetch MITRE data after ${maxRetries + 1} attempts: ${errorMessage}`
          );
        }

        const delay = retryDelays[attempt];
        console.warn(`Attempt ${attempt + 1} failed: ${errorMessage}. Retrying in ${delay}ms...`);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // TypeScript requires this, but it's unreachable
    throw new Error('Unexpected error in fetchMitreData');
  }

  /**
   * Extract external ID from STIX external_references
   */
  private extractExternalId(
    externalRefs?: Array<{ source_name: string; external_id?: string }>
  ): string | null {
    if (!externalRefs) return null;

    const mitreRef = externalRefs.find((ref) => ref.source_name === 'mitre-attack');
    return mitreRef?.external_id || null;
  }

  /**
   * Extract tactic from kill chain phases
   */
  private extractTactic(
    killChainPhases?: Array<{ kill_chain_name: string; phase_name: string }>
  ): string | null {
    if (!killChainPhases || killChainPhases.length === 0) return null;

    // Take the first ICS tactic
    const icsTactic = killChainPhases.find((phase) => phase.kill_chain_name === 'mitre-ics-attack');
    return icsTactic?.phase_name || killChainPhases[0]?.phase_name || null;
  }

  /**
   * Ingest a STIX attack-pattern as a MITRE ICS technique
   */
  ingestTechnique(stixObj: StixAttackPattern): void {
    const techniqueId = this.extractExternalId(stixObj.external_references);

    if (!techniqueId) {
      console.warn(`Skipping attack-pattern without external ID: ${stixObj.id}`);
      return;
    }

    const tactic = this.extractTactic(stixObj.kill_chain_phases);
    const platforms = stixObj.x_mitre_platforms ? JSON.stringify(stixObj.x_mitre_platforms) : null;
    const dataSources = stixObj.x_mitre_data_sources
      ? JSON.stringify(stixObj.x_mitre_data_sources)
      : null;

    // Store mapping from STIX ID to technique ID for relationship resolution
    this.stixIdToTechniqueId.set(stixObj.id, techniqueId);

    // Insert or replace technique
    this.db.run(
      `INSERT OR REPLACE INTO mitre_ics_techniques
       (technique_id, tactic, name, description, platforms, data_sources)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [techniqueId, tactic, stixObj.name, stixObj.description || null, platforms, dataSources]
    );
  }

  /**
   * Ingest a STIX course-of-action as a MITRE ICS mitigation
   */
  ingestMitigation(stixObj: StixCourseOfAction): void {
    const mitigationId = this.extractExternalId(stixObj.external_references);

    if (!mitigationId) {
      console.warn(`Skipping course-of-action without external ID: ${stixObj.id}`);
      return;
    }

    // Store mapping from STIX ID to mitigation ID for relationship resolution
    this.stixIdToMitigationId.set(stixObj.id, mitigationId);

    // Insert or replace mitigation
    this.db.run(
      `INSERT OR REPLACE INTO mitre_ics_mitigations
       (mitigation_id, name, description)
       VALUES (?, ?, ?)`,
      [mitigationId, stixObj.name, stixObj.description || null]
    );
  }

  /**
   * Ingest STIX relationships (mitigates relationships)
   */
  ingestRelationships(objects: StixObject[]): void {
    const relationships = objects.filter(
      (obj) => obj.type === 'relationship'
    ) as StixRelationship[];

    const mitigatesRelationships = relationships.filter(
      (rel) => rel.relationship_type === 'mitigates'
    );

    console.log(`Processing ${mitigatesRelationships.length} mitigation relationships`);

    for (const rel of mitigatesRelationships) {
      // Source is mitigation, target is technique
      const mitigationId = this.stixIdToMitigationId.get(rel.source_ref);
      const techniqueId = this.stixIdToTechniqueId.get(rel.target_ref);

      if (!mitigationId || !techniqueId) {
        console.warn(`Skipping relationship with unresolved IDs: ${rel.id}`);
        continue;
      }

      // Insert relationship (using INSERT OR IGNORE to avoid duplicates)
      this.db.run(
        `INSERT OR IGNORE INTO mitre_technique_mitigations
         (technique_id, mitigation_id)
         VALUES (?, ?)`,
        [techniqueId, mitigationId]
      );
    }
  }

  /**
   * Main ingestion workflow
   */
  async ingestAll(): Promise<void> {
    console.log('Starting MITRE ATT&CK ICS ingestion...\n');
    const startTime = Date.now();

    try {
      // Fetch data
      const bundle = await this.fetchMitreData();

      // Process in a transaction for atomicity
      // Note: better-sqlite3 transactions automatically rollback on any error
      this.db.transaction(() => {
        // Ensure MITRE ICS standard exists
        console.log('Ensuring MITRE ICS standard exists...');
        this.db.run(
          `INSERT OR REPLACE INTO ot_standards (id, name, version, status, published_date, url, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            'mitre-ics',
            'MITRE ATT&CK for ICS',
            'v16.0',
            'current',
            '2024-10-29',
            'https://attack.mitre.org/matrices/ics/',
            'MITRE ATT&CK for Industrial Control Systems framework',
          ]
        );

        // Clear existing data
        console.log('Clearing existing MITRE data...');
        this.db.run('DELETE FROM mitre_technique_mitigations');
        this.db.run('DELETE FROM mitre_ics_techniques');
        this.db.run('DELETE FROM mitre_ics_mitigations');

        // Ingest techniques
        const techniques = bundle.objects.filter(
          (obj) => obj.type === 'attack-pattern'
        ) as StixAttackPattern[];
        console.log(`\nIngesting ${techniques.length} techniques...`);

        for (const technique of techniques) {
          this.ingestTechnique(technique);
        }

        // Ingest mitigations
        const mitigations = bundle.objects.filter(
          (obj) => obj.type === 'course-of-action'
        ) as StixCourseOfAction[];
        console.log(`Ingesting ${mitigations.length} mitigations...`);

        for (const mitigation of mitigations) {
          this.ingestMitigation(mitigation);
        }

        // Ingest relationships
        console.log('Ingesting relationships...');
        this.ingestRelationships(bundle.objects);
      });

      // Report final counts
      console.log('\n=== Ingestion Complete ===');

      const techniqueCount =
        this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_techniques')
          ?.count || 0;

      const mitigationCount =
        this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM mitre_ics_mitigations')
          ?.count || 0;

      const relationshipCount =
        this.db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM mitre_technique_mitigations'
        )?.count || 0;

      console.log(`Techniques ingested: ${techniqueCount}`);
      console.log(`Mitigations ingested: ${mitigationCount}`);
      console.log(`Relationships ingested: ${relationshipCount}`);
      console.log('=========================\n');

      // Log ingestion to audit trail
      const duration = Date.now() - startTime;
      this.db.run(
        `INSERT INTO ingestion_log (operation, status, record_count, duration_ms, data_version, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'ingest:mitre',
          'success',
          techniqueCount + mitigationCount,
          duration,
          'MITRE ATT&CK for ICS v16.0',
          `Techniques: ${techniqueCount}, Mitigations: ${mitigationCount}, Relationships: ${relationshipCount}`,
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
            'ingest:mitre',
            'failed',
            0,
            duration,
            'MITRE ATT&CK for ICS v16.0',
            `Error: ${errorMessage}`,
          ]
        );
      } catch (logError) {
        // Silently fail if logging fails (database might not exist yet)
      }

      throw error; // Re-throw to signal failure to caller
    }
  }
}

/**
 * CLI execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const db = new DatabaseClient();
  const ingester = new MitreIngester(db);

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
