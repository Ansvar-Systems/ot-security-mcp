/**
 * Golden contract tests - validate data accuracy against fixtures/golden-tests.json
 * These tests require the production database (data/ot-security.db) to be present.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DatabaseClient } from '../../src/database/client.js';
import { searchRequirements } from '../../src/tools/search.js';
import { getRequirement } from '../../src/tools/get-requirement.js';
import { listStandards } from '../../src/tools/list-standards.js';
import { getMitreTechnique } from '../../src/tools/get-mitre-technique.js';
import { mapSecurityLevelRequirements } from '../../src/tools/map-security-level-requirements.js';
import { getZoneConduitGuidance } from '../../src/tools/get-zone-conduit-guidance.js';

const DB_PATH = join(process.cwd(), 'data', 'ot-security.db');
const GOLDEN_PATH = join(process.cwd(), 'fixtures', 'golden-tests.json');

interface GoldenTest {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

interface GoldenFixture {
  tests: GoldenTest[];
}

const dbExists = existsSync(DB_PATH);
const fixtureExists = existsSync(GOLDEN_PATH);

describe.skipIf(!dbExists || !fixtureExists)('Golden Contract Tests', () => {
  let db: DatabaseClient;
  let fixture: GoldenFixture;

  beforeAll(() => {
    db = new DatabaseClient(DB_PATH);
    fixture = JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8'));
  });

  afterAll(() => {
    if (db) db.close();
  });

  it('should have at least 10 golden tests', () => {
    expect(fixture.tests.length).toBeGreaterThanOrEqual(10);
  });

  it.each(
    (() => {
      if (!fixtureExists) return [{ id: 'skip', tool: 'skip', input: {}, expected: {} }];
      const f: GoldenFixture = JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8'));
      return f.tests;
    })()
  )('$id: $tool', async (golden) => {
    if (golden.id === 'skip') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    switch (golden.tool) {
      case 'get_ot_requirement': {
        const { requirement_id, standard } = golden.input as {
          requirement_id: string;
          standard: string;
        };
        result = await getRequirement(db, {
          requirement_id,
          standard,
          options: { include_mappings: true },
        });
        break;
      }
      case 'get_mitre_ics_technique': {
        const { technique_id } = golden.input as { technique_id: string };
        result = await getMitreTechnique(db, {
          technique_id,
          options: {},
        });
        break;
      }
      case 'search_ot_requirements': {
        const { query } = golden.input as { query: string };
        result = await searchRequirements(db, { query, options: {} });
        break;
      }
      case 'list_ot_standards': {
        result = await listStandards(db);
        break;
      }
      case 'map_security_level_requirements': {
        const { security_level } = golden.input as { security_level: number };
        result = await mapSecurityLevelRequirements(db, {
          security_level,
        });
        break;
      }
      case 'get_zone_conduit_guidance': {
        result = await getZoneConduitGuidance(db, golden.input as { purdue_level?: number });
        break;
      }
      default:
        throw new Error(`Unknown tool: ${golden.tool}`);
    }

    const exp = golden.expected;

    // Check is_null expectation
    if (exp.is_null) {
      expect(result).toBeNull();
      return;
    }

    // Check not_error expectation
    if (exp.not_error) {
      expect(result).toBeDefined();
      return;
    }

    // Check not_null_fields
    if (exp.not_null_fields && result && typeof result === 'object') {
      for (const field of exp.not_null_fields as string[]) {
        expect(
          result.requirement?.[field] ?? result[field],
          `${golden.id}: field '${field}' should not be null`
        ).toBeDefined();
      }
    }

    // Check field values
    if (exp.requirement_id && result && typeof result === 'object') {
      expect(result.requirement?.requirement_id ?? result.requirement_id).toBe(exp.requirement_id);
    }

    if (exp.technique_id && result && typeof result === 'object') {
      expect(result.technique?.technique_id ?? result.technique_id).toBe(exp.technique_id);
    }

    // Check title_contains
    if (exp.title_contains && result && typeof result === 'object') {
      const title = result.requirement?.title ?? result.title ?? result.name ?? '';
      expect(title.toLowerCase()).toContain((exp.title_contains as string).toLowerCase());
    }

    // Check name_contains (for MITRE)
    if (exp.name_contains && result && typeof result === 'object') {
      const name = result.technique?.name ?? result.name ?? '';
      expect(name.toLowerCase()).toContain((exp.name_contains as string).toLowerCase());
    }

    // Check min_results (for arrays)
    if (exp.min_results !== undefined && Array.isArray(result)) {
      expect(result.length).toBeGreaterThanOrEqual(exp.min_results as number);
    }

    // Check any_result_contains_field (for arrays)
    if (exp.any_result_contains_field && Array.isArray(result) && result.length > 0) {
      const field = exp.any_result_contains_field as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasField = result.some((r: any) => r[field] !== undefined && r[field] !== null);
      expect(hasField, `At least one result should have field '${field}'`).toBe(true);
    }

    // Check zones_min_count
    if (exp.zones_min_count !== undefined && result && typeof result === 'object') {
      const zones = result.zones ?? [];
      expect(zones.length).toBeGreaterThanOrEqual(exp.zones_min_count as number);
    }
  });
});
