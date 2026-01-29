# OT Security MCP Server - Roadmap

Strategic development plan for the OT Security MCP Server.

---

## Stage 2: Core Standards ✅ **COMPLETE** (Jan 2026)

### Delivered

- ✅ IEC 62443-3-3 (System Security Requirements)
- ✅ IEC 62443-4-2 (Component Requirements)
- ✅ IEC 62443-3-2 (Zones & Conduits)
- ✅ NIST SP 800-53 Rev 5 (Security Controls)
- ✅ NIST SP 800-82 Rev 3 (OT Security Guide)
- ✅ MITRE ATT&CK for ICS (83 techniques, 52 mitigations)
- ✅ 7 MCP tools (search, get, list, MITRE, security levels, zones, rationale)
- ✅ Cross-standard mappings (NIST 800-82 ↔ 800-53)
- ✅ 263 tests passing
- ✅ Comprehensive documentation

---

## Stage 3: Enhanced Mappings & Intelligence 🚧 **Q2 2026**

### Goals

**Primary:** Become the definitive cross-standard mapping authority for OT security

**Deliverables:**
1. Rich IEC ↔ NIST ↔ MITRE cross-standard mappings
2. IEC 62443-2-4 supplier security requirements
3. Automated mapping suggestions using requirement similarity
4. Compare requirements tool for side-by-side analysis

### Features

#### 1. IEC 62443-2-4 Integration

**Coverage:**
- 4 supplier capability security levels (SCL-1 through SCL-4)
- Development lifecycle security requirements
- Supplier assessment criteria
- Product security documentation requirements

**Why Important:**
- DORA Article 28: ICT third-party risk management
- NIS2 Article 21: Supply chain security
- EU Cyber Resilience Act: Manufacturer obligations
- Essential for vendor security assessments

**Effort:** 3 weeks (manual ingestion + validation)

#### 2. Rich Cross-Standard Mappings

**Target:** 300+ validated mappings

**Mapping Types:**
- **IEC → NIST:** 200+ mappings from IEC 62443 SRs/CRs to NIST 800-53 controls
- **IEC → MITRE:** 100+ mappings from IEC requirements to MITRE mitigations
- **NIST 800-82 → MITRE:** 50+ guidance-to-technique mappings

**Metadata:**
- Confidence scores (0.0-1.0)
- Mapping rationale (why they relate)
- Bidirectional relationships
- Context-specific notes (e.g., "Applies to SL-3+ only")

**Data Quality:**
- Peer-reviewed by OT security experts
- Validated against official publications
- Version-tracked for auditing

**Effort:** 4 weeks (curation + validation)

#### 3. Automated Mapping Suggestions

**Approach:** ML-based requirement similarity

**Features:**
- Semantic similarity scoring (BERT/sentence transformers)
- Suggest new mappings based on text analysis
- Confidence thresholds (only show high-confidence suggestions)
- Human review workflow for validation

**Example:**
```
Query: "Suggest NIST controls for IEC 62443 SR 3.3 (Audit Data Generation)"

AI Suggestion:
- AU-2 (Event Logging) - Confidence: 0.95
- AU-3 (Content of Audit Records) - Confidence: 0.92
- AU-9 (Protection of Audit Information) - Confidence: 0.88
[Requires human validation]
```

**Effort:** 2 weeks (prototype + validation)

#### 4. Compare Requirements Tool

**New Tool:** `compare_ot_requirements`

**Capabilities:**
- Side-by-side requirement comparison
- Highlight similarities and differences
- Show cross-standard mappings
- Export comparison tables

**Example:**
```typescript
compare_ot_requirements({
  requirements: ["IEC 62443 SR 1.1", "NIST 800-53 IA-2"],
  show_mappings: true,
  format: "table"
})
```

**Effort:** 2 weeks (implementation + testing)

### Success Criteria

- ✅ 300+ cross-standard mappings validated
- ✅ IEC 62443-2-4 fully ingested
- ✅ Mapping confidence scores >0.85 average
- ✅ Compare tool supports all 6 standards
- ✅ 350+ tests passing

**Timeline:** 11 weeks total (Mar-May 2026)

---

## Stage 4: Sector-Specific & Regulatory Intelligence 📋 **Q3 2026**

### Goals

**Primary:** Answer "Which standards apply to my organization?" with regulatory intelligence

### Features

#### 1. NERC CIP Integration

**Coverage:** NERC Critical Infrastructure Protection standards

**CIP Standards:**
- CIP-002: BES Cyber System Categorization
- CIP-003: Security Management Controls
- CIP-004: Personnel & Training
- CIP-005: Electronic Security Perimeters
- CIP-006: Physical Security
- CIP-007: System Security Management
- CIP-008: Incident Reporting
- CIP-009: Recovery Plans
- CIP-010: Configuration Management
- CIP-011: Information Protection

**Why Important:**
- Mandatory for U.S. bulk electric system
- 16,000+ registered entities
- Heavy compliance burden (automated queries reduce audit prep time)

**Cross-Mappings:**
- NERC CIP ↔ IEC 62443
- NERC CIP ↔ NIST 800-53

**Effort:** 4 weeks (public standard ingestion + validation)

#### 2. Sector Applicability Engine

**New Tool:** `get_applicable_standards`

**Capabilities:**
- Industry sector input (energy, water, manufacturing, etc.)
- Geographic jurisdiction (US, EU, Canada, etc.)
- Asset criticality (BES, NIS2 essential entity, etc.)
- Returns applicable standards with regulatory drivers

**Example:**
```typescript
get_applicable_standards({
  sector: "energy",
  jurisdiction: "US",
  asset_type: "transmission_substation",
  criticality: "high"
})

// Returns:
// - NERC CIP-005, CIP-007 (mandatory)
// - IEC 62443 SL-3 (recommended)
// - NIST 800-53 (FedRAMP if federal utility)
```

**Data Requirements:**
- Sector applicability rules (300+ rules)
- Regulatory thresholds (e.g., NIS2 employee count)
- Jurisdiction mappings

**Effort:** 3 weeks (rule curation + implementation)

#### 3. EU Regulatory Crosswalk

**Coverage:** NIS2, DORA, CRA mappings to OT standards

**NIS2 (Network and Information Security Directive 2):**
- Article 21: Cybersecurity risk management measures
- Map to IEC 62443 requirements
- Identify gaps in current implementations

**DORA (Digital Operational Resilience Act):**
- Article 28: ICT third-party risk management
- Map to IEC 62443-2-4 supplier requirements
- Vendor assessment automation

**CRA (Cyber Resilience Act):**
- Manufacturer security requirements
- Map to IEC 62443-4-2 component requirements
- Product certification support

**Cross-Mappings:**
- 100+ mappings from EU regulations to IEC/NIST
- Compliance gap analysis tool
- Audit readiness checklists

**Effort:** 3 weeks (regulatory analysis + mappings)

#### 4. Compliance Gap Analysis

**New Tool:** `analyze_compliance_gaps`

**Capabilities:**
- Input: Current security controls
- Input: Target standard (e.g., IEC 62443 SL-3)
- Output: Gap analysis with prioritization
- Output: Remediation roadmap

**Example:**
```typescript
analyze_compliance_gaps({
  current_controls: ["IA-2", "AC-3", "AU-2"],
  target_standard: "IEC 62443 SL-3",
  asset_type: "embedded"
})

// Returns:
// Gaps: 42 requirements not met
// High Priority: SR 3.4 (Software Integrity), SR 7.1 (DoS Protection)
// Medium Priority: SR 1.7 (Strength of Password), SR 2.4 (Mobile Device)
// Estimated Effort: 8-12 weeks implementation
```

**Effort:** 2 weeks (algorithm + testing)

### Success Criteria

- ✅ NERC CIP fully ingested with mappings
- ✅ Sector applicability engine covers 10+ sectors
- ✅ EU regulatory crosswalk complete (NIS2, DORA, CRA)
- ✅ Gap analysis tool operational
- ✅ 400+ tests passing

**Timeline:** 12 weeks total (Jun-Aug 2026)

---

## Stage 5: Advanced Features 🔮 **Q4 2026**

### Exploratory Features

#### 1. Risk-Based Requirement Prioritization

**Capability:** Prioritize requirements based on risk assessment

**Inputs:**
- Asset criticality
- Threat landscape
- Current security posture
- Business impact

**Output:** Prioritized implementation roadmap

#### 2. Assessment Report Generation

**Capability:** Generate compliance audit reports

**Formats:**
- IEC 62443 security level assessment
- NIST 800-53 SSP (System Security Plan)
- NERC CIP compliance evidence
- PDF/Word/Markdown export

#### 3. Threat-to-Requirement Mapping

**Capability:** Map MITRE ATT&CK techniques to defensive requirements

**Example:**
```
Threat: Lateral movement in OT network
MITRE Techniques: T0867, T0886, T0891
Defensive Requirements:
- IEC 62443 SR 5.1 (Network Segmentation)
- NIST 800-53 AC-4 (Information Flow Enforcement)
- NIST 800-53 SC-7 (Boundary Protection)
```

#### 4. Real-Time Threat Intelligence

**Capability:** Integrate with threat feeds for ICS-specific advisories

**Sources:**
- ICS-CERT advisories
- CISA KEV catalog
- Vendor security bulletins

**Mapping:** Advisories → Affected Components → Applicable Requirements

---

## Long-Term Vision (2027+)

### Product Certification Support

- Automated IEC 62443-4-2 component assessment
- Security development lifecycle tracking
- Evidence collection for certification audits

### AI-Powered Security Architect

- Natural language to network architecture
- Automated security control selection
- Risk-based implementation planning

### OT Security Knowledge Graph

- Neo4j graph database for relationships
- Complex path queries (asset → threat → requirement → control)
- Visual network security maps

---

## Community Requests

Submit feature requests via [GitHub Issues](https://github.com/Ansvar-Systems/ot-security-mcp/issues) with label `enhancement`.

**Top Community Requests:**
1. ISO/IEC 27019 (Energy sector security) - 15 votes
2. ISA/IEC 62443-4-1 (Product development requirements) - 12 votes
3. NIST CSF 2.0 for OT - 10 votes
4. ICS-specific STRIDE threat modeling - 8 votes

---

## Contribution Opportunities

Want to accelerate development? See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Adding new standards
- Improving cross-standard mappings
- Industry-specific use case documentation
- Testing and validation

---

**Last Updated:** 2026-01-29 (Stage 2 Release)

**Questions?** Open a [GitHub Discussion](https://github.com/Ansvar-Systems/ot-security-mcp/discussions)
