# get_requirement_rationale Tool

Get detailed rationale and context for a specific OT security requirement.

## Purpose

This tool provides comprehensive context about why a security requirement exists, including:
- **Rationale text:** The official explanation of the requirement's purpose
- **Security levels:** IEC 62443 security level mappings (if applicable)
- **Regulatory context:** Sector applicability and regulatory drivers
- **Related standards:** Cross-references to equivalent requirements in other standards
- **Standard metadata:** Information about the source standard

Understanding the "why" behind requirements is essential for:
- Making risk-based implementation decisions
- Justifying security investments to stakeholders
- Tailoring requirements to your specific environment
- Explaining requirements to non-technical audiences

## When to Use This Tool

- **Requirement interpretation:** Understand what a requirement means and why it exists
- **Business case development:** Justify security spending with regulatory and risk context
- **Risk assessment:** Evaluate whether a requirement applies to your threat model
- **Compliance mapping:** Find equivalent requirements across standards
- **Implementation planning:** Understand intent to guide implementation choices
- **Training and awareness:** Explain requirements to operations and management teams

## Parameters

### Required Parameters

**requirement_id** (string)
- The requirement identifier
- Examples:
  - IEC 62443: `"SR 1.1"`, `"SR 1.1 RE 1"`
  - NIST 800-53: `"AC-2"`, `"SC-7"`
  - NIST 800-82: `"G-6.1"`

**standard** (string)
- The standard identifier
- Values:
  - `"iec62443-3-3"`: IEC 62443-3-3 System Requirements
  - `"iec62443-4-2"`: IEC 62443-4-2 Component Requirements
  - `"nist-800-53"`: NIST SP 800-53 Rev 5
  - `"nist-800-82"`: NIST SP 800-82 Rev 3

## Return Value

Returns a comprehensive rationale object:

```typescript
{
  requirement: {
    id: number;
    standard_id: string;
    requirement_id: string;
    parent_requirement_id: string | null;
    title: string;
    description: string;
    rationale: string | null;
    component_type: string | null;
    created_at: string;
    updated_at: string;
  };

  standard: {
    id: string;
    name: string;
    version: string | null;
    published_date: string | null;
    organization: string | null;
    url: string | null;
    status: string;
  };

  rationale: string | null;  // The "why" text

  security_levels: Array<{
    id: number;
    requirement_db_id: number;
    security_level: number;
    sl_type: string;
    capability_level: number;
    notes: string | null;
  }>;

  regulatory_context: Array<{
    id: number;
    standard: string;
    sector: string;
    jurisdiction: string;
    regulatory_driver: string | null;
    mandatory: boolean;
    notes: string | null;
  }>;

  related_standards: Array<{
    standard: string;
    requirement_id: string;
    mapping_type: string;
    confidence: number | null;
  }>;
}
```

Returns `null` if the requirement is not found.

## Examples

### Example 1: Get rationale for IEC 62443 authentication requirement

**Query:**
```
Why does IEC 62443 require user authentication? Tell me about SR 1.1.
```

**Tool invocation:**
```json
{
  "requirement_id": "SR 1.1",
  "standard": "iec62443-3-3"
}
```

**Result:**
```json
{
  "requirement": {
    "requirement_id": "SR 1.1",
    "title": "Human user identification and authentication",
    "description": "The control system shall provide the capability to identify and authenticate all human users...",
    "rationale": "Human user identification and authentication is the basis for most types of accesses control and for establishing accountability. Unique identification and authentication of authorized users is essential to ensure that the proper user is associated with any attempted or completed actions.",
    "component_type": "host"
  },
  "standard": {
    "id": "iec62443-3-3",
    "name": "IEC 62443-3-3 System Security Requirements and Security Levels",
    "version": "v2.0",
    "organization": "ISA/IEC"
  },
  "rationale": "Human user identification and authentication is the basis for most types of accesses control...",
  "security_levels": [
    {
      "security_level": 1,
      "capability_level": 1,
      "notes": "Basic authentication required"
    },
    {
      "security_level": 3,
      "capability_level": 2,
      "notes": "Unique authentication required - see SR 1.1 RE 1"
    }
  ],
  "regulatory_context": [
    {
      "sector": "Energy",
      "jurisdiction": "North America",
      "regulatory_driver": "NERC CIP-005",
      "mandatory": true
    }
  ],
  "related_standards": [
    {
      "standard": "nist-800-53",
      "requirement_id": "AC-2",
      "mapping_type": "equivalent",
      "confidence": 0.9
    },
    {
      "standard": "nist-800-53",
      "requirement_id": "IA-2",
      "mapping_type": "related",
      "confidence": 0.85
    }
  ]
}
```

**Interpretation:**
- **Why:** Authentication is foundational for access control and accountability
- **Security levels:** Basic at SL-1, unique authentication required at SL-3+
- **Regulatory:** Mandatory for Energy sector (NERC CIP)
- **Related:** Maps to NIST 800-53 AC-2 (Account Management) and IA-2 (Authentication)

### Example 2: Get rationale for NIST 800-53 boundary protection

**Query:**
```
Why is NIST SC-7 (Boundary Protection) important for OT systems?
```

**Tool invocation:**
```json
{
  "requirement_id": "SC-7",
  "standard": "nist-800-53"
}
```

**Result:**
```json
{
  "requirement": {
    "requirement_id": "SC-7",
    "title": "Boundary Protection",
    "description": "a. Monitor and control communications at the external boundary...",
    "rationale": "Managed interfaces include gateways, routers, firewalls, guards, network-based malicious code analysis and virtualization systems...",
    "component_type": "network"
  },
  "standard": {
    "id": "nist-800-53",
    "name": "NIST SP 800-53 Rev 5",
    "version": "Rev 5",
    "organization": "NIST"
  },
  "security_levels": [],  // NIST doesn't use IEC security levels
  "regulatory_context": [
    {
      "sector": "Federal",
      "jurisdiction": "United States",
      "regulatory_driver": "FISMA",
      "mandatory": true
    }
  ],
  "related_standards": [
    {
      "standard": "iec62443-3-3",
      "requirement_id": "SR 5.1",
      "mapping_type": "equivalent",
      "confidence": 0.95
    },
    {
      "standard": "iec62443-3-3",
      "requirement_id": "SR 5.2",
      "mapping_type": "related",
      "confidence": 0.80
    }
  ]
}
```

**Interpretation:**
- **Why:** Boundary protection is essential for controlling and monitoring network traffic at system boundaries
- **Regulatory:** Mandatory for Federal systems under FISMA
- **Related:** Maps strongly to IEC 62443 SR 5.1 (Network segmentation) and SR 5.2 (Zone boundary protection)

### Example 3: Get rationale for NIST 800-82 guidance

**Query:**
```
Explain the rationale for NIST 800-82's network segmentation guidance
```

**Tool invocation:**
```json
{
  "requirement_id": "G-6.1",
  "standard": "nist-800-82"
}
```

**Result:**
```json
{
  "requirement": {
    "requirement_id": "G-6.1",
    "title": "Network Segmentation and Isolation",
    "description": "Implement network segmentation using zones and conduits following the Purdue Model...",
    "rationale": "Defense-in-depth through network segmentation is critical for ICS. Use firewalls, DMZs, and unidirectional gateways between zones."
  },
  "standard": {
    "id": "nist-800-82",
    "name": "NIST SP 800-82 Rev 3: Guide to Operational Technology (OT) Security",
    "version": "Rev 3",
    "organization": "NIST"
  },
  "security_levels": [],
  "regulatory_context": [
    {
      "sector": "Critical Infrastructure",
      "jurisdiction": "United States",
      "regulatory_driver": "Presidential Policy Directive 21 (PPD-21)",
      "mandatory": false,
      "notes": "Guidance, not mandatory, but widely adopted"
    }
  ],
  "related_standards": [
    {
      "standard": "nist-800-53",
      "requirement_id": "SC-7",
      "mapping_type": "implements",
      "confidence": 1.0
    },
    {
      "standard": "nist-800-53",
      "requirement_id": "AC-4",
      "mapping_type": "implements",
      "confidence": 0.9
    }
  ]
}
```

**Interpretation:**
- **Why:** Defense-in-depth and isolation are critical for ICS security
- **Regulatory:** Guidance for critical infrastructure, not mandatory but highly recommended
- **Related:** Implements NIST 800-53 SC-7 (Boundary Protection) and AC-4 (Information Flow Enforcement)

### Example 4: Get rationale for a Requirement Enhancement

**Query:**
```
Why does IEC 62443 have SR 1.1 RE 1 for unique authentication?
```

**Tool invocation:**
```json
{
  "requirement_id": "SR 1.1 RE 1",
  "standard": "iec62443-3-3"
}
```

**Result:**
```json
{
  "requirement": {
    "requirement_id": "SR 1.1 RE 1",
    "parent_requirement_id": "SR 1.1",
    "title": "Unique identification and authentication",
    "description": "The control system shall provide the capability to uniquely identify and authenticate all human users...",
    "rationale": "Provides enhanced capability by requiring unique identification for each user, supporting better accountability and audit trails."
  },
  "standard": {
    "id": "iec62443-3-3",
    "name": "IEC 62443-3-3 System Security Requirements and Security Levels"
  },
  "rationale": "Provides enhanced capability by requiring unique identification for each user...",
  "security_levels": [
    {
      "security_level": 3,
      "capability_level": 2,
      "notes": "Required for SL-3"
    },
    {
      "security_level": 4,
      "capability_level": 2,
      "notes": "Minimum requirement for SL-4"
    }
  ],
  "regulatory_context": [],
  "related_standards": [
    {
      "standard": "nist-800-53",
      "requirement_id": "IA-2(1)",
      "mapping_type": "equivalent",
      "confidence": 0.85
    }
  ]
}
```

**Interpretation:**
- **Why:** Unique authentication (not shared accounts) improves accountability and audit trails
- **Parent:** This is an enhancement of SR 1.1 (base authentication requirement)
- **Security levels:** Required for SL-3 and SL-4, not required for SL-1 and SL-2
- **Related:** Similar to NIST 800-53 IA-2(1) (multi-factor authentication)

## Understanding Rationale Components

### 1. Requirement Object

The core requirement information:
- **requirement_id:** Unique identifier within the standard
- **title:** Short name
- **description:** Full requirement text (the "what")
- **rationale:** Explanation of purpose (the "why")
- **component_type:** Where it applies (host, network, embedded, app)
- **parent_requirement_id:** For enhancements, links to base requirement

### 2. Standard Object

Metadata about the source standard:
- **id:** Standard identifier
- **name:** Full standard name
- **version:** Version/revision
- **organization:** Issuing organization (ISA, IEC, NIST)
- **url:** Link to official publication
- **status:** current, superseded, or draft

### 3. Rationale Text

The "why" behind the requirement. This text explains:
- **Purpose:** Why this requirement exists
- **Risk context:** What threats or vulnerabilities it addresses
- **Benefits:** What protection or capability it provides
- **Dependencies:** How it relates to other requirements

### 4. Security Levels (IEC 62443 only)

For IEC 62443 requirements, shows how the requirement applies across security levels:
- **security_level:** 1, 2, 3, or 4
- **capability_level:** 0 (not required), 1 (basic), 2 (enhanced), 3 (advanced)
- **notes:** Implementation guidance

### 5. Regulatory Context

Information about regulatory drivers and sector applicability:
- **sector:** Industry sector (Energy, Water, Manufacturing, etc.)
- **jurisdiction:** Geographic scope (United States, EU, Global)
- **regulatory_driver:** Specific regulation or law (NERC CIP, NIS Directive, etc.)
- **mandatory:** Whether compliance is legally required
- **notes:** Additional context

### 6. Related Standards

Cross-references to equivalent requirements in other standards:
- **standard:** Target standard ID
- **requirement_id:** Requirement ID in target standard
- **mapping_type:** Relationship type
  - `equivalent`: Nearly identical requirements
  - `implements`: This requirement implements the target
  - `related`: Related but not equivalent
  - `supports`: Supports implementation of the target
- **confidence:** Mapping strength (0.0 to 1.0)

## Use Cases

### Use Case 1: Business Case Development

**Scenario:** You need to justify implementing multi-factor authentication to management.

**Approach:**
```
1. Query SR 1.1 RE 2 rationale
2. Extract key points:
   - Why: "Provides advanced capability by requiring multi-factor authentication..."
   - Security level: "Required for SL-4, recommended for SL-3"
   - Regulatory: "Mandatory for Energy sector under NERC CIP-005-6"
3. Present to management:
   - Risk reduction (accountability, credential theft protection)
   - Regulatory compliance
   - Industry best practice (SL-3 is common target)
4. Cost-benefit: Compare implementation cost vs. regulatory penalties
```

**Deliverable:** Executive summary with ROI analysis.

### Use Case 2: Requirement Tailoring

**Scenario:** Determine if a requirement applies to your specific system.

**Approach:**
```
1. Query requirement rationale
2. Review rationale text for applicability criteria
3. Check regulatory_context for your sector/jurisdiction
4. Review related_standards to see if you're already complying via another standard
5. Make risk-based decision:
   - If rationale addresses a real threat in your environment → Implement
   - If regulatory driver applies → Implement (mandatory)
   - If rationale doesn't apply to your threat model → Document exception
```

**Deliverable:** Tailoring justification document.

### Use Case 3: Cross-Standard Mapping

**Scenario:** You have NIST 800-53 compliance but need to demonstrate IEC 62443 compliance.

**Approach:**
```
1. Query NIST requirement rationale (e.g., AC-2)
2. Review related_standards to find IEC 62443 mappings
3. For each related requirement:
   - Query IEC requirement rationale
   - Compare rationale and descriptions
   - Assess confidence level
4. Document mapping with justification
5. Identify gaps where NIST doesn't fully cover IEC requirement
```

**Deliverable:** Compliance mapping matrix with gap analysis.

### Use Case 4: Training and Awareness

**Scenario:** Train operations staff on why security requirements matter.

**Approach:**
```
1. Select key requirements for your environment
2. Query rationale for each
3. Create training materials:
   - Requirement title (what)
   - Rationale text (why)
   - Real-world examples
   - Consequences of non-compliance
4. Present in non-technical language
5. Link to specific operational procedures
```

**Deliverable:** Security awareness training deck.

### Use Case 5: Audit Preparation

**Scenario:** Prepare for a third-party security audit against IEC 62443.

**Approach:**
```
1. List all requirements you claim to meet
2. For each requirement:
   - Query rationale to understand intent
   - Review security_levels to ensure you're meeting the right capability level
   - Check regulatory_context for mandatory vs. recommended
   - Document how your implementation satisfies the rationale
3. Prepare evidence that addresses the "why" not just the "what"
4. For gaps, document compensating controls with risk justification
```

**Deliverable:** Audit readiness package with evidence and justifications.

## Interpreting Mapping Types

### Equivalent (confidence 0.8-1.0)
Requirements are nearly identical in intent and scope.

**Example:**
- IEC 62443 SR 1.1 ↔ NIST 800-53 AC-2
- Both require user account management with authentication

**Action:** If you implement one, you likely satisfy the other (with minor adjustments).

### Implements (confidence 0.7-0.95)
Source requirement implements or satisfies the target requirement.

**Example:**
- NIST 800-82 G-6.1 implements NIST 800-53 SC-7
- Network segmentation guidance implements boundary protection control

**Action:** Implementing the source likely satisfies the target in the OT context.

### Related (confidence 0.5-0.8)
Requirements are related but not equivalent; may partially overlap.

**Example:**
- IEC 62443 SR 5.1 ↔ NIST 800-53 AC-4
- Network segmentation relates to information flow enforcement

**Action:** Implementing one provides partial credit toward the other; gaps may exist.

### Supports (confidence 0.3-0.7)
Source requirement supports implementation of the target but doesn't fully satisfy it.

**Example:**
- NIST 800-53 AU-2 (Audit Events) supports IEC 62443 SR 6.1 (Audit log accessibility)
- Audit logging supports but doesn't fully satisfy accessibility requirements

**Action:** Implementing the source is helpful but additional controls are needed.

## Tips and Best Practices

1. **Read rationale first:** Before implementing a requirement, understand why it exists
2. **Check related standards:** Leverage existing compliance to meet new standards
3. **Use for training:** Share rationale with teams to build security culture
4. **Document tailoring:** When excluding a requirement, reference the rationale in your justification
5. **Compare security levels:** For IEC 62443, review how rationale changes across SLs
6. **Verify mappings:** High confidence (>0.9) mappings are strong; lower confidence needs validation
7. **Consider context:** Regulatory context tells you if compliance is optional or mandatory
8. **Link to parent:** For REs, always read the parent SR's rationale for full context
9. **Track changes:** Standards update; re-query rationale when new versions release
10. **Ask "why":** If rationale isn't clear, consult the full standard or standards body

## Common Patterns

### Pattern 1: Foundational Security Principles

Many requirements trace back to foundational security principles:
- **Authentication (SR 1.x, AC-2, IA-2):** "You need to know who's doing what"
- **Least Privilege (SR 2.x, AC-6):** "Users should only have necessary access"
- **Defense-in-Depth (SR 5.x, SC-7):** "Multiple layers of security"
- **Accountability (SR 6.x, AU-2):** "Log and audit all actions"
- **Availability (SR 7.x, SC-5):** "Systems must remain operational"

### Pattern 2: OT-Specific Rationale

OT requirements often emphasize:
- **Safety implications:** "This requirement prevents unsafe conditions"
- **Availability focus:** "Downtime can impact production or safety"
- **Real-time constraints:** "Implementation must not disrupt timing"
- **Legacy systems:** "Designed for systems with limited security features"

### Pattern 3: Incremental Capability

IEC 62443 rationale often describes incremental capability:
- **Base SR:** "Provides basic capability"
- **RE 1:** "Enhances capability for higher security levels"
- **RE 2:** "Provides advanced capability for the most critical systems"

## Related Tools

- **get_ot_requirement:** Get the full requirement details (without rationale context)
- **map_security_level_requirements:** See how requirements map across security levels
- **search_ot_requirements:** Find requirements by topic (then get rationale)
- **get_zone_conduit_guidance:** For network segmentation rationale (SR 5.x, SC-7)

## Error Handling

**Requirement not found:**
```json
{
  "requirement_id": "SR 999.999",
  "standard": "iec62443-3-3"
}
```
Returns: `null`

**Standard not found:**
```json
{
  "requirement_id": "SR 1.1",
  "standard": "invalid-standard"
}
```
Returns: `null`

**Missing rationale text:**
```json
{
  "requirement_id": "SR 1.1",
  "standard": "iec62443-3-3"
}
```
Returns requirement object with `rationale: null` if rationale wasn't ingested.

## Further Reading

- [IEC 62443 Ingestion Guide](../ingestion/iec62443-guide.md): How to populate rationale data
- [NIST Ingestion Guide](../ingestion/nist-guide.md): NIST rationale and discussion sections
- IEC 62443 Standards: Official standards include detailed rationale for each requirement
- NIST 800-53: "Discussion" sections provide rationale for each control
