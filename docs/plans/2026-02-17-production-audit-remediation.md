# Production Audit Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all gaps identified against the MCP Production Audit Standard v1.0 to achieve an A grade.

**Architecture:** We fix version drift, test infrastructure (DB locking), missing data provenance files, golden contract tests, missing security workflows, CI strictness, tool description quality, and SECURITY.md freshness. All changes are code-level — no infrastructure/Vercel changes.

**Tech Stack:** TypeScript, Vitest, SQLite (WASM), GitHub Actions YAML, JSON fixtures

---

### Task 1: Fix Version Mismatch (server.json + index.ts)

**Files:**
- Modify: `server.json` (lines 9, 14)
- Modify: `src/index.ts` (line 54)

**Step 1: Update server.json version to 0.4.0**

In `server.json`, change both version fields from `0.3.1` to `0.4.0`:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.Ansvar-Systems/ot-security-mcp",
  "description": "OT security standards: IEC 62443, NIST 800-82/53, MITRE ATT&CK for ICS",
  "repository": {
    "url": "https://github.com/Ansvar-Systems/ot-security-mcp",
    "source": "github"
  },
  "version": "0.4.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@ansvar/ot-security-mcp",
      "version": "0.4.0",
      "transport": {
        "type": "stdio"
      }
    }
  ]
}
```

**Step 2: Update hardcoded version in src/index.ts**

Change line 54 from `version: '0.3.1'` to `version: '0.4.0'`:

```typescript
this.server = new Server(
  {
    name: 'ot-security-mcp',
    version: '0.4.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

**Step 3: Verify all three version sources match**

Run: `grep -r "0\\.3\\.1" server.json src/index.ts package.json manifest.json`
Expected: No output (no remaining 0.3.1 references)

Run: `grep "version" server.json src/index.ts package.json manifest.json | grep "0.4.0"`
Expected: All four files show 0.4.0

**Step 4: Commit**

```bash
git add server.json src/index.ts
git commit -m "fix: sync version to 0.4.0 across server.json, index.ts, package.json, manifest.json"
```

---

### Task 2: Fix Test Database Locking (Critical — 94 failing tests)

**Files:**
- Modify: Every test file in `tests/unit/*.test.ts` (16 files)
- Modify: `tests/integration/mcp-server.test.ts`

**Root cause:** All test files use paths like `tests/data/test-search.sqlite` — when forks race, the WASM VFS holds locks on the same directory. Fix: use `os.tmpdir()` + random suffix per test file.

**Step 1: Create a shared test helper**

Create: `tests/helpers/test-db.ts`

```typescript
import { DatabaseClient } from '../../src/database/client.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';

/**
 * Creates a unique temporary database path for test isolation.
 * Each test file gets its own temp directory path to avoid WASM VFS lock conflicts.
 */
export function createTestDbPath(testName: string): string {
  const suffix = randomBytes(4).toString('hex');
  return join(tmpdir(), `ot-mcp-test-${testName}-${suffix}.sqlite`);
}

/**
 * Cleans up a test database file if it exists.
 */
export async function cleanupTestDb(dbPath: string): Promise<void> {
  for (const ext of ['', '-shm', '-wal', '-journal']) {
    const file = dbPath + ext;
    if (existsSync(file)) {
      await unlink(file);
    }
  }
}
```

**Step 2: Update each test file to use the helper**

For EACH of the 16 unit test files and the mcp-server integration test, replace the `testDbPath` and `beforeEach`/`afterEach` pattern.

Example for `tests/unit/search.test.ts` — replace the top of the file:

OLD (lines 1-34):
```typescript
import { join } from 'path';
// ...
const testDbPath = join(process.cwd(), 'tests/data/test-search.sqlite');

beforeEach(async () => {
  if (existsSync(testDbPath)) {
    await unlink(testDbPath);
  }
  db = new DatabaseClient(testDbPath);
});

afterEach(async () => {
  if (db) {
    db.close();
  }
  if (existsSync(testDbPath)) {
    await unlink(testDbPath);
  }
});
```

NEW:
```typescript
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';
// ...
let testDbPath: string;

beforeEach(async () => {
  testDbPath = createTestDbPath('search');
  db = new DatabaseClient(testDbPath);
});

afterEach(async () => {
  if (db) {
    db.close();
  }
  await cleanupTestDb(testDbPath);
});
```

Apply this same pattern to ALL test files. The test name argument should match the file:
- `database.test.ts` → `createTestDbPath('database')`
- `get-requirement.test.ts` → `createTestDbPath('get-requirement')`
- `list-standards.test.ts` → `createTestDbPath('list-standards')`
- `get-mitre-technique.test.ts` → `createTestDbPath('get-mitre')`
- `map-security-level-requirements.test.ts` → `createTestDbPath('map-sl')`
- `get-zone-conduit-guidance.test.ts` → `createTestDbPath('zone-conduit')`
- `get-requirement-rationale.test.ts` → `createTestDbPath('rationale')`
- `search.test.ts` → `createTestDbPath('search')`
- `ingest-mitre.test.ts` → `createTestDbPath('ingest-mitre')`
- `ingest-nist-80053.test.ts` → `createTestDbPath('ingest-nist53')`
- `ingest-nist-80082.test.ts` → `createTestDbPath('ingest-nist82')`
- `ingest-iec62443.test.ts` → `createTestDbPath('ingest-iec')`
- `ingest-cross-mappings.test.ts` → `createTestDbPath('ingest-mappings')`
- `validate-iec62443.test.ts` → `createTestDbPath('validate-iec')`
- `database-integration.test.ts` → `createTestDbPath('db-integration')`
- `tests/integration/mcp-server.test.ts` → `createTestDbPath('mcp-server')`

**Step 3: Run tests to verify fix**

Run: `npm test`
Expected: 0 "database is locked" errors. All previously-failing unit tests should pass. Skipped integration tests (content-smoke, e2e-tools, stage2) may remain skipped (they need the production DB).

**Step 4: Commit**

```bash
git add tests/helpers/test-db.ts tests/unit/*.test.ts tests/integration/mcp-server.test.ts
git commit -m "fix: resolve SQLite WASM database lock errors in test suite

Use unique temp paths per test file to prevent WASM VFS lock conflicts.
All 16 unit test files + integration test updated."
```

---

### Task 3: Create sources.yml (Data Provenance)

**Files:**
- Create: `sources.yml`

**Step 1: Write the data provenance file**

```yaml
# Data Source Provenance for OT Security MCP
# Lists all authoritative data sources, update mechanisms, and currency

sources:
  nist-800-53:
    name: "NIST SP 800-53 Rev 5"
    type: primary
    url: "https://github.com/usnistgov/oscal-content/tree/main/nist.gov/SP800-53/rev5"
    format: OSCAL JSON
    update_mechanism: automated
    update_frequency: "Daily check via GitHub Actions"
    ingestion_script: "scripts/ingest-nist-80053.ts"
    last_verified: "2026-02-17"
    license: "Public Domain (US Government)"
    notes: "260 OT-relevant controls from 15 families"

  nist-800-82:
    name: "NIST SP 800-82 Rev 3"
    type: primary
    url: "https://csrc.nist.gov/pubs/sp/800/82/r3/final"
    format: "Curated JSON from official PDF"
    update_mechanism: manual
    update_frequency: "On new NIST revision"
    ingestion_script: "scripts/ingest-nist-80082.ts"
    last_verified: "2026-02-17"
    license: "Public Domain (US Government)"
    notes: "16 curated guidance sections"

  mitre-attack-ics:
    name: "MITRE ATT&CK for ICS"
    type: primary
    url: "https://github.com/mitre-attack/attack-stix-data/tree/master/ics-attack"
    format: STIX 2.0 JSON
    update_mechanism: automated
    update_frequency: "Daily check via GitHub Actions"
    ingestion_script: "scripts/ingest-mitre-ics.ts"
    last_verified: "2026-02-17"
    license: "Apache 2.0"
    notes: "83 techniques, 52 mitigations, 331 relationships"

  iec-62443:
    name: "IEC 62443 Series (3-3, 4-2, 3-2)"
    type: user-supplied
    url: "https://www.isa.org/standards-and-publications/isa-iec-62443-series-of-standards"
    format: "User-created JSON from licensed PDFs"
    update_mechanism: manual
    update_frequency: "On user license renewal or new standard revision"
    ingestion_script: "scripts/ingest-iec62443.ts"
    last_verified: "N/A - user-supplied"
    license: "ISA/IEC Copyright - requires license"
    notes: "NOT included in distribution. Users must supply their own licensed data."

  cross-standard-mappings:
    name: "Cross-Standard Mappings (IEC↔NIST, MITRE↔NIST)"
    type: curated
    url: "N/A - internally curated from official mapping tables"
    format: JSON
    update_mechanism: manual
    update_frequency: "On new standard revisions"
    ingestion_script: "scripts/ingest-cross-mappings.ts"
    last_verified: "2026-02-17"
    license: "Apache 2.0"
    notes: "243 validated mappings"

  purdue-model:
    name: "Purdue Enterprise Reference Architecture"
    type: curated
    url: "https://www.isa.org/isa95"
    format: "Curated JSON"
    update_mechanism: manual
    update_frequency: "Stable reference architecture"
    last_verified: "2026-02-17"
    license: "Apache 2.0"
    notes: "6 Purdue levels, 7 conduit types, 8 zone-to-zone flows"
```

**Step 2: Commit**

```bash
git add sources.yml
git commit -m "docs: add sources.yml for data provenance tracking

Covers all 6 data sources: NIST 800-53, NIST 800-82, MITRE ATT&CK ICS,
IEC 62443, cross-standard mappings, and Purdue Model reference data."
```

---

### Task 4: Create Golden Contract Tests

**Files:**
- Create: `fixtures/golden-tests.json`
- Create: `tests/integration/golden-contract.test.ts`

**Step 1: Create the golden tests fixture (15 tests)**

```json
{
  "$schema": "./golden-tests.schema.json",
  "description": "Golden contract tests for OT Security MCP data accuracy verification",
  "version": "0.4.0",
  "generated": "2026-02-17",
  "tests": [
    {
      "id": "nist-ac-2",
      "tool": "get_ot_requirement",
      "input": { "requirement_id": "AC-2", "standard": "nist-800-53" },
      "expected": {
        "requirement_id": "AC-2",
        "title_contains": "Account Management",
        "standard_id": "nist-800-53",
        "not_null_fields": ["description", "title"]
      }
    },
    {
      "id": "nist-si-3",
      "tool": "get_ot_requirement",
      "input": { "requirement_id": "SI-3", "standard": "nist-800-53" },
      "expected": {
        "requirement_id": "SI-3",
        "title_contains": "Malicious Code Protection",
        "standard_id": "nist-800-53"
      }
    },
    {
      "id": "nist-pe-3",
      "tool": "get_ot_requirement",
      "input": { "requirement_id": "PE-3", "standard": "nist-800-53" },
      "expected": {
        "requirement_id": "PE-3",
        "title_contains": "Physical Access Control",
        "standard_id": "nist-800-53"
      }
    },
    {
      "id": "nist-ia-2",
      "tool": "get_ot_requirement",
      "input": { "requirement_id": "IA-2", "standard": "nist-800-53" },
      "expected": {
        "requirement_id": "IA-2",
        "title_contains": "Identification and Authentication",
        "standard_id": "nist-800-53"
      }
    },
    {
      "id": "nist-au-6",
      "tool": "get_ot_requirement",
      "input": { "requirement_id": "AU-6", "standard": "nist-800-53" },
      "expected": {
        "requirement_id": "AU-6",
        "title_contains": "Audit Record Review",
        "standard_id": "nist-800-53"
      }
    },
    {
      "id": "mitre-t0800",
      "tool": "get_mitre_ics_technique",
      "input": { "technique_id": "T0800" },
      "expected": {
        "technique_id": "T0800",
        "name_contains": "Activate Firmware Update Mode",
        "not_null_fields": ["description", "tactic"]
      }
    },
    {
      "id": "mitre-t0836",
      "tool": "get_mitre_ics_technique",
      "input": { "technique_id": "T0836" },
      "expected": {
        "technique_id": "T0836",
        "name_contains": "Modify Parameter",
        "not_null_fields": ["description"]
      }
    },
    {
      "id": "mitre-t0831",
      "tool": "get_mitre_ics_technique",
      "input": { "technique_id": "T0831" },
      "expected": {
        "technique_id": "T0831",
        "name_contains": "Manipulation of Control",
        "not_null_fields": ["description"]
      }
    },
    {
      "id": "search-authentication",
      "tool": "search_ot_requirements",
      "input": { "query": "authentication" },
      "expected": {
        "min_results": 1,
        "any_result_contains_field": "requirement_id"
      }
    },
    {
      "id": "search-segmentation",
      "tool": "search_ot_requirements",
      "input": { "query": "network segmentation" },
      "expected": {
        "min_results": 1,
        "any_result_contains_field": "requirement_id"
      }
    },
    {
      "id": "search-malware",
      "tool": "search_ot_requirements",
      "input": { "query": "malware protection" },
      "expected": {
        "min_results": 1,
        "any_result_contains_field": "requirement_id"
      }
    },
    {
      "id": "list-standards-coverage",
      "tool": "list_ot_standards",
      "input": {},
      "expected": {
        "min_results": 3,
        "any_result_contains_field": "id"
      }
    },
    {
      "id": "zone-conduit-purdue-0",
      "tool": "get_zone_conduit_guidance",
      "input": { "purdue_level": 0 },
      "expected": {
        "not_null_fields": ["zones"],
        "zones_min_count": 1
      }
    },
    {
      "id": "negative-test-nonexistent",
      "tool": "get_ot_requirement",
      "input": { "requirement_id": "XYZ-999", "standard": "nist-800-53" },
      "expected": {
        "is_null": true
      }
    },
    {
      "id": "sl2-mapping",
      "tool": "map_security_level_requirements",
      "input": { "security_level": 2 },
      "expected": {
        "not_error": true
      }
    }
  ]
}
```

**Step 2: Create the golden contract test runner**

Create: `tests/integration/golden-contract.test.ts`

```typescript
/**
 * Golden contract tests — validate data accuracy against fixtures/golden-tests.json
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
import { getRequirementRationale } from '../../src/tools/get-requirement-rationale.js';

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

// Skip entire suite if production DB not present
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

  // Dynamically generate a test for each golden test entry
  it.each(
    (() => {
      if (!fixtureExists) return [{ id: 'skip', tool: 'skip', input: {}, expected: {} }];
      const f: GoldenFixture = JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8'));
      return f.tests;
    })()
  )('$id: $tool', async (golden) => {
    if (golden.id === 'skip') return;

    let result: unknown;

    switch (golden.tool) {
      case 'get_ot_requirement': {
        const { requirement_id, standard, ...opts } = golden.input as any;
        result = await getRequirement(db, {
          requirement_id,
          standard,
          options: { include_mappings: opts.include_mappings ?? true },
        });
        break;
      }
      case 'get_mitre_ics_technique': {
        const { technique_id, ...opts } = golden.input as any;
        result = await getMitreTechnique(db, {
          technique_id,
          options: opts,
        });
        break;
      }
      case 'search_ot_requirements': {
        const { query, ...opts } = golden.input as any;
        result = await searchRequirements(db, { query, options: opts });
        break;
      }
      case 'list_ot_standards': {
        result = await listStandards(db);
        break;
      }
      case 'map_security_level_requirements': {
        const { security_level, ...opts } = golden.input as any;
        result = await mapSecurityLevelRequirements(db, {
          security_level,
          ...opts,
        });
        break;
      }
      case 'get_zone_conduit_guidance': {
        result = await getZoneConduitGuidance(db, golden.input as any);
        break;
      }
      case 'get_requirement_rationale': {
        const { requirement_id, standard } = golden.input as any;
        result = await getRequirementRationale(db, { requirement_id, standard });
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
        expect((result as any)[field], `${golden.id}: field '${field}' should not be null`).not.toBeNull();
        expect((result as any)[field], `${golden.id}: field '${field}' should be defined`).toBeDefined();
      }
    }

    // Check field values
    if (exp.requirement_id && result && typeof result === 'object') {
      expect((result as any).requirement?.requirement_id ?? (result as any).requirement_id).toBe(exp.requirement_id);
    }

    if (exp.technique_id && result && typeof result === 'object') {
      expect((result as any).technique?.technique_id ?? (result as any).technique_id).toBe(exp.technique_id);
    }

    // Check title_contains
    if (exp.title_contains && result && typeof result === 'object') {
      const title = (result as any).requirement?.title ?? (result as any).title ?? (result as any).name ?? '';
      expect(title.toLowerCase()).toContain((exp.title_contains as string).toLowerCase());
    }

    // Check name_contains (for MITRE)
    if (exp.name_contains && result && typeof result === 'object') {
      const name = (result as any).technique?.name ?? (result as any).name ?? '';
      expect(name.toLowerCase()).toContain((exp.name_contains as string).toLowerCase());
    }

    // Check min_results (for arrays)
    if (exp.min_results !== undefined && Array.isArray(result)) {
      expect(result.length).toBeGreaterThanOrEqual(exp.min_results as number);
    }

    // Check any_result_contains_field (for arrays)
    if (exp.any_result_contains_field && Array.isArray(result) && result.length > 0) {
      const field = exp.any_result_contains_field as string;
      const hasField = result.some((r: any) => r[field] !== undefined && r[field] !== null);
      expect(hasField, `At least one result should have field '${field}'`).toBe(true);
    }

    // Check zones_min_count
    if (exp.zones_min_count !== undefined && result && typeof result === 'object') {
      const zones = (result as any).zones ?? [];
      expect(zones.length).toBeGreaterThanOrEqual(exp.zones_min_count as number);
    }
  });
});
```

**Step 3: Run tests**

Run: `npm test -- tests/integration/golden-contract.test.ts`
Expected: If production DB exists, tests pass. If not, suite is skipped with a clear message.

**Step 4: Commit**

```bash
git add fixtures/golden-tests.json tests/integration/golden-contract.test.ts
git commit -m "test: add 15 golden contract tests for data accuracy verification

Validates NIST 800-53, MITRE ATT&CK ICS, search, zone/conduit, and
negative test cases against fixtures/golden-tests.json."
```

---

### Task 5: Create Drift Detection Hashes

**Files:**
- Create: `fixtures/golden-hashes.json`
- Create: `scripts/generate-golden-hashes.ts`

**Step 1: Create the hash generation script**

```typescript
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
const nist53 = db.query(`SELECT requirement_id, title FROM ot_requirements WHERE standard_id = 'nist-800-53' ORDER BY requirement_id`);
hashes['nist-800-53-requirements'] = {
  hash: hashRows(nist53),
  row_count: nist53.length,
  description: 'NIST 800-53 Rev 5 OT-relevant controls',
};

// MITRE ICS techniques
const mitre = db.query(`SELECT technique_id, name, tactic FROM mitre_ics_techniques ORDER BY technique_id`);
hashes['mitre-ics-techniques'] = {
  hash: hashRows(mitre),
  row_count: mitre.length,
  description: 'MITRE ATT&CK for ICS techniques',
};

// MITRE mitigations
const mitigations = db.query(`SELECT mitigation_id, name FROM mitre_ics_mitigations ORDER BY mitigation_id`);
hashes['mitre-ics-mitigations'] = {
  hash: hashRows(mitigations),
  row_count: mitigations.length,
  description: 'MITRE ATT&CK for ICS mitigations',
};

// Cross-standard mappings
const mappings = db.query(`SELECT source_standard, source_requirement, target_standard, target_requirement FROM ot_mappings ORDER BY source_standard, source_requirement`);
hashes['cross-standard-mappings'] = {
  hash: hashRows(mappings),
  row_count: mappings.length,
  description: 'Cross-standard mappings (IEC↔NIST, MITRE↔NIST)',
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
  console.log(`  ${key}: ${val.row_count} rows → ${val.hash.slice(0, 16)}...`);
}

db.close();
```

**Step 2: Create the initial golden-hashes.json placeholder**

```json
{
  "generated": "2026-02-17T00:00:00.000Z",
  "description": "Golden hashes for drift detection. Run 'npx tsx scripts/generate-golden-hashes.ts' after building the production database to populate.",
  "hashes": {}
}
```

**Step 3: Add npm script**

In `package.json`, add to the `scripts` section:
```json
"generate:hashes": "tsx scripts/generate-golden-hashes.ts"
```

**Step 4: Commit**

```bash
git add fixtures/golden-hashes.json scripts/generate-golden-hashes.ts package.json
git commit -m "feat: add drift detection hash generation for data integrity

Hashes NIST 800-53, MITRE ICS, mappings, and standards tables.
Run npm run generate:hashes after building production DB."
```

---

### Task 6: Create check-updates.ts Script

**Files:**
- Create: `scripts/check-updates.ts`

**Step 1: Write the upstream update checker**

```typescript
#!/usr/bin/env tsx
/**
 * Check for upstream data source updates.
 * Queries NIST OSCAL and MITRE STIX GitHub repos for new commits.
 */

const SOURCES = [
  {
    name: 'NIST 800-53 (OSCAL)',
    repo: 'usnistgov/oscal-content',
    path: 'nist.gov/SP800-53/rev5',
    branch: 'main',
  },
  {
    name: 'MITRE ATT&CK for ICS (STIX)',
    repo: 'mitre-attack/attack-stix-data',
    path: 'ics-attack',
    branch: 'master',
  },
];

async function checkSource(source: typeof SOURCES[0]): Promise<void> {
  const url = `https://api.github.com/repos/${source.repo}/commits?path=${source.path}&sha=${source.branch}&per_page=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });

    if (!response.ok) {
      console.error(`  ✗ ${source.name}: HTTP ${response.status}`);
      return;
    }

    const commits = await response.json() as Array<{ sha: string; commit: { message: string; committer: { date: string } } }>;
    if (commits.length === 0) {
      console.log(`  ? ${source.name}: No commits found`);
      return;
    }

    const latest = commits[0]!;
    const date = new Date(latest.commit.committer.date);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

    const icon = daysAgo <= 7 ? '⚠️' : '✓';
    console.log(`  ${icon} ${source.name}`);
    console.log(`    Latest commit: ${latest.sha.slice(0, 8)} (${daysAgo} days ago)`);
    console.log(`    Message: ${latest.commit.message.split('\n')[0]}`);
    console.log(`    URL: https://github.com/${source.repo}/commits/${source.branch}/${source.path}`);

    if (daysAgo <= 7) {
      console.log(`    ⚠️  RECENT UPDATE — consider re-ingesting`);
    }
  } catch (error) {
    console.error(`  ✗ ${source.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main(): Promise<void> {
  console.log('=== OT Security MCP — Upstream Data Source Check ===\n');
  console.log(`Date: ${new Date().toISOString()}\n`);

  for (const source of SOURCES) {
    await checkSource(source);
    console.log('');
  }

  console.log('Done. Re-run ingestion scripts if any sources have been updated.');
}

main().catch(console.error);
```

**Step 2: Commit**

```bash
git add scripts/check-updates.ts
git commit -m "feat: add check-updates script for upstream data freshness monitoring

Checks NIST OSCAL and MITRE STIX GitHub repos for recent commits."
```

---

### Task 7: Add Gitleaks + Socket Security Workflows

**Files:**
- Create: `.github/workflows/gitleaks.yml`
- Create: `.github/workflows/socket-security.yml`

**Step 1: Create Gitleaks workflow**

```yaml
name: Gitleaks Secret Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 3 * * 1'  # Weekly Monday 3 AM UTC
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  gitleaks:
    name: Gitleaks Secret Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2: Create Socket Security workflow**

```yaml
name: Socket Security

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 4 * * 1'  # Weekly Monday 4 AM UTC
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  socket:
    name: Socket Security Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: SocketDev/socket-security-action@v1
        with:
          npm_package_json: package.json
```

**Step 3: Commit**

```bash
git add .github/workflows/gitleaks.yml .github/workflows/socket-security.yml
git commit -m "ci: add Gitleaks and Socket Security scanning workflows

Completes 6/6 required security scanning layers:
CodeQL, Semgrep, Trivy, OSSF Scorecard, Gitleaks, Socket Security."
```

---

### Task 8: Make ESLint/Prettier Blocking in CI

**Files:**
- Modify: `.github/workflows/ci.yml` (lines 32, 36)

**Step 1: Remove continue-on-error from lint and format steps**

In `.github/workflows/ci.yml`, remove `continue-on-error: true` from both steps.

OLD (lines 30-36):
```yaml
      - name: Run ESLint
        run: npm run lint
        continue-on-error: true

      - name: Check formatting
        run: npm run format:check
        continue-on-error: true
```

NEW:
```yaml
      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format:check
```

**Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: make ESLint and Prettier checks blocking in CI

Previously set to continue-on-error, now properly gates merges."
```

---

### Task 9: Improve Tool Descriptions (Edge Cases & Composability)

**Files:**
- Modify: `src/tools/index.ts`

**Step 1: Update all 7 tool descriptions to include edge cases, output semantics, composability, and when NOT to use**

Replace the `registerTools()` function body with enhanced descriptions. Key changes per tool:

1. **search_ot_requirements** — Add: "Returns ranked results with snippet and relevance score (0-1). Use this as an entry point for discovery. Chain results into get_ot_requirement for full details. Returns empty array (not error) when no matches found. NOT for retrieving a specific known requirement by ID — use get_ot_requirement instead."

2. **get_ot_requirement** — Add: "Returns null (not error) when requirement not found. Includes cross-standard mappings by default. Use after search_ot_requirements to get full details, or directly when you know the exact requirement_id and standard. Output includes mappings to other frameworks — chain into get_ot_requirement for mapped requirements."

3. **list_ot_standards** — Add: "Returns all standards with requirement counts. Use first to discover available standards and their IDs before calling other tools. Note: IEC 62443 data is user-supplied and may not be present in all installations."

4. **get_mitre_ics_technique** — Add: "Returns null when technique not found. Includes mitigations by default. Use map_to_standards to see which OT requirements address this technique. Chain: search_ot_requirements → find a threat → get_mitre_ics_technique for attack details → get_ot_requirement for mitigation controls."

5. **map_security_level_requirements** — Add: "Returns requirements applicable to the specified IEC 62443 security level. SL-1 (casual) through SL-4 (nation-state). Higher levels include all lower-level requirements. Returns empty array if no IEC 62443 data is loaded. NOT useful without IEC 62443 data — check list_ot_standards first."

6. **get_zone_conduit_guidance** — Add: "Returns Purdue Model network segmentation guidance. All parameters optional — omit all for complete guidance. Returns zones, conduits, and data flows as structured objects plus a markdown guidance summary. Use after identifying security level requirements to understand network architecture implications."

7. **get_requirement_rationale** — Add: "Returns comprehensive context: why the requirement exists, which threats it addresses, regulatory drivers, sector applicability, and related requirements from other standards. Requires both requirement_id and standard. Returns null when not found. Use after get_ot_requirement when you need to explain or justify a requirement to stakeholders."

**Step 2: Commit**

```bash
git add src/tools/index.ts
git commit -m "docs: enhance tool descriptions with edge cases, composability, and output semantics

All 7 tools now document: when to use, when NOT to use, output format,
null/empty return semantics, and chaining guidance for LLM agents."
```

---

### Task 10: Update SECURITY.md Supported Versions

**Files:**
- Modify: `SECURITY.md` (lines 8-10)

**Step 1: Update version table**

OLD:
```markdown
| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :x:                |
```

NEW:
```markdown
| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :x:                |
| 0.1.x   | :x:                |
```

**Step 2: Commit**

```bash
git add SECURITY.md
git commit -m "docs: update SECURITY.md supported versions to 0.4.x/0.3.x"
```

---

### Task 11: Add db_metadata Table Population

**Files:**
- Modify: `src/database/schema.sql` — Already has `metadata` table (line 209), but audit expects `db_metadata`
- Create: `scripts/populate-metadata.ts`

**Step 1: Rename `metadata` table to `db_metadata` in schema.sql**

Change line 209 from:
```sql
CREATE TABLE IF NOT EXISTS metadata (
```
to:
```sql
CREATE TABLE IF NOT EXISTS db_metadata (
```

**Step 2: Update any references to `metadata` table in the codebase**

Search for any code that references the `metadata` table and update to `db_metadata`.

**Step 3: Add metadata population to ingestion scripts**

Create a small helper that populates `db_metadata` after ingestion:

```typescript
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
const rows = db.query<{ key: string; value: string }>('SELECT key, value FROM db_metadata ORDER BY key');
for (const row of rows) {
  console.log(`  ${row.key}: ${row.value}`);
}

db.close();
```

**Step 4: Add npm script**

Add to `package.json` scripts:
```json
"populate:metadata": "tsx scripts/populate-metadata.ts"
```

**Step 5: Update tests that reference the `metadata` table**

Search and replace `metadata` → `db_metadata` in test assertions (if any).

**Step 6: Commit**

```bash
git add src/database/schema.sql scripts/populate-metadata.ts package.json
git commit -m "feat: rename metadata table to db_metadata, add population script

Aligns with audit standard expectation for db_metadata table with
schema_version, tier, and data currency fields."
```

---

### Task 12: Final Verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All previously-passing tests still pass. Database lock errors resolved. Golden contract tests skipped (no production DB in worktree).

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors (or fix any that appear).

**Step 4: Run format check**

Run: `npm run format:check`
Expected: All files formatted correctly (or run `npm run format` to fix).

**Step 5: Verify all version references**

Run: `grep -rn "0\.3\.1" src/ server.json manifest.json package.json`
Expected: No output (no stale version references).

**Step 6: Verify security workflow count**

Run: `ls .github/workflows/`
Expected: 8 workflow files: ci.yml, security.yml, trivy.yml, ossf-scorecard.yml, publish.yml, mcpb-bundle.yml, gitleaks.yml, socket-security.yml

**Step 7: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification pass for production audit compliance"
```

---

## Summary of Changes

| Task | Files Changed | Audit Phase Addressed |
|------|--------------|----------------------|
| 1. Version sync | server.json, index.ts | 4.5 |
| 2. Fix DB locking | 17 test files + helper | 4.2 |
| 3. sources.yml | sources.yml | 2.1, 4.1 |
| 4. Golden tests | fixtures/golden-tests.json, test runner | 2.7, 4.2 |
| 5. Drift hashes | fixtures/golden-hashes.json, generator | 2.7 |
| 6. check-updates | scripts/check-updates.ts | 2.2, 4.7 |
| 7. Security workflows | 2 new GitHub Actions | 4.6 |
| 8. CI strictness | ci.yml | 4.2 |
| 9. Tool descriptions | src/tools/index.ts | 1.2, 1.3 |
| 10. SECURITY.md | SECURITY.md | 4.1 |
| 11. db_metadata | schema.sql, populate script | 2.2 |
| 12. Final verify | verification only | All |

**Expected Grade After Remediation: A- to A** (remaining gaps: no Vercel deployment for dual-channel, which is an infrastructure decision)

Plan complete and saved to `docs/plans/2026-02-17-production-audit-remediation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
