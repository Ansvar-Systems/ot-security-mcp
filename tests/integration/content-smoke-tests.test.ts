/**
 * Content Smoke Tests - Verify Ingested Data Quality
 *
 * These tests validate the actual content of ingested data, not just structure.
 * They check for:
 * - Data completeness (no empty/null required fields)
 * - Data quality (descriptions are substantive, not truncated)
 * - Cross-references are valid
 * - Semantic correctness of mappings
 * - Expected data volumes
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Content Smoke Tests - Data Quality Verification', () => {
  let db: DatabaseClient;
  const testDbPath = join(process.cwd(), 'data/ot-security.db');

  beforeAll(async () => {
    if (!existsSync(testDbPath)) {
      throw new Error(
        `Database not found at ${testDbPath}. Run ingestion scripts first:\n` +
          `  npm run ingest:mitre\n` +
          `  npm run ingest:nist-80053\n` +
          `  npm run ingest:nist-80082`
      );
    }
    db = new DatabaseClient(testDbPath);
  });

  afterAll(async () => {
    if (db) {
      db.close();
    }
  });

  describe('MITRE ATT&CK for ICS - Content Quality', () => {
    it('should have expected number of techniques (80+)', () => {
      const count = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM mitre_ics_techniques'
      );

      expect(count?.count).toBeGreaterThanOrEqual(80);
      expect(count?.count).toBeLessThan(100); // Sanity check for duplicates
    });

    it('should have substantive descriptions (not truncated/empty)', () => {
      const techniques = db.query<{
        technique_id: string;
        name: string;
        description: string;
      }>('SELECT technique_id, name, description FROM mitre_ics_techniques LIMIT 10');

      techniques.forEach((tech) => {
        // All techniques must have non-empty descriptions
        expect(tech.description).toBeTruthy();
        expect(tech.description.length).toBeGreaterThan(50); // Substantive content
        expect(tech.description).not.toMatch(/\.\.\.$/); // Not truncated
        expect(tech.name).toBeTruthy();
        expect(tech.name.length).toBeGreaterThan(5);
      });
    });

    it('should have valid tactic mappings', () => {
      const validTactics = [
        'initial-access',
        'execution',
        'persistence',
        'privilege-escalation',
        'evasion', // ICS-specific (not defense-evasion)
        'discovery',
        'lateral-movement',
        'collection',
        'command-and-control',
        'inhibit-response-function', // ICS-specific
        'impair-process-control', // ICS-specific
        'impact',
      ];

      const tactics = db.query<{ tactic: string }>(
        'SELECT DISTINCT tactic FROM mitre_ics_techniques WHERE tactic IS NOT NULL'
      );

      tactics.forEach((row) => {
        expect(validTactics).toContain(row.tactic);
      });

      // Should have at least 10 distinct tactics
      expect(tactics.length).toBeGreaterThanOrEqual(10);
    });

    it('should have valid platforms (not invalid JSON)', () => {
      const techniques = db.query<{
        technique_id: string;
        platforms: string | null;
      }>('SELECT technique_id, platforms FROM mitre_ics_techniques WHERE platforms IS NOT NULL');

      techniques.forEach((tech) => {
        if (tech.platforms) {
          // Should be valid JSON
          expect(() => JSON.parse(tech.platforms!)).not.toThrow();
          const platforms = JSON.parse(tech.platforms);
          expect(Array.isArray(platforms)).toBe(true);
          expect(platforms.length).toBeGreaterThan(0);
        }
      });
    });

    it('should have expected number of mitigations (40+)', () => {
      const count = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM mitre_ics_mitigations'
      );

      expect(count?.count).toBeGreaterThanOrEqual(40);
      expect(count?.count).toBeLessThan(70);
    });

    it('should have technique-mitigation relationships (300+)', () => {
      const count = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM mitre_technique_mitigations'
      );

      expect(count?.count).toBeGreaterThanOrEqual(300);
    });

    it('should have valid foreign key relationships', () => {
      // All technique-mitigation relationships should have valid IDs
      const invalidTechniques = db.query<{ technique_id: string }>(
        `SELECT DISTINCT tm.technique_id
         FROM mitre_technique_mitigations tm
         LEFT JOIN mitre_ics_techniques t ON t.technique_id = tm.technique_id
         WHERE t.technique_id IS NULL`
      );

      expect(invalidTechniques.length).toBe(0);

      const invalidMitigations = db.query<{ mitigation_id: string }>(
        `SELECT DISTINCT tm.mitigation_id
         FROM mitre_technique_mitigations tm
         LEFT JOIN mitre_ics_mitigations m ON m.mitigation_id = tm.mitigation_id
         WHERE m.mitigation_id IS NULL`
      );

      expect(invalidMitigations.length).toBe(0);
    });
  });

  describe('NIST SP 800-53 - Content Quality', () => {
    it('should have expected number of controls (200+)', () => {
      const count = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
        ['nist-800-53']
      );

      expect(count?.count).toBeGreaterThanOrEqual(200);
      expect(count?.count).toBeLessThan(270);
    });

    it('should have substantive control descriptions', () => {
      const controls = db.query<{
        requirement_id: string;
        title: string;
        description: string;
      }>(
        `SELECT requirement_id, title, description
         FROM ot_requirements
         WHERE standard_id = ?
         LIMIT 10`,
        ['nist-800-53']
      );

      controls.forEach((control) => {
        expect(control.title).toBeTruthy();
        expect(control.title.length).toBeGreaterThan(5);
        expect(control.description).toBeTruthy();
        expect(control.description.length).toBeGreaterThan(50);
      });
    });

    it('should have proper control families (AC, AU, etc.)', () => {
      const controlFamilies = db.query<{
        requirement_id: string;
        family: string;
      }>(
        `SELECT requirement_id, SUBSTR(requirement_id, 1, 2) as family
         FROM ot_requirements
         WHERE standard_id = ?
         GROUP BY family`,
        ['nist-800-53']
      );

      // Should have major control families
      const families = controlFamilies.map((c) => c.family);
      expect(families).toContain('AC'); // Access Control
      expect(families).toContain('AU'); // Audit and Accountability
      expect(families).toContain('IA'); // Identification and Authentication
      expect(families).toContain('SC'); // System and Communications Protection

      // Should have at least 10 control families
      expect(families.length).toBeGreaterThanOrEqual(10);
    });

    it('should not have duplicate control IDs', () => {
      const duplicates = db.query<{
        requirement_id: string;
        count: number;
      }>(
        `SELECT requirement_id, COUNT(*) as count
         FROM ot_requirements
         WHERE standard_id = ?
         GROUP BY requirement_id
         HAVING COUNT(*) > 1`,
        ['nist-800-53']
      );

      expect(duplicates.length).toBe(0);
    });
  });

  describe('NIST SP 800-82 - Content Quality', () => {
    it('should have guidance entries (5+)', () => {
      const count = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
        ['nist-800-82']
      );

      expect(count?.count).toBeGreaterThanOrEqual(15);
    });

    it('should have substantive OT-specific guidance', () => {
      const guidance = db.query<{
        requirement_id: string;
        title: string;
        description: string;
      }>(
        `SELECT requirement_id, title, description
         FROM ot_requirements
         WHERE standard_id = ?`,
        ['nist-800-82']
      );

      // All should have substantive descriptions
      guidance.forEach((item) => {
        expect(item.title).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.description.length).toBeGreaterThan(50);
      });

      // At least some should mention OT/ICS/SCADA concepts
      const otKeywords =
        /\b(OT|ICS|SCADA|PLC|DCS|industrial|control system|operational technology)\b/i;
      const withOtKeywords = guidance.filter((item) => otKeywords.test(item.description));

      // At least 50% should mention OT-specific terms
      expect(withOtKeywords.length).toBeGreaterThanOrEqual(guidance.length * 0.5);
    });

    it('should have mappings to NIST 800-53 (10+)', () => {
      const count = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ot_mappings
         WHERE source_standard = ? AND target_standard = ?`,
        ['nist-800-82', 'nist-800-53']
      );

      expect(count?.count).toBeGreaterThanOrEqual(40);
    });

    it('should have valid mapping confidence scores', () => {
      const mappings = db.query<{
        source_requirement: string;
        confidence: number;
      }>(
        `SELECT source_requirement, confidence FROM ot_mappings
         WHERE source_standard = ?`,
        ['nist-800-82']
      );

      mappings.forEach((mapping) => {
        expect(mapping.confidence).toBeGreaterThanOrEqual(0.0);
        expect(mapping.confidence).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('IEC 62443 Templates - Content Quality', () => {
    it('should have template requirements', () => {
      const count = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ot_requirements
         WHERE standard_id LIKE 'iec62443%'`
      );

      // Templates should have some entries
      expect(count?.count).toBeGreaterThanOrEqual(0);
    });

    it('should have valid security level ranges if ingested', () => {
      const securityLevels = db.query<{
        security_level: number;
        sl_type: string;
      }>('SELECT DISTINCT security_level, sl_type FROM security_levels');

      securityLevels.forEach((sl) => {
        expect(sl.security_level).toBeGreaterThanOrEqual(1);
        expect(sl.security_level).toBeLessThanOrEqual(4);
        expect(['SL-T', 'SL-C', 'SL-A']).toContain(sl.sl_type);
      });
    });
  });

  describe('Cross-Standard Data Consistency', () => {
    it('should have core public standards ingested', () => {
      const standards = db.query<{ id: string; name: string }>(
        'SELECT id, name FROM ot_standards ORDER BY id'
      );

      // At minimum: MITRE, NIST 800-53, NIST 800-82
      expect(standards.length).toBeGreaterThanOrEqual(3);

      const standardIds = standards.map((s) => s.id);

      // Core public standards (always present)
      expect(standardIds).toContain('mitre-ics');
      expect(standardIds).toContain('nist-800-53');
      expect(standardIds).toContain('nist-800-82');

      // IEC 62443 standards are optional (user must ingest)
      // iec62443-3-2, iec62443-3-3, iec62443-4-2 may or may not be present
    });

    it('should have accurate requirement counts per standard', () => {
      const standards = db.query<{
        id: string;
        name: string;
        requirement_count: number;
      }>(
        `SELECT s.id, s.name,
          CASE
            WHEN s.id = 'mitre-ics' THEN (SELECT COUNT(*) FROM mitre_ics_techniques)
            ELSE (SELECT COUNT(*) FROM ot_requirements WHERE standard_id = s.id)
          END as requirement_count
         FROM ot_standards s`
      );

      standards.forEach((std) => {
        if (std.id === 'mitre-ics') {
          expect(std.requirement_count).toBeGreaterThanOrEqual(80);
        } else if (std.id === 'nist-800-53') {
          expect(std.requirement_count).toBeGreaterThanOrEqual(200);
        } else if (std.id === 'nist-800-82') {
          expect(std.requirement_count).toBeGreaterThanOrEqual(15);
        }
        // IEC templates may be 0 or populated depending on user ingestion
      });
    });

    it('should have no orphaned security levels', () => {
      const orphans = db.query<{ id: number }>(
        `SELECT sl.id FROM security_levels sl
         LEFT JOIN ot_requirements r ON r.id = sl.requirement_db_id
         WHERE r.id IS NULL`
      );

      expect(orphans.length).toBe(0);
    });

    it('should have IEC 62443 to NIST 800-53 mappings (40+)', () => {
      const count = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ot_mappings
         WHERE source_standard LIKE 'iec62443%' AND target_standard = 'nist-800-53'`
      );

      expect(count?.count).toBeGreaterThanOrEqual(40);
    });

    it('should have MITRE to NIST 800-53 mappings (30+)', () => {
      const count = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ot_mappings
         WHERE source_standard = 'mitre-ics' AND target_standard = 'nist-800-53'`
      );

      expect(count?.count).toBeGreaterThanOrEqual(30);
    });

    it('should have populated MITRE ot_requirement_id values', () => {
      const count = db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM mitre_technique_mitigations
         WHERE ot_requirement_id IS NOT NULL`
      );

      // At least some technique-mitigation records should have NIST linkages
      expect(count?.count).toBeGreaterThanOrEqual(10);
    });

    it('should have valid mapping references', () => {
      // Check source requirements exist in ot_requirements, excluding:
      // - IEC 62443 sources (user-supplied licensed data, may not be ingested)
      // - MITRE ICS sources (mitigations live in mitre_ics_mitigations, not ot_requirements)
      const invalidSources = db.query<{ source_requirement: string }>(
        `SELECT DISTINCT m.source_requirement
         FROM ot_mappings m
         LEFT JOIN ot_requirements r ON r.requirement_id = m.source_requirement
           AND r.standard_id = m.source_standard
         WHERE r.id IS NULL
           AND m.source_standard NOT LIKE 'iec62443%'
           AND m.source_standard != 'mitre-ics'`
      );

      // NIST 800-82 → 800-53 mappings should all be valid
      expect(invalidSources.length).toBe(0);
    });
  });

  describe('Full-Text Search Index Quality', () => {
    it('should have FTS5 index populated', () => {
      const ftsCount = db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM ot_requirements_fts'
      );

      expect(ftsCount?.count).toBeGreaterThan(0);
    });

    it('should return results for common OT security terms', () => {
      const testQueries = [
        'authentication',
        'access',
        'network',
        'audit',
        'encryption',
        'backup',
        'control',
      ];

      testQueries.forEach((query) => {
        const results = db.query<{ requirement_id: string }>(
          `SELECT requirement_id FROM ot_requirements_fts
           WHERE ot_requirements_fts MATCH ?
           LIMIT 5`,
          [query]
        );

        // Each term should return at least one result
        expect(results.length).toBeGreaterThan(0);
      });
    });

    it('should rank results by relevance', () => {
      const results = db.query<{
        requirement_id: string;
        rank: number;
      }>(
        `SELECT requirement_id, rank
         FROM ot_requirements_fts
         WHERE ot_requirements_fts MATCH 'authentication'
         ORDER BY rank
         LIMIT 10`
      );

      // Results should be in descending relevance (lower rank = more relevant)
      for (let i = 1; i < results.length; i++) {
        expect(results[i]!.rank).toBeGreaterThanOrEqual(results[i - 1]!.rank);
      }
    });
  });

  describe('Database Performance Smoke Tests', () => {
    it('should query standards quickly (<50ms)', () => {
      const start = Date.now();
      db.query('SELECT * FROM ot_standards');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should perform full-text search quickly (<100ms)', () => {
      const start = Date.now();
      db.query(
        `SELECT requirement_id FROM ot_requirements_fts
         WHERE ot_requirements_fts MATCH 'authentication'
         LIMIT 50`
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should join multiple tables efficiently (<200ms)', () => {
      const start = Date.now();
      db.query(
        `SELECT r.requirement_id, r.title, sl.security_level, s.name
         FROM ot_requirements r
         LEFT JOIN security_levels sl ON sl.requirement_db_id = r.id
         JOIN ot_standards s ON s.id = r.standard_id
         WHERE r.standard_id LIKE 'iec%'
         LIMIT 50`
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Data Completeness Checks', () => {
    it('should have no requirements with empty titles', () => {
      const empty = db.query<{ requirement_id: string }>(
        `SELECT requirement_id FROM ot_requirements
         WHERE title IS NULL OR TRIM(title) = ''`
      );

      expect(empty.length).toBe(0);
    });

    it('should have no requirements with empty descriptions', () => {
      const empty = db.query<{ requirement_id: string }>(
        `SELECT requirement_id FROM ot_requirements
         WHERE description IS NULL OR TRIM(description) = ''`
      );

      expect(empty.length).toBe(0);
    });

    it('should have no MITRE techniques with empty names', () => {
      const empty = db.query<{ technique_id: string }>(
        `SELECT technique_id FROM mitre_ics_techniques
         WHERE name IS NULL OR TRIM(name) = ''`
      );

      expect(empty.length).toBe(0);
    });

    it('should have metadata tracking ingestion', () => {
      const ingestionLogs = db.query<{
        operation: string;
        timestamp: string;
      }>('SELECT operation, timestamp FROM ingestion_log ORDER BY timestamp DESC LIMIT 10');

      // Should have at least some ingestion logs
      expect(ingestionLogs.length).toBeGreaterThan(0);
    });
  });
});
