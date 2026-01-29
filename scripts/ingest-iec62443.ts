#!/usr/bin/env node

import { DatabaseClient } from '../src/database/client.js';
import { Iec62443Validator } from './validate-iec62443.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface Iec62443Data {
  meta: {
    part: '3-3' | '4-2' | '3-2';
    title: string;
    version: string;
    published_date: string;
  };
  requirements?: Requirement[];
  zones?: Zone[];
  conduits?: Conduit[];
}

interface Requirement {
  requirement_id: string;
  parent_requirement_id: string | null;
  title: string;
  description: string;
  rationale: string;
  component_type: string;
  security_levels: SecurityLevel[];
}

interface SecurityLevel {
  security_level: number;
  sl_type: string;
  capability_level: number;
  notes?: string;
}

interface Zone {
  name: string;
  purdue_level: number;
  security_level_target: number;
  description: string;
  typical_assets?: string;
}

interface Conduit {
  name: string;
  conduit_type: string;
  description: string;
  minimum_security_level?: number;
}

export class Iec62443Ingester {
  private validator: Iec62443Validator;

  constructor(private db: DatabaseClient) {
    this.validator = new Iec62443Validator();
  }

  /**
   * Ingest IEC 62443-3-3 (System Requirements)
   */
  ingestPart33(data: Iec62443Data): void {
    // Validate first
    this.validator.validate(data);

    // Ensure standard exists
    this.db.run(`
      INSERT OR IGNORE INTO ot_standards (id, name, version, published_date, status)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'iec62443-3-3',
      data.meta.title,
      data.meta.version,
      data.meta.published_date,
      'current'
    ]);

    // Ingest requirements
    for (const req of data.requirements || []) {
      this.ingestRequirement('iec62443-3-3', req);
    }

    console.log(`Ingested ${data.requirements?.length || 0} requirements from IEC 62443-3-3`);
  }

  /**
   * Ingest IEC 62443-4-2 (Component Requirements)
   */
  ingestPart42(data: Iec62443Data): void {
    // Validate first
    this.validator.validate(data);

    // Ensure standard exists
    this.db.run(`
      INSERT OR IGNORE INTO ot_standards (id, name, version, published_date, status)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'iec62443-4-2',
      data.meta.title,
      data.meta.version,
      data.meta.published_date,
      'current'
    ]);

    // Ingest requirements
    for (const req of data.requirements || []) {
      this.ingestRequirement('iec62443-4-2', req);
    }

    console.log(`Ingested ${data.requirements?.length || 0} requirements from IEC 62443-4-2`);
  }

  /**
   * Ingest IEC 62443-3-2 (Zones & Conduits)
   */
  ingestPart32(data: Iec62443Data): void {
    // Validate first
    this.validator.validate(data);

    // Ensure standard exists
    this.db.run(`
      INSERT OR IGNORE INTO ot_standards (id, name, version, published_date, status)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'iec62443-3-2',
      data.meta.title,
      data.meta.version,
      data.meta.published_date,
      'current'
    ]);

    // Ingest zones
    for (const zone of data.zones || []) {
      this.db.run(`
        INSERT OR REPLACE INTO zones (
          name, purdue_level, security_level_target, description, typical_assets, iec_reference
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        zone.name,
        zone.purdue_level,
        zone.security_level_target,
        zone.description,
        zone.typical_assets || null,
        'IEC 62443-3-2'
      ]);
    }

    // Ingest conduits
    for (const conduit of data.conduits || []) {
      this.db.run(`
        INSERT OR REPLACE INTO conduits (
          name, conduit_type, description, minimum_security_level, iec_reference
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        conduit.name,
        conduit.conduit_type,
        conduit.description,
        conduit.minimum_security_level || null,
        'IEC 62443-3-2'
      ]);
    }

    console.log(`Ingested ${data.zones?.length || 0} zones and ${data.conduits?.length || 0} conduits from IEC 62443-3-2`);
  }

  /**
   * Ingest a single requirement with security levels
   */
  private ingestRequirement(standardId: string, req: Requirement): void {
    // Insert requirement
    const result = this.db.run(`
      INSERT OR REPLACE INTO ot_requirements (
        standard_id,
        requirement_id,
        parent_requirement_id,
        title,
        description,
        rationale,
        component_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      standardId,
      req.requirement_id,
      req.parent_requirement_id,
      req.title,
      req.description,
      req.rationale,
      req.component_type
    ]);

    const requirementDbId = result.lastInsertRowid;

    // Delete existing security levels for this requirement (in case of re-ingestion)
    this.db.run(`
      DELETE FROM security_levels WHERE requirement_db_id = ?
    `, [requirementDbId]);

    // Insert security levels
    for (const sl of req.security_levels) {
      this.db.run(`
        INSERT INTO security_levels (
          requirement_db_id,
          security_level,
          sl_type,
          capability_level,
          notes
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        requirementDbId,
        sl.security_level,
        sl.sl_type,
        sl.capability_level,
        sl.notes || null
      ]);
    }
  }

  /**
   * Ingest from file (auto-detects part)
   */
  ingestFile(filePath: string): void {
    console.log(`Loading IEC 62443 data from: ${filePath}`);

    const content = readFileSync(filePath, 'utf-8');
    const data: Iec62443Data = JSON.parse(content);

    this.db.transaction(() => {
      switch (data.meta.part) {
        case '3-3':
          this.ingestPart33(data);
          break;
        case '4-2':
          this.ingestPart42(data);
          break;
        case '3-2':
          this.ingestPart32(data);
          break;
        default:
          throw new Error(`Unknown IEC 62443 part: ${data.meta.part}`);
      }
    });

    console.log('Ingestion complete');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: ingest-iec62443 <json-file>');
    console.error('Example: ingest-iec62443 data/my-iec62443-3-3.json');
    process.exit(1);
  }

  try {
    const dbPath = process.env.OT_MCP_DB_PATH || 'data/ot-security.db';
    const db = new DatabaseClient(dbPath);
    const ingester = new Iec62443Ingester(db);

    ingester.ingestFile(filePath);

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}
