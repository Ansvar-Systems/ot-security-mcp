# OT Security MCP Server - Complete Design

**Author:** Claude + Jeffrey von Rotz
**Date:** 2026-01-29
**Status:** Design complete, ready for implementation

---

## Executive Summary

The OT Security MCP Server provides AI-native access to operational technology security standards: IEC 62443, NIST SP 800-82, MITRE ATT&CK for ICS, and NERC CIP. Built for industrial control systems, manufacturing, energy, water, and critical infrastructure sectors.

**Value proposition:**
- IEC 62443 tooling (first MCP for this standard)
- NIS2 → critical infrastructure → OT security (natural EU regs cross-sell)
- MITRE ATT&CK for ICS threat intelligence integrated
- Cross-standard mappings (the moat)

**Technology:** TypeScript + SQLite, following EU Regulations MCP pattern

---

## 1. Architecture Overview

### Core Components

**Technology Stack:**
- **MCP Server** - `@modelcontextprotocol/sdk` v1.25.3+
- **Database** - SQLite with better-sqlite3
- **Runtime** - Node.js 18+
- **Build** - TypeScript 5.9+
- **Testing** - Vitest 4.0+

**Package Structure:**
```
ot-security-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # Tool implementations
│   │   ├── search.ts
│   │   ├── iec62443.ts
│   │   ├── mitre.ts
│   │   └── mappings.ts
│   ├── database/             # SQLite wrapper + queries
│   │   ├── client.ts
│   │   └── schema.sql
│   └── types/                # TypeScript definitions
│       └── index.ts
├── scripts/
│   ├── ingest-mitre-ics.ts   # Automated: MITRE API
│   ├── ingest-nist-80082.ts  # Automated: NIST scraper
│   ├── ingest-iec62443.ts    # Manual: PDF parser
│   ├── check-updates.ts      # Daily update checker
│   └── send-weekly-digest.ts # Email summary
├── data/
│   └── ot-security.db        # Pre-built SQLite database
├── tests/
│   ├── unit/
│   ├── integration/
│   └── data/
└── docs/
    ├── coverage.md
    ├── tools.md
    └── use-cases.md
```

### Database Schema

```sql
-- Standards registry with version tracking
CREATE TABLE ot_standards (
  id TEXT PRIMARY KEY,          -- "iec62443-3-3", "nist80082"
  name TEXT NOT NULL,
  version TEXT,                 -- "v2.0", "r3"
  published_date TEXT,
  url TEXT,
  status TEXT,                  -- "current", "superseded"
  notes TEXT
);

-- Requirements/controls with granular metadata
CREATE TABLE ot_requirements (
  id INTEGER PRIMARY KEY,
  standard_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL, -- "SR 1.1", "SR 1.1 RE 1"
  parent_requirement_id TEXT,   -- For REs linking to base SR
  title TEXT,
  description TEXT,
  rationale TEXT,               -- Why requirement exists
  component_type TEXT,          -- host/network/embedded/app
  purdue_level INTEGER,         -- 0-5 (nullable)
  FOREIGN KEY (standard_id) REFERENCES ot_standards(id)
);

-- IEC 62443 security level mappings
CREATE TABLE security_levels (
  id INTEGER PRIMARY KEY,
  requirement_id TEXT NOT NULL,
  security_level INTEGER NOT NULL, -- 1, 2, 3, 4
  sl_type TEXT,                 -- "SL-T", "SL-C", "SL-A"
  capability_level INTEGER,
  notes TEXT,
  FOREIGN KEY (requirement_id) REFERENCES ot_requirements(requirement_id)
);

-- Cross-standard mappings (the moat)
CREATE TABLE ot_mappings (
  id INTEGER PRIMARY KEY,
  source_standard TEXT NOT NULL,
  source_requirement TEXT NOT NULL,
  target_standard TEXT NOT NULL,
  target_requirement TEXT NOT NULL,
  mapping_type TEXT NOT NULL,   -- "exact_match", "partial", etc.
  confidence REAL,              -- 0.0-1.0
  notes TEXT,
  created_date TEXT
);

-- Zones and conduits guidance
CREATE TABLE zones_conduits (
  id INTEGER PRIMARY KEY,
  zone_name TEXT,
  purdue_level INTEGER,
  security_level_target INTEGER,
  conduit_type TEXT,
  guidance_text TEXT,
  iec_reference TEXT,
  reference_architecture TEXT
);

-- MITRE ATT&CK for ICS
CREATE TABLE mitre_ics_techniques (
  technique_id TEXT PRIMARY KEY, -- "T0800"
  tactic TEXT,
  name TEXT,
  description TEXT,
  platforms TEXT,                -- JSON array
  data_sources TEXT              -- JSON array
);

CREATE TABLE mitre_ics_mitigations (
  mitigation_id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT
);

CREATE TABLE mitre_technique_mitigations (
  technique_id TEXT,
  mitigation_id TEXT,
  ot_requirement_id TEXT,        -- Maps to IEC/NIST
  FOREIGN KEY (technique_id) REFERENCES mitre_ics_techniques(technique_id),
  FOREIGN KEY (mitigation_id) REFERENCES mitre_ics_mitigations(mitigation_id)
);

-- Sector applicability engine
CREATE TABLE sector_applicability (
  id INTEGER PRIMARY KEY,
  sector TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  standard TEXT NOT NULL,
  applicability TEXT NOT NULL,
  threshold TEXT,
  regulatory_driver TEXT,
  effective_date TEXT,
  notes TEXT
);
```

---

## 2. Tool Definitions

### Design Principle
Pure reference layer - stateless, generic, reusable. No Ansvar-specific coupling.

### Core Query Tools

**search_ot_requirements()**
```typescript
search_ot_requirements(
  query: string,
  options?: {
    standards?: string[],
    security_level?: number,
    component_type?: string,
    sector?: string,
    limit?: number
  }
): Promise<Requirement[]>
```

**get_ot_requirement()**
```typescript
get_ot_requirement(
  requirement_id: string,
  standard: string,
  options?: {
    version?: string,
    include_mappings?: boolean
  }
): Promise<RequirementDetail>
```

**list_ot_standards()**
```typescript
list_ot_standards(): Promise<Standard[]>
```

**get_standard_requirements()**
```typescript
get_standard_requirements(
  standard: string,
  options?: {
    version?: string,
    security_level?: number
  }
): Promise<Requirement[]>
```

### IEC 62443-Specific Tools

**map_security_level_requirements()**
```typescript
map_security_level_requirements(
  security_level: number,
  options?: {
    component_type?: string,
    include_enhancements?: boolean
  }
): Promise<Requirement[]>
```

**get_zone_conduit_guidance()**
```typescript
get_zone_conduit_guidance(
  options?: {
    purdue_level?: number,
    security_level?: number,
    reference_architecture?: string
  }
): Promise<ZoneGuidance>
```

### Cross-Standard Analysis Tools

**compare_ot_requirements()**
```typescript
compare_ot_requirements(
  requirement_ids: string[],
  standards: string[],
  options?: {
    show_mappings?: boolean
  }
): Promise<ComparisonResult>
```

**map_nerc_to_iec62443()**
```typescript
map_nerc_to_iec62443(
  cip_requirement: string
): Promise<Mapping[]>
```

### Threat Intelligence Tools

**get_mitre_ics_technique()**
```typescript
get_mitre_ics_technique(
  technique_id: string,
  options?: {
    include_mitigations?: boolean,
    map_to_standards?: string[]
  }
): Promise<MitreTechnique>
```

**map_threats_to_requirements()**
```typescript
map_threats_to_requirements(
  threat_ids: string[],
  options?: {
    threat_framework?: "mitre_ics" | "stride",
    target_standard?: string
  }
): Promise<ThreatMapping[]>
```

### Implementation & Context Tools

**get_nerc_cip_requirements()**
```typescript
get_nerc_cip_requirements(
  options?: {
    asset_type?: string,
    impact_rating?: string
  }
): Promise<Requirement[]>
```

**get_implementation_guidance()**
```typescript
get_implementation_guidance(
  requirement_id: string,
  standard: string,
  options?: {
    context?: string
  }
): Promise<ImplementationGuidance>
```

**get_requirement_rationale()**
```typescript
get_requirement_rationale(
  requirement_id: string,
  standard: string
): Promise<Rationale>
```

---

## 3. Implementation Staging

### Stage 1: Foundation + Automated Sources (Weeks 1-2)

**Deliverable:** Working MCP with MITRE ATT&CK ICS + NIST SP 800-82

**Data sources:**
- MITRE ATT&CK for ICS (JSON API, ~200 techniques, ~50 mitigations)
- NIST SP 800-82 Rev 3 (PDF/HTML scraping, chapters 5, 6, appendix G)

**Tools implemented:**
- search_ot_requirements
- get_ot_requirement
- list_ot_standards
- get_mitre_ics_technique

### Stage 2: IEC 62443 Core (Weeks 3-4)

**Deliverable:** Security level calculator + zone/conduit guidance

**Data sources (manual):**
- IEC 62443-3-3 (Security Level Requirements)
- IEC 62443-4-2 (Component Requirements)
- IEC 62443-3-2 (Zones & Conduits)

**Copyright strategy:** Store IDs + summaries (fair use), optional full-text for licensed users

**Tools implemented:**
- map_security_level_requirements
- get_zone_conduit_guidance
- get_requirement_rationale

### Stage 3: Full IEC 62443 + Rich Mappings (Weeks 5-6)

**Data sources:**
- IEC 62443-2-4 (Supplier Requirements - DORA relevance)
- Cross-standard mapping curation (IEC ↔ NIST ↔ ISO 27001)

**Tools implemented:**
- compare_ot_requirements
- map_threats_to_requirements

### Stage 4: Regional/Sector Specific (Weeks 7-8)

**Data sources:**
- NERC CIP (optional, US energy sector)
- EU regulations crosswalk (NIS2, DORA, CRA)
- Sector applicability data

**Tools implemented:**
- get_nerc_cip_requirements
- map_nerc_to_iec62443
- Sector filtering in core tools

---

## 4. Update Automation

### Daily Automated Checks (GitHub Actions)

**MITRE ATT&CK for ICS:**
- Check: GitHub API for new releases
- Frequency: Daily check, quarterly updates
- Action: Auto-commit + auto-PR

**NIST SP 800-82:**
- Check: Last-modified header
- Frequency: Daily check, 2-3 year updates
- Action: GitHub issue for manual review

**IEC 62443:**
- Check: ISA website scraping for versions
- Frequency: Weekly check, 3-5 year updates
- Action: Add to weekly digest

### Weekly Digest Email

**Schedule:** Sunday 8 PM CET
**Recipient:** jeffrey.von.rotz@ansvar.eu
**Content:** Batched updates, urgency indicators, actionable commands

---

## 5. Copyright & Licensing

**Code:** Apache License 2.0

**Data:**
- **IEC 62443:** Summaries only (fair use), full text requires license
- **MITRE ATT&CK:** Apache 2.0
- **NIST:** Public domain
- **NERC CIP:** Publicly available

---

## 6. Cross-MCP Integration

**Works with:**
- EU Regulations MCP (NIS2, DORA, CRA crosswalk)
- Security Controls MCP (ISO 27001, NIST CSF mappings)

**Integration pattern:** Loose coupling - Claude orchestrates, each MCP is independent

---

## 7. Success Criteria

**Stage 1:**
- ✅ MCP server responds to tool calls
- ✅ MITRE ATT&CK data queryable
- ✅ NIST 800-82 guidance accessible
- ✅ Tests passing (80%+ coverage)

**Stage 2:**
- ✅ IEC 62443 SL-2 requirements query returns 67 items
- ✅ Zone/conduit guidance available
- ✅ Requirement rationale populated

**Stage 3:**
- ✅ Cross-standard comparison working
- ✅ MITRE ↔ IEC mappings functional
- ✅ Mapping confidence scores validated

**Stage 4:**
- ✅ Sector applicability queries accurate
- ✅ Multi-MCP queries work seamlessly
- ✅ Weekly digest email delivered

---

## 8. Next Steps

1. ✅ Design document complete (this file)
2. → Create implementation plan (superpowers:writing-plans)
3. → Set up repository structure
4. → Stage 1 implementation
5. → Code review (superpowers:requesting-code-review)

---

**End of Design Document**
