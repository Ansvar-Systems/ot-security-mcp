# OT Security MCP - Stage 2 Design

**Date:** 2026-01-29
**Status:** Design Complete - Ready for Implementation
**Goal:** Add comprehensive OT security standards (IEC 62443 + NIST) to enable full requirement search, comparison, and security level analysis

---

## Executive Summary

Stage 2 delivers comprehensive OT security standards coverage by adding IEC 62443 (all 3 core parts) and NIST 800-53/800-82. This transforms the MCP from a MITRE-only threat intelligence tool to a complete OT security compliance platform.

**Key Deliverables:**
- IEC 62443-3-3, 4-2, 3-2 (user-supplied via JSON template)
- NIST 800-53 Rev 5 (~200 OT-relevant controls, automated)
- NIST 800-82 Rev 3 (OT guidance, automated)
- 3 new tools + 4 existing tools fully activated
- ~350+ requirements searchable across all standards

**Value Proposition:**
- Complete IEC 62443 security level calculator
- NIST 800-53 control framework for federal compliance
- Zones & conduits architecture guidance
- Cross-standard requirement lookup

---

## 1. Architecture Overview

### Design Principles

**Complete:** All 3 core IEC 62443 parts + full NIST 800-53/800-82 coverage
**Maintainable:** Clear schema, well-documented ingestion processes
**Automatable:** NIST fully automated, IEC with validated JSON template

### Data Sources

**IEC 62443 Standards (User-Supplied):**
- **IEC 62443-3-3** - System Security Requirements (~67 SRs with SL mappings)
  - Security levels 1-4 for each requirement
  - Component type classifications (host, network, embedded, application)
  - Requirement enhancements (REs) for higher security levels

- **IEC 62443-4-2** - Component Requirements (~100+ requirements)
  - Component-specific security requirements
  - Capability levels for each component type
  - Detailed technical requirements

- **IEC 62443-3-2** - Zones & Conduits (Architecture guidance)
  - Purdue model zones (levels 0-5)
  - Conduit types and security requirements
  - Reference architectures (ISA95, ANSI/ISA-99)

**NIST Standards (Automated):**
- **NIST 800-53 Rev 5** - Security and Privacy Controls (~200 OT-relevant)
  - Focus on control families: IA, AC, SC, SI, CM, AU
  - Control parameters and implementation guidance
  - Baseline configurations (LOW, MODERATE, HIGH)

- **NIST 800-82 Rev 3** - OT Implementation Guidance
  - OT-specific control application guidance
  - Maps 800-53 controls to OT environments
  - Chapters 5-6 recommendations

### Copyright & Licensing Strategy

**IEC 62443 (Copyrighted):**
- Standards purchased from ISA (isa.org) - typically $200-400 each
- Users must have their own license to use IEC 62443 data
- We provide JSON template and ingestion script
- Users manually extract data from their licensed PDFs
- MCP functions with or without IEC data (graceful degradation)

**NIST (Public Domain):**
- All NIST publications are public domain
- OSCAL format available on GitHub
- Fully automated ingestion from official sources
- No licensing concerns

---

## 2. Database Schema Changes

### New Tables for Zones & Conduits

**Normalized schema for IEC 62443-3-2 architecture guidance:**

```sql
-- Zone definitions (Purdue model levels 0-5)
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- "Enterprise Network", "SCADA DMZ", "Process Control"
  purdue_level INTEGER CHECK (purdue_level >= 0 AND purdue_level <= 5),
  security_level_target INTEGER CHECK (security_level_target IN (1, 2, 3, 4)),
  description TEXT,
  iec_reference TEXT,                    -- "IEC 62443-3-2 Section 4.2.1"
  typical_assets TEXT,                   -- JSON array: ["HMI", "Historian", "Engineering Workstation"]
  UNIQUE(name, purdue_level)
);

-- Conduit types (network connections between zones)
CREATE TABLE IF NOT EXISTS conduits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- "Firewall with DPI", "Data Diode", "Air Gap"
  conduit_type TEXT NOT NULL,            -- "unidirectional", "filtered_bidirectional", "encrypted_tunnel"
  security_requirements TEXT,             -- JSON array of applicable SR IDs: ["SR 3.1", "SR 4.3"]
  description TEXT,
  iec_reference TEXT,
  minimum_security_level INTEGER,
  UNIQUE(name, conduit_type)
);

-- Zone-to-zone flows via conduits
CREATE TABLE IF NOT EXISTS zone_conduit_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_zone_id INTEGER NOT NULL,
  target_zone_id INTEGER NOT NULL,
  conduit_id INTEGER NOT NULL,
  data_flow_description TEXT,            -- "Process data to SCADA", "Commands from HMI"
  security_level_requirement INTEGER CHECK (security_level_requirement IN (1, 2, 3, 4)),
  bidirectional BOOLEAN DEFAULT 0,
  FOREIGN KEY (source_zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (target_zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (conduit_id) REFERENCES conduits(id) ON DELETE CASCADE
);

-- Reference architectures
CREATE TABLE IF NOT EXISTS reference_architectures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,             -- "ISA95 Level Model", "ANSI/ISA-99", "Purdue Enterprise Reference Architecture"
  description TEXT,
  diagram_url TEXT,                       -- Link to architecture diagram
  applicable_zones TEXT,                  -- JSON array of zone IDs this architecture defines
  iec_reference TEXT,
  industry_applicability TEXT             -- "Manufacturing", "Energy", "Water Treatment"
);

-- Indexes for zone/conduit queries
CREATE INDEX IF NOT EXISTS idx_zones_purdue ON zones(purdue_level);
CREATE INDEX IF NOT EXISTS idx_zones_sl_target ON zones(security_level_target);
CREATE INDEX IF NOT EXISTS idx_flows_source ON zone_conduit_flows(source_zone_id);
CREATE INDEX IF NOT EXISTS idx_flows_target ON zone_conduit_flows(target_zone_id);
```

### Existing Table Updates

**ot_standards table** - Add 5 new records:
```sql
INSERT INTO ot_standards (id, name, version, published_date, url, status) VALUES
  ('iec62443-3-3', 'IEC 62443-3-3: System security requirements and security levels', 'v2.0', '2013-08-01', 'https://www.isa.org/products/iec-62443-3-3-99-03-03-2013-industrial-automat', 'current'),
  ('iec62443-4-2', 'IEC 62443-4-2: Technical security requirements for IACS components', 'v1.0', '2019-02-01', 'https://www.isa.org/products/iec-62443-4-2-2019-security-for-industrial-aut', 'current'),
  ('iec62443-3-2', 'IEC 62443-3-2: Security risk assessment and system design', 'v1.0', '2020-07-01', 'https://www.isa.org/products/iec-62443-3-2-2020-security-for-industrial-aut', 'current'),
  ('nist-800-53', 'NIST SP 800-53: Security and Privacy Controls', 'Rev 5', '2020-09-01', 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final', 'current'),
  ('nist-800-82', 'NIST SP 800-82: Guide to OT Security', 'Rev 3', '2023-09-01', 'https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final', 'current');
```

**ot_requirements table** - Populate with ~350+ requirements:
- IEC 62443-3-3: ~67 system requirements
- IEC 62443-4-2: ~100+ component requirements
- NIST 800-53: ~200 OT-relevant controls

**security_levels table** - Add IEC 62443 SL mappings:
- ~270 mappings (67 SRs × 4 security levels, some SRs don't apply to all levels)
- Each mapping includes: requirement_db_id, security_level (1-4), capability_level, notes

---

## 3. Data Ingestion Strategy

### IEC 62443 Ingestion (User-Supplied)

**Step 1: User obtains IEC 62443 standards**
- Purchase from ISA: https://www.isa.org/standards-and-publications
- Typical cost: $200-400 per standard part
- Delivered as PDF documents

**Step 2: User fills JSON template**

**Template structure for IEC 62443-3-3:**
```json
{
  "standard": "iec62443-3-3",
  "version": "v2.0",
  "published_date": "2013-08-01",
  "requirements": [
    {
      "requirement_id": "SR 1.1",
      "title": "Human user identification and authentication",
      "description": "The control system shall provide the capability to identify and authenticate all human users. This capability shall enforce such identification and authentication on all interfaces which provide human user access to the control system to support segregation of duties and least privilege in accordance with applicable security policies and procedures.",
      "rationale": "Authentication is essential to ensure that only authorized personnel can access the control system. Without proper authentication, unauthorized individuals could gain access and potentially cause harm to the system or process.",
      "component_type": "host",
      "purdue_level": null,
      "parent_requirement_id": null,
      "security_levels": [
        {
          "security_level": 1,
          "sl_type": "SL-C",
          "capability_level": 1,
          "notes": "Unique identification and authentication of all human users"
        },
        {
          "security_level": 2,
          "sl_type": "SL-C",
          "capability_level": 2,
          "notes": "Multi-factor authentication for privileged users"
        },
        {
          "security_level": 3,
          "sl_type": "SL-C",
          "capability_level": 3,
          "notes": "Multi-factor authentication for all users"
        },
        {
          "security_level": 4,
          "sl_type": "SL-C",
          "capability_level": 4,
          "notes": "Enhanced multi-factor authentication with cryptographic mechanisms"
        }
      ]
    },
    {
      "requirement_id": "SR 1.1 RE 1",
      "title": "Unique identification and authentication",
      "description": "The control system shall provide the capability to support unique identification and authentication.",
      "rationale": "Enhancement to SR 1.1 for higher security levels.",
      "component_type": "host",
      "parent_requirement_id": "SR 1.1",
      "security_levels": [
        {
          "security_level": 2,
          "sl_type": "SL-C",
          "capability_level": 1,
          "notes": "Required enhancement for SL-2"
        }
      ]
    }
  ]
}
```

**Step 3: Validate and ingest**

```bash
# Validate JSON schema
npm run validate:iec62443 ./my-iec62443-3-3.json

# Ingest into database
npm run ingest:iec62443 ./my-iec62443-3-3.json

# Verify ingestion
npm run verify:requirements iec62443-3-3
```

**Ingestion script features:**
- JSON schema validation (strict structure enforcement)
- Duplicate requirement ID detection
- Foreign key integrity checks
- Transaction-safe (rollback on any error)
- Detailed logging with line-by-line validation
- Dry-run mode for testing

### NIST 800-53 Ingestion (Automated)

**Data source:** NIST OSCAL catalog (JSON format, public domain)

**Repository:** https://github.com/usnistgov/oscal-content/tree/main/nist.gov/SP800-53/rev5

**Ingestion approach:**

```bash
# Automatic ingestion from GitHub
npm run ingest:nist-80053

# Manual ingestion from local OSCAL file
npm run ingest:nist-80053 ./800-53-catalog.json
```

**Control filtering strategy:**
- Focus on OT-relevant control families:
  - **IA** (Identification and Authentication) - 12 controls
  - **AC** (Access Control) - 25 controls
  - **SC** (System and Communications Protection) - 51 controls
  - **SI** (System and Information Integrity) - 23 controls
  - **CM** (Configuration Management) - 14 controls
  - **AU** (Audit and Accountability) - 16 controls
  - **CA** (Assessment, Authorization, and Monitoring) - 9 controls
  - **CP** (Contingency Planning) - 13 controls
  - **IR** (Incident Response) - 10 controls
  - **MA** (Maintenance) - 7 controls
  - **PE** (Physical and Environmental Protection) - 20 controls
  - **SA** (System and Services Acquisition) - 23 controls

**Total:** ~200 OT-relevant controls

**Data extraction:**
- Control ID (e.g., "AC-2", "IA-2")
- Control title
- Control description (full text)
- Control parameters (configurable values)
- Supplemental guidance
- Control enhancements (e.g., "AC-2(1)", "AC-2(2)")

**Database mapping:**
- Standard: "nist-800-53"
- Requirement ID: Control ID (e.g., "AC-2")
- Title: Control title
- Description: Control statement
- Rationale: Supplemental guidance
- Component type: Derived from control family
- Parent requirement: For control enhancements

### NIST 800-82 Ingestion (Semi-Automated)

**Data source:** NIST SP 800-82 Rev 3 (PDF/HTML, public domain)

**URL:** https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final

**Ingestion approach:**

**Option A: Manual extraction (Stage 2)**
- Extract key recommendations from Chapters 5-6
- Map to applicable NIST 800-53 controls
- Store as "guidance requirements" in ot_requirements table

**Option B: Automated HTML parsing (future enhancement)**
- Parse NIST HTML version
- Extract structured recommendations
- Auto-link to 800-53 controls

**For Stage 2, use Option A:**
- Create JSON template similar to IEC 62443
- Manually extract ~50 key OT recommendations
- Link to 800-53 controls via notes/rationale field

**Example 800-82 entry:**
```json
{
  "standard": "nist-800-82",
  "version": "Rev 3",
  "recommendations": [
    {
      "recommendation_id": "5.2.1",
      "title": "Develop and implement OT-specific security policies",
      "description": "Organizations should develop security policies that address the unique aspects of OT environments...",
      "rationale": "Generic IT security policies may not adequately address OT-specific requirements such as availability primacy, legacy systems, and deterministic behavior.",
      "related_controls": ["AC-1", "CM-1", "PL-1"],
      "component_type": "policy"
    }
  ]
}
```

---

## 4. Tools Implementation

### New Tools (3)

#### Tool 1: map_security_level_requirements

**Purpose:** Return all IEC 62443 requirements for a target security level

**Signature:**
```typescript
map_security_level_requirements(
  security_level: number,          // 1, 2, 3, or 4
  options?: {
    component_type?: string,       // Filter by host, network, embedded, application
    include_enhancements?: boolean // Include REs (default: true)
  }
): Promise<RequirementsBySecurityLevel>
```

**Return type:**
```typescript
interface RequirementsBySecurityLevel {
  security_level: number;
  total_requirements: number;
  requirements: Array<{
    requirement: OTRequirement;
    security_level_detail: SecurityLevel;
    is_enhancement: boolean;
  }>;
}
```

**Query logic:**
```sql
SELECT r.*, sl.*
FROM ot_requirements r
INNER JOIN security_levels sl ON r.id = sl.requirement_db_id
WHERE sl.security_level = ?
  AND (? IS NULL OR r.component_type = ?)
  AND r.standard_id LIKE 'iec62443%'
ORDER BY r.requirement_id;
```

**Use cases:**
- "What's required to achieve SL-2?"
- "Show me all SL-3 requirements for network components"
- "List SL-4 requirements (without enhancements)"

#### Tool 2: get_zone_conduit_guidance

**Purpose:** Query zones, conduits, and flows for network architecture design

**Signature:**
```typescript
get_zone_conduit_guidance(
  options?: {
    purdue_level?: number,          // Filter by Purdue level (0-5)
    security_level?: number,         // Filter by target SL (1-4)
    reference_architecture?: string  // Filter by architecture name
  }
): Promise<ZoneConduitGuidance>
```

**Return type:**
```typescript
interface ZoneConduitGuidance {
  zones: Zone[];
  conduits: Conduit[];
  flows: ZoneConduitFlow[];
  reference_architectures: ReferenceArchitecture[];
}
```

**Query logic:**
```sql
-- Get zones matching criteria
SELECT * FROM zones
WHERE (? IS NULL OR purdue_level = ?)
  AND (? IS NULL OR security_level_target >= ?);

-- Get applicable conduits
SELECT c.* FROM conduits c
INNER JOIN zone_conduit_flows f ON c.id = f.conduit_id
WHERE f.source_zone_id IN (selected_zone_ids)
   OR f.target_zone_id IN (selected_zone_ids);

-- Get flows between selected zones
SELECT * FROM zone_conduit_flows
WHERE source_zone_id IN (selected_zone_ids)
  AND target_zone_id IN (selected_zone_ids);
```

**Use cases:**
- "Show me the Purdue Level 3 zone architecture"
- "What conduits should connect Level 2 to Level 3?"
- "Display the ISA95 reference architecture"

#### Tool 3: get_requirement_rationale

**Purpose:** Return detailed rationale for why a requirement exists

**Signature:**
```typescript
get_requirement_rationale(
  requirement_id: string,
  standard: string
): Promise<RequirementRationale>
```

**Return type:**
```typescript
interface RequirementRationale {
  requirement: OTRequirement;
  rationale_text: string;
  regulatory_drivers: string[];      // Standards that reference this requirement
  risk_mitigation: string[];         // What threats/risks this addresses
  implementation_guidance: string;   // How to implement
}
```

**Use cases:**
- "Why is SR 1.1 required?"
- "Explain the rationale for NIST AC-2"
- "What risk does this requirement mitigate?"

### Existing Tool Updates (4)

#### search_ot_requirements (Enhanced)

**Changes:**
- Now searches ~350+ requirements (was empty in Stage 1)
- Filters work across IEC 62443 + NIST standards
- Security level filter now functional (IEC 62443 SL mappings)
- Component type filter works for both IEC and NIST

**New capabilities:**
- Cross-standard search: "authentication requirements across IEC and NIST"
- Security level filtering: "Show SL-2 requirements about access control"

#### get_ot_requirement (Enhanced)

**Changes:**
- Returns IEC 62443 and NIST requirements (was null in Stage 1)
- Includes security_levels array (IEC 62443 SL mappings)
- include_mappings parameter ready for Stage 3

**New capabilities:**
- "Get IEC 62443 SR 1.1 with SL mappings"
- "Retrieve NIST AC-2 with full description"

#### list_ot_standards (Activated)

**Changes:**
- Returns 6 standards (was empty array in Stage 1):
  - IEC 62443-3-3, 4-2, 3-2
  - NIST 800-53, 800-82
  - MITRE ATT&CK ICS (existing)

**New capabilities:**
- "List all available standards"
- "Show me OT standards with requirement counts"

#### get_mitre_ics_technique (Enhanced)

**Changes:**
- map_to_standards parameter now functional
- Can map MITRE techniques to IEC/NIST requirements
- Returns actual OT requirements (was empty in Stage 1)

**New capabilities:**
- "Get MITRE T0800 and map to IEC 62443 requirements"
- "Show which NIST controls mitigate this MITRE technique"

---

## 5. Testing Strategy

### Unit Tests (New: ~100 tests)

**Ingestion scripts:**
- IEC 62443 JSON validation (10 tests)
  - Valid JSON structure
  - Invalid JSON (missing fields, wrong types)
  - Duplicate requirement IDs
  - Invalid security levels
  - Parent requirement references

- NIST 800-53 OSCAL parsing (8 tests)
  - Valid OSCAL catalog parsing
  - Control family filtering
  - Control enhancement handling
  - Parameter extraction

- Database integrity (12 tests)
  - Foreign key constraints
  - UNIQUE constraints
  - CHECK constraints
  - Transaction rollback on error

**New tools:**
- map_security_level_requirements (15 tests)
- get_zone_conduit_guidance (12 tests)
- get_requirement_rationale (8 tests)

**Enhanced tools:**
- search_ot_requirements updates (10 tests)
- get_ot_requirement updates (8 tests)
- list_ot_standards updates (5 tests)
- get_mitre_ics_technique updates (7 tests)

### Integration Tests (New: ~30 tests)

**E2E workflows:**
- Complete requirement search across all standards
- Security level mapping for all 4 SLs
- Zone/conduit architecture queries
- MITRE technique to requirement mapping
- Cross-standard requirement lookup

**Data validation:**
- Verify ~67 IEC 62443-3-3 requirements ingested
- Verify ~100+ IEC 62443-4-2 requirements ingested
- Verify ~200 NIST 800-53 controls ingested
- Verify security level mappings correct
- Verify zones/conduits relationships valid

### Test Target

**Stage 2 test goal:** 250+ tests passing
- Stage 1: 153 tests ✅
- Stage 2 new: ~100 unit + ~30 integration = 130 tests
- **Total: 283 tests**

---

## 6. Documentation Requirements

### User Documentation

**1. IEC 62443 Ingestion Guide** (`docs/ingestion/iec62443-guide.md`)

Content:
- How to purchase IEC 62443 standards
- Step-by-step PDF to JSON extraction
- JSON template with field-by-field explanations
- Validation and error handling
- Verification steps

Example section:
```markdown
## Extracting SR 1.1 from IEC 62443-3-3 PDF

1. Open IEC 62443-3-3 PDF to Section 4.3.3.3.1 (SR 1.1)
2. Copy the requirement title: "Human user identification and authentication"
3. Copy the full requirement description (multiple paragraphs)
4. Copy the rationale section
5. Note the component type: "host" (from Table 4-1)
6. Copy security level mappings from Table 4-2:
   - SL-1: Capability Level 1
   - SL-2: Capability Level 2
   - ...
```

**2. NIST Ingestion Guide** (`docs/ingestion/nist-guide.md`)

Content:
- Automated ingestion steps
- How to verify NIST data
- Troubleshooting guide

**3. Updated Tool Reference** (`docs/tools.md`)

Updates:
- Document 3 new tools with examples
- Update 4 existing tools with new capabilities
- Cross-reference to IEC 62443 and NIST standards

**4. Updated README** (`README.md`)

Updates:
- Stage 2 status and features
- Data requirements (IEC 62443 optional, NIST automatic)
- Updated quick start with ingestion steps

### Developer Documentation

**1. Schema Documentation** (`docs/database-schema.md`)

Updates:
- Document new zones/conduits tables
- Update ER diagram
- Document security_levels table usage

**2. Ingestion Scripts README** (`scripts/README.md`)

Content:
- How each ingestion script works
- Extension points for new standards
- Error handling patterns

---

## 7. Implementation Plan Summary

### Phase 1: Database & Schema (Week 1)
- Add zones, conduits, zone_conduit_flows, reference_architectures tables
- Update indexes
- Test schema changes
- **Deliverable:** Updated schema.sql with tests

### Phase 2: NIST Ingestion (Week 1-2)
- Build NIST 800-53 OSCAL parser
- Implement control filtering
- Build NIST 800-82 extractor
- Test with real NIST data
- **Deliverable:** 200+ NIST controls ingested

### Phase 3: IEC 62443 Template (Week 2)
- Design JSON schema
- Build validation script
- Build ingestion script
- Write extraction guide
- **Deliverable:** User-ready IEC ingestion system

### Phase 4: New Tools (Week 3)
- Implement map_security_level_requirements
- Implement get_zone_conduit_guidance
- Implement get_requirement_rationale
- Unit tests for each
- **Deliverable:** 3 new tools with tests

### Phase 5: Tool Updates (Week 3-4)
- Update search_ot_requirements
- Update get_ot_requirement
- Update list_ot_standards
- Update get_mitre_ics_technique
- Integration tests
- **Deliverable:** All 7 tools functional

### Phase 6: Documentation & Testing (Week 4)
- Write ingestion guides
- Update tool documentation
- Update README
- Comprehensive E2E tests
- **Deliverable:** Complete Stage 2 documentation

### Phase 7: Verification & Package (Week 4)
- Verify 250+ tests passing
- End-user testing with sample data
- Tag v0.2.0 release
- **Deliverable:** Stage 2 release

---

## 8. Success Criteria

**Stage 2 Complete When:**

**Data:**
- ✅ IEC 62443-3-3 template ready and documented
- ✅ IEC 62443-4-2 template ready and documented
- ✅ IEC 62443-3-2 zones/conduits ingested
- ✅ NIST 800-53 controls ingested (~200)
- ✅ NIST 800-82 guidance ingested (~50)
- ✅ Security levels table populated
- ✅ Zones/conduits tables populated

**Tools:**
- ✅ 3 new tools implemented and tested
- ✅ 4 existing tools updated and tested
- ✅ All tools work with real IEC/NIST data

**Testing:**
- ✅ 250+ tests passing
- ✅ E2E workflows validated
- ✅ Data integrity verified

**Documentation:**
- ✅ IEC 62443 ingestion guide complete
- ✅ NIST ingestion guide complete
- ✅ Tool reference updated
- ✅ README updated with Stage 2 status

**Quality:**
- ✅ Code review passed
- ✅ Schema validated
- ✅ User testing successful

---

## 9. Stage 2 Limitations & Stage 3 Preview

### Stage 2 Limitations

**Not included in Stage 2:**
- Cross-standard mappings (IEC ↔ NIST ↔ MITRE)
- ISO 27001 controls
- NERC CIP requirements
- Sector-specific applicability
- Compliance gap analysis tools

**These are reserved for Stage 3 and 4.**

### Stage 3 Preview

**Stage 3 will add:**
- Cross-standard mapping curation (the moat)
- IEC 62443-2-4 (supplier requirements)
- Comparison tools (compare_ot_requirements)
- Threat-to-requirement mapping
- Automated mapping suggestions

---

## 10. Risk Mitigation

**Risk: Users don't have IEC 62443 licenses**
- Mitigation: MCP fully functional without IEC data
- NIST + MITRE provides substantial value
- Clear documentation that IEC is optional

**Risk: IEC PDF parsing is tedious**
- Mitigation: Clear extraction guide with examples
- Future: Add PDF parser helper (Stage 3)
- Community: Could share anonymized templates

**Risk: NIST 800-53 is large (1000+ controls)**
- Mitigation: Filter to ~200 OT-relevant controls
- Clear rationale for inclusion/exclusion
- Document filtering logic

**Risk: Schema changes break Stage 1**
- Mitigation: All changes are additive
- Stage 1 tests continue passing
- Backward compatibility guaranteed

---

## Appendix A: IEC 62443 Structure Reference

**IEC 62443-3-3 Requirements (7 Foundational Requirements):**

1. **FR 1 - Identification and Authentication Control** (~10 SRs)
   - SR 1.1 - Human user identification and authentication
   - SR 1.2 - Software process and device identification and authentication
   - SR 1.3 - Account management
   - ... (7 more SRs + enhancements)

2. **FR 2 - Use Control** (~5 SRs)
   - SR 2.1 - Authorization enforcement
   - SR 2.2 - Wireless use control
   - ... (3 more SRs)

3. **FR 3 - System Integrity** (~8 SRs)
   - SR 3.1 - Communication integrity
   - SR 3.2 - Malicious code protection
   - ... (6 more SRs)

4. **FR 4 - Data Confidentiality** (~3 SRs)
   - SR 4.1 - Information confidentiality
   - SR 4.2 - Information persistence
   - SR 4.3 - Use of cryptography

5. **FR 5 - Restricted Data Flow** (~4 SRs)
   - SR 5.1 - Network segmentation
   - SR 5.2 - Zone boundary protection
   - ... (2 more SRs)

6. **FR 6 - Timely Response to Events** (~3 SRs)
   - SR 6.1 - Audit log accessibility
   - SR 6.2 - Continuous monitoring
   - SR 6.3 - Security event management

7. **FR 7 - Resource Availability** (~3 SRs)
   - SR 7.1 - Denial of service protection
   - SR 7.2 - Resource management
   - ... (1 more SR)

**Total: ~67 base requirements + ~80 requirement enhancements (REs)**

---

## Appendix B: NIST 800-53 Control Families

**Control families included in Stage 2:**

- **AC** - Access Control (25 controls)
- **AU** - Audit and Accountability (16 controls)
- **CA** - Assessment, Authorization, and Monitoring (9 controls)
- **CM** - Configuration Management (14 controls)
- **CP** - Contingency Planning (13 controls)
- **IA** - Identification and Authentication (12 controls)
- **IR** - Incident Response (10 controls)
- **MA** - Maintenance (7 controls)
- **PE** - Physical and Environmental Protection (20 controls)
- **SA** - System and Services Acquisition (23 controls)
- **SC** - System and Communications Protection (51 controls)
- **SI** - System and Information Integrity (23 controls)

**Control families excluded:**
- **AT** - Awareness and Training (not technical controls)
- **PL** - Planning (policy-level)
- **PM** - Program Management (organizational)
- **PS** - Personnel Security (HR-related)
- **PT** - PII Processing and Transparency (privacy-focused)
- **RA** - Risk Assessment (methodology)
- **SR** - Supply Chain Risk Management (covered in IEC 62443-2-4 Stage 3)

---

**End of Stage 2 Design Document**
