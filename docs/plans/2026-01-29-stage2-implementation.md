# Stage 2 Implementation Plan: IEC 62443 + NIST 800-53/800-82

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive OT security standards (IEC 62443 + NIST) enabling full requirement search, comparison, and security level analysis

**Architecture:** User-supplied IEC 62443 via JSON template + automated NIST 800-53/800-82 ingestion. Normalized zones/conduits schema. 3 new tools + 4 enhanced tools.

**Tech Stack:** TypeScript 5.9+, better-sqlite3, @modelcontextprotocol/sdk 1.25.3+, Vitest 4.0+, NIST OSCAL JSON

---

## Overview

Stage 2 delivers comprehensive OT security standards coverage by adding:
- IEC 62443-3-3, 4-2, 3-2 (~170 requirements + zones/conduits)
- NIST 800-53 Rev 5 (~200 OT-relevant controls)
- NIST 800-82 Rev 3 (OT guidance)
- 3 new tools + 4 existing tools fully activated
- ~350+ requirements searchable across all standards

**Time estimate:** 4 weeks (15 tasks)

---

## Implementation Tasks

### Task 1: Update Database Schema (Zones & Conduits)
- Add 4 new tables: zones, conduits, zone_conduit_flows, reference_architectures
- Add indexes for performance
- Write migration tests

### Task 2: NIST 800-53 OSCAL Ingestion Script
- Fetch and parse NIST OSCAL catalog from GitHub
- Filter to ~200 OT-relevant controls
- Populate ot_requirements table
- Write unit tests

### Task 3: NIST 800-82 Ingestion Script
- Extract OT guidance from NIST 800-82
- Link to 800-53 controls
- Populate with OT context
- Write unit tests

### Task 4: IEC 62443 JSON Schema Definition
- Define strict JSON schema for all 3 IEC parts
- Create validation script
- Write example templates
- Write unit tests for validation

### Task 5: IEC 62443 Ingestion Script
- Build JSON parser with validation
- Populate ot_requirements and security_levels tables
- Handle requirement enhancements (REs)
- Write unit tests

### Task 6: IEC 62443-3-2 Zones/Conduits Ingestion
- Populate zones, conduits, flows, architectures tables
- Reference architecture data (ISA95, Purdue)
- Write unit tests

### Task 7: Implement map_security_level_requirements Tool
- Query requirements by security level (1-4)
- Filter by component type
- Include/exclude enhancements
- Write unit tests

### Task 8: Implement get_zone_conduit_guidance Tool
- Query zones by Purdue level
- Query conduits and flows
- Return reference architectures
- Write unit tests

### Task 9: Implement get_requirement_rationale Tool
- Return detailed rationale for requirements
- Link regulatory drivers
- Risk mitigation context
- Write unit tests

### Task 10: Update search_ot_requirements Tool
- Enable search across ~350 requirements
- Update security level filter logic
- Update component type filter
- Write integration tests

### Task 11: Update get_ot_requirement Tool
- Handle IEC/NIST requirements
- Populate security_levels array
- Test with real data
- Write integration tests

### Task 12: Update list_ot_standards Tool
- Return 6 standards (was empty)
- Include requirement counts
- Write integration tests

### Task 13: Update get_mitre_ics_technique Tool
- Enable map_to_standards functionality
- Map to IEC/NIST requirements
- Write integration tests

### Task 14: Documentation (Ingestion Guides + Tool Ref)
- IEC 62443 ingestion guide (PDF → JSON)
- NIST ingestion guide
- Update tool reference docs
- Update README

### Task 15: Final Integration Testing & Package
- E2E workflow tests
- Data integrity verification
- Performance testing
- Tag v0.2.0 release

---

## Detailed Implementation Guide

### Task 1: Update Database Schema (Zones & Conduits)

**Files:**
- Modify: `src/database/schema.sql` (append new tables)
- Test: `tests/unit/database.test.ts` (add schema tests)

**Step 1: Write failing schema tests**

Add to `tests/unit/database.test.ts`:

```typescript
describe('Zones and Conduits Schema', () => {
  it('should create zones table with correct structure', async () => {
    const db = new DatabaseClient(':memory:');

    // Insert test zone
    db.run(`
      INSERT INTO zones (name, purdue_level, security_level_target, description)
      VALUES (?, ?, ?, ?)
    `, ['SCADA DMZ', 3, 2, 'Demilitarized zone for SCADA servers']);

    // Verify
    const zone = db.queryOne<any>('SELECT * FROM zones WHERE name = ?', ['SCADA DMZ']);
    expect(zone).toBeDefined();
    expect(zone.purdue_level).toBe(3);
    expect(zone.security_level_target).toBe(2);
  });

  it('should enforce unique zone name + purdue_level', async () => {
    const db = new DatabaseClient(':memory:');

    db.run(`INSERT INTO zones (name, purdue_level) VALUES (?, ?)`, ['Zone A', 2]);

    // Duplicate should fail
    expect(() => {
      db.run(`INSERT INTO zones (name, purdue_level) VALUES (?, ?)`, ['Zone A', 2]);
    }).toThrow();
  });

  it('should create conduits table with correct structure', async () => {
    const db = new DatabaseClient(':memory:');

    db.run(`
      INSERT INTO conduits (name, conduit_type, description)
      VALUES (?, ?, ?)
    `, ['Firewall', 'filtered_bidirectional', 'Deep packet inspection firewall']);

    const conduit = db.queryOne<any>('SELECT * FROM conduits WHERE name = ?', ['Firewall']);
    expect(conduit).toBeDefined();
    expect(conduit.conduit_type).toBe('filtered_bidirectional');
  });

  it('should create zone_conduit_flows with foreign keys', async () => {
    const db = new DatabaseClient(':memory:');

    const zone1Id = db.run(`INSERT INTO zones (name, purdue_level) VALUES (?, ?)`, ['Zone 1', 2]).lastInsertRowid;
    const zone2Id = db.run(`INSERT INTO zones (name, purdue_level) VALUES (?, ?)`, ['Zone 2', 3]).lastInsertRowid;
    const conduitId = db.run(`INSERT INTO conduits (name, conduit_type) VALUES (?, ?)`, ['Firewall', 'filtered']).lastInsertRowid;

    db.run(`
      INSERT INTO zone_conduit_flows (source_zone_id, target_zone_id, conduit_id, data_flow_description)
      VALUES (?, ?, ?, ?)
    `, [zone1Id, zone2Id, conduitId, 'Process data to SCADA']);

    const flow = db.queryOne<any>('SELECT * FROM zone_conduit_flows WHERE source_zone_id = ?', [zone1Id]);
    expect(flow).toBeDefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test tests/unit/database.test.ts`
Expected: FAIL - tables don't exist yet

**Step 3: Add new tables to schema.sql**

Append to `src/database/schema.sql` (after mitre tables, before final comment):

```sql
-- =============================================================================
-- Zones and Conduits (IEC 62443-3-2)
-- =============================================================================

-- Zone definitions (Purdue model levels 0-5)
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  purdue_level INTEGER CHECK (purdue_level >= 0 AND purdue_level <= 5),
  security_level_target INTEGER CHECK (security_level_target IN (1, 2, 3, 4)),
  description TEXT,
  iec_reference TEXT,
  typical_assets TEXT,
  UNIQUE(name, purdue_level)
);

-- Conduit types (network connections between zones)
CREATE TABLE IF NOT EXISTS conduits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  conduit_type TEXT NOT NULL,
  security_requirements TEXT,
  description TEXT,
  iec_reference TEXT,
  minimum_security_level INTEGER CHECK (minimum_security_level IN (1, 2, 3, 4)),
  UNIQUE(name, conduit_type)
);

-- Zone-to-zone flows via conduits
CREATE TABLE IF NOT EXISTS zone_conduit_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_zone_id INTEGER NOT NULL,
  target_zone_id INTEGER NOT NULL,
  conduit_id INTEGER NOT NULL,
  data_flow_description TEXT,
  security_level_requirement INTEGER CHECK (security_level_requirement IN (1, 2, 3, 4)),
  bidirectional BOOLEAN DEFAULT 0,
  FOREIGN KEY (source_zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (target_zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (conduit_id) REFERENCES conduits(id) ON DELETE CASCADE
);

-- Reference architectures
CREATE TABLE IF NOT EXISTS reference_architectures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  diagram_url TEXT,
  applicable_zones TEXT,
  iec_reference TEXT,
  industry_applicability TEXT
);

-- Indexes for zone/conduit queries
CREATE INDEX IF NOT EXISTS idx_zones_purdue ON zones(purdue_level);
CREATE INDEX IF NOT EXISTS idx_zones_sl_target ON zones(security_level_target);
CREATE INDEX IF NOT EXISTS idx_flows_source ON zone_conduit_flows(source_zone_id);
CREATE INDEX IF NOT EXISTS idx_flows_target ON zone_conduit_flows(target_zone_id);
```

**Step 4: Run tests to verify they pass**

Run: `npm test tests/unit/database.test.ts`
Expected: PASS - all 4 new tests passing

**Step 5: Commit**

```bash
git add src/database/schema.sql tests/unit/database.test.ts
git commit -m "feat: add zones and conduits tables for IEC 62443-3-2

- Add zones table (Purdue levels 0-5)
- Add conduits table (connection types)
- Add zone_conduit_flows junction table
- Add reference_architectures table
- Add indexes for performance
- Tests verify schema constraints"
```

---

### Task 2: NIST 800-53 OSCAL Ingestion Script

**Files:**
- Create: `scripts/ingest-nist-80053.ts`
- Create: `tests/unit/ingest-nist-80053.test.ts`

**Step 1: Write failing tests**

Create `tests/unit/ingest-nist-80053.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { Nist80053Ingester } from '../../scripts/ingest-nist-80053.js';
import { existsSync, unlinkSync } from 'fs';

describe('Nist80053Ingester', () => {
  const testDbPath = 'tests/data/test-nist-80053.db';
  let db: DatabaseClient;

  beforeEach(() => {
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
    db = new DatabaseClient(testDbPath);
  });

  afterEach(() => {
    db.close();
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
  });

  it('should parse OSCAL catalog JSON', () => {
    const ingester = new Nist80053Ingester(db);

    const mockOscal = {
      catalog: {
        metadata: {
          title: 'NIST SP 800-53 Rev 5',
          version: 'Rev 5'
        },
        groups: [
          {
            id: 'ac',
            title: 'Access Control',
            controls: [
              {
                id: 'ac-1',
                title: 'Policy and Procedures',
                props: [{ name: 'label', value: 'AC-1' }],
                parts: [
                  { id: 'ac-1_smt', name: 'statement', prose: 'Develop access control policies...' }
                ]
              }
            ]
          }
        ]
      }
    };

    const controls = ingester.parseOscalCatalog(mockOscal);
    expect(controls).toHaveLength(1);
    expect(controls[0].control_id).toBe('AC-1');
    expect(controls[0].title).toBe('Policy and Procedures');
  });

  it('should filter to OT-relevant control families', () => {
    const ingester = new Nist80053Ingester(db);

    const controls = [
      { control_id: 'AC-1', family: 'AC' },  // OT-relevant
      { control_id: 'AT-1', family: 'AT' },  // Not OT-relevant (Awareness Training)
      { control_id: 'IA-2', family: 'IA' }   // OT-relevant
    ];

    const filtered = ingester.filterOtRelevantControls(controls);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(c => c.control_id)).toEqual(['AC-1', 'IA-2']);
  });

  it('should ingest controls into database', async () => {
    const ingester = new Nist80053Ingester(db);

    // Insert nist-800-53 standard first
    db.run(`
      INSERT INTO ot_standards (id, name, version, status)
      VALUES ('nist-800-53', 'NIST SP 800-53', 'Rev 5', 'current')
    `);

    const mockControls = [
      {
        control_id: 'AC-2',
        title: 'Account Management',
        description: 'The organization manages information system accounts...',
        family: 'AC'
      }
    ];

    ingester.ingestControls(mockControls);

    const control = db.queryOne<any>(
      'SELECT * FROM ot_requirements WHERE standard_id = ? AND requirement_id = ?',
      ['nist-800-53', 'AC-2']
    );

    expect(control).toBeDefined();
    expect(control.title).toBe('Account Management');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test tests/unit/ingest-nist-80053.test.ts`
Expected: FAIL - Nist80053Ingester doesn't exist

**Step 3: Implement NIST 800-53 ingestion script**

Create `scripts/ingest-nist-80053.ts`:

```typescript
#!/usr/bin/env node

import { DatabaseClient } from '../src/database/client.js';

const NIST_OSCAL_URL = 'https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json';

// OT-relevant control families
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

interface OscalControl {
  id: string;
  title: string;
  props?: Array<{ name: string; value: string }>;
  parts?: Array<{ id: string; name: string; prose?: string }>;
}

interface NistControl {
  control_id: string;
  title: string;
  description: string;
  family: string;
}

export class Nist80053Ingester {
  constructor(private db: DatabaseClient) {}

  async fetchOscalCatalog(): Promise<any> {
    console.log(`Fetching NIST 800-53 OSCAL catalog from: ${NIST_OSCAL_URL}`);

    const response = await fetch(NIST_OSCAL_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched OSCAL catalog: ${data.catalog.metadata.title}`);
    return data;
  }

  parseOscalCatalog(oscal: any): NistControl[] {
    const controls: NistControl[] = [];

    for (const group of oscal.catalog.groups) {
      const family = group.id.toUpperCase();

      for (const control of group.controls || []) {
        // Get control ID from props
        const labelProp = control.props?.find((p: any) => p.name === 'label');
        const controlId = labelProp?.value || control.id.toUpperCase();

        // Get statement/description
        const statementPart = control.parts?.find((p: any) => p.name === 'statement');
        const description = statementPart?.prose || '';

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

  filterOtRelevantControls(controls: NistControl[]): NistControl[] {
    const filtered = controls.filter(c => OT_RELEVANT_FAMILIES.includes(c.family));
    console.log(`Filtered to ${filtered.length} OT-relevant controls`);
    return filtered;
  }

  ingestControls(controls: NistControl[]): void {
    console.log(`Ingesting ${controls.length} controls...`);

    for (const control of controls) {
      this.db.run(`
        INSERT OR REPLACE INTO ot_requirements (
          standard_id,
          requirement_id,
          title,
          description,
          component_type
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        'nist-800-53',
        control.control_id,
        control.title,
        control.description,
        control.family.toLowerCase()
      ]);
    }

    console.log(`Ingested ${controls.length} controls`);
  }

  async ingestAll(): Promise<void> {
    console.log('Starting NIST 800-53 ingestion...\n');

    try {
      // Ensure standard exists
      this.db.run(`
        INSERT OR IGNORE INTO ot_standards (id, name, version, published_date, url, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'nist-800-53',
        'NIST SP 800-53: Security and Privacy Controls',
        'Rev 5',
        '2020-09-01',
        'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
        'current'
      ]);

      // Fetch and parse
      const oscal = await this.fetchOscalCatalog();
      const allControls = this.parseOscalCatalog(oscal);
      const otControls = this.filterOtRelevantControls(allControls);

      // Ingest in transaction
      this.db.transaction(() => {
        this.ingestControls(otControls);
      })();

      // Report
      const count = this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
        ['nist-800-53']
      );

      console.log('\n=== Ingestion Complete ===');
      console.log(`NIST 800-53 controls ingested: ${count?.count || 0}`);
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

  const ingester = new Nist80053Ingester(db);

  ingester.ingestAll()
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
```

**Step 4: Run tests to verify they pass**

Run: `npm test tests/unit/ingest-nist-80053.test.ts`
Expected: PASS - all tests passing

**Step 5: Add npm script and test manual ingestion**

Add to `package.json` scripts:
```json
"ingest:nist-80053": "tsx scripts/ingest-nist-80053.ts"
```

Run: `npm run ingest:nist-80053`
Expected: ~200 controls ingested successfully

**Step 6: Commit**

```bash
git add scripts/ingest-nist-80053.ts tests/unit/ingest-nist-80053.test.ts package.json
git commit -m "feat: add NIST 800-53 OSCAL ingestion script

- Fetch NIST 800-53 Rev 5 catalog from GitHub (OSCAL format)
- Parse controls from OSCAL JSON structure
- Filter to 12 OT-relevant control families (~200 controls)
- Ingest into ot_requirements table
- Comprehensive unit tests
- CLI script: npm run ingest:nist-80053"
```

---

**Note:** The remaining 13 tasks follow the same TDD pattern:
1. Write failing tests
2. Verify they fail
3. Implement minimal code
4. Verify tests pass
5. Commit with clear message

Due to length constraints, I'm providing the high-level structure for tasks 3-15. Each would have the same detailed step-by-step breakdown as tasks 1-2.

---

### Tasks 3-15 Summary (High-Level)

**Task 3: NIST 800-82 Ingestion**
- Similar structure to Task 2
- Parse 800-82 recommendations
- Link to 800-53 controls

**Task 4: IEC 62443 JSON Schema**
- JSON schema validator
- Example templates for each IEC part
- Strict validation rules

**Task 5: IEC 62443 Ingestion**
- Parse user JSON
- Populate requirements + security_levels
- Handle REs (requirement enhancements)

**Task 6: Zones/Conduits Ingestion**
- Populate 4 new tables
- Reference architectures (ISA95, Purdue)

**Task 7-9: New Tools**
- map_security_level_requirements
- get_zone_conduit_guidance
- get_requirement_rationale

**Task 10-13: Tool Updates**
- Update 4 existing tools for new data

**Task 14: Documentation**
- Ingestion guides
- Updated tool reference

**Task 15: Integration & Package**
- E2E tests
- v0.2.0 release

---

## Success Criteria

**Stage 2 Complete When:**
- ✅ All 15 tasks implemented
- ✅ 250+ tests passing (100 new + 153 existing)
- ✅ NIST data ingested (~200 controls)
- ✅ IEC 62443 template ready and documented
- ✅ 3 new tools functional
- ✅ 4 existing tools updated
- ✅ Comprehensive documentation
- ✅ v0.2.0 tagged

---

**End of Stage 2 Implementation Plan**
