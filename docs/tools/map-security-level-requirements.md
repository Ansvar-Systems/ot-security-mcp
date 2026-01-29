# map_security_level_requirements Tool

Map IEC 62443 requirements to a specific security level (SL-1 through SL-4).

## Purpose

This tool returns all IEC 62443-3-3 system requirements that apply to a specified security level, helping you understand which security controls are needed to achieve a target security level for your OT environment.

## When to Use This Tool

- **Security level assessment:** Determine what requirements apply to your target SL
- **Gap analysis:** Compare your current implementation against SL requirements
- **Compliance planning:** Build a roadmap for achieving a higher security level
- **Component evaluation:** Filter requirements by component type (host, network, etc.)
- **Capability planning:** Understand incremental requirements between security levels

## Parameters

### Required Parameters

**security_level** (number, 1-4)
- The target IEC 62443 security level
- Values:
  - `1`: SL-1 - Protection against casual or coincidental violation
  - `2`: SL-2 - Protection against intentional violation using simple means with low resources
  - `3`: SL-3 - Protection against intentional violation using sophisticated means with moderate resources
  - `4`: SL-4 - Protection against intentional violation using sophisticated means with extended resources

### Optional Parameters

**component_type** (string)
- Filter requirements by component type
- Values: `host`, `network`, `embedded`, `app`
- Example: `"host"` to show only host-level requirements

**include_enhancements** (boolean, default: true)
- Whether to include Requirement Enhancements (REs) in results
- Set to `false` to show only base System Requirements (SRs)
- Base SRs provide foundational capabilities; REs provide enhanced/advanced capabilities

## Return Value

Returns an array of requirement objects, each containing:

```typescript
{
  requirement_id: string;          // e.g., "SR 1.1" or "SR 1.1 RE 1"
  standard_id: string;             // "iec62443-3-3"
  title: string;                   // Short requirement name
  description: string;             // Full requirement text
  rationale: string | null;        // Why this requirement exists
  component_type: string | null;   // host, network, embedded, app
  parent_requirement_id: string | null;  // For REs, the parent SR
  security_levels: Array<{
    security_level: number;        // 1, 2, 3, or 4
    sl_type: string;               // Usually "SL-T" (Target)
    capability_level: number;      // 0-3 (capability required)
    notes: string | null;          // Implementation guidance
  }>;
}
```

## Examples

### Example 1: Get all SL-2 requirements

**Query:**
```
What IEC 62443 requirements apply to Security Level 2?
```

**Tool invocation:**
```json
{
  "security_level": 2
}
```

**Result:**
Returns all SRs and REs that have a security_level entry for SL-2, including:
- SR 1.1 (Human user identification and authentication)
- SR 1.2 (Software process and device identification)
- SR 2.1 (Authorization enforcement)
- ... and many more

Each result includes the capability_level required for SL-2.

### Example 2: Get SL-3 host requirements only

**Query:**
```
Show me host-level security requirements for IEC 62443 Security Level 3
```

**Tool invocation:**
```json
{
  "security_level": 3,
  "component_type": "host"
}
```

**Result:**
Returns only host-specific requirements for SL-3, such as:
- SR 1.1 RE 1 (Unique identification and authentication)
- SR 1.7 (Strength of password-based authentication)
- SR 3.1 (Communication integrity)

### Example 3: Get base SL-4 requirements without enhancements

**Query:**
```
What are the base system requirements for Security Level 4, excluding enhancements?
```

**Tool invocation:**
```json
{
  "security_level": 4,
  "include_enhancements": false
}
```

**Result:**
Returns only base SRs (no REs), showing the foundational requirements for SL-4. Note that most base SRs at SL-4 require capability level 2 or 3, which means enhancements are typically needed to meet SL-4.

### Example 4: Network segmentation requirements for SL-3

**Query:**
```
What network-level requirements apply to Security Level 3?
```

**Tool invocation:**
```json
{
  "security_level": 3,
  "component_type": "network"
}
```

**Result:**
Returns network-specific SL-3 requirements like:
- SR 5.1 (Network segmentation)
- SR 5.2 (Zone boundary protection)
- SR 5.3 (General purpose person-to-person communication restrictions)

## Understanding Security Levels

IEC 62443 defines four security levels with increasing protection:

### SL-1: Protect against casual or coincidental violation
- **Threat:** Unauthorized access or disclosure by curious but non-malicious actors
- **Attacker capability:** Minimal
- **Examples:** Accidental misconfiguration, employee curiosity
- **Typical use:** Non-critical systems, low-risk environments

### SL-2: Protect against intentional violation using simple means
- **Threat:** Intentional attack using simple means with low resources
- **Attacker capability:** Basic tools, limited skills
- **Examples:** Script kiddies, disgruntled insiders with basic knowledge
- **Typical use:** Most industrial facilities, moderate-risk environments

### SL-3: Protect against intentional violation using sophisticated means
- **Threat:** Intentional attack using sophisticated means with moderate resources
- **Attacker capability:** Advanced tools, skilled attackers, moderate funding
- **Examples:** Organized crime, hacktivists, state actors with limited resources
- **Typical use:** Critical infrastructure, high-risk facilities

### SL-4: Protect against intentional violation using sophisticated means with extended resources
- **Threat:** Intentional attack using sophisticated means with extended resources
- **Attacker capability:** Advanced persistent threats, custom tools, nation-state level
- **Examples:** Nation-state actors, advanced persistent threats (APTs)
- **Typical use:** Highest-risk critical infrastructure (e.g., nuclear, national defense)

## Capability Levels

Each requirement has a capability level for each security level:

- **Capability Level 0:** Not required
- **Capability Level 1:** Basic capability (foundational implementation)
- **Capability Level 2:** Enhanced capability (improved controls, usually requires an RE)
- **Capability Level 3:** Advanced capability (most sophisticated controls, multiple REs)

**Example:**
SR 1.1 (Authentication) across security levels:
- SL-1: Capability Level 1 (basic authentication)
- SL-2: Capability Level 1 (same as SL-1)
- SL-3: Capability Level 2 (unique authentication via RE 1)
- SL-4: Capability Level 3 (multi-factor via RE 2)

## Use Cases

### Use Case 1: Target Security Level Selection

**Scenario:** You're designing a new water treatment facility and need to select an appropriate security level.

**Approach:**
```
1. Ask: "What requirements apply to Security Level 2?"
2. Review the list of 50+ requirements
3. Ask: "What requirements apply to Security Level 3?"
4. Compare the differences
5. Assess your risk tolerance and resources
6. Select appropriate SL based on threat landscape
```

### Use Case 2: Gap Analysis

**Scenario:** Your plant currently meets SL-1 and wants to achieve SL-2.

**Approach:**
```
1. Query SL-1 requirements: map_security_level_requirements(1)
2. Query SL-2 requirements: map_security_level_requirements(2)
3. Compare: What changed?
   - Same requirements but higher capability levels?
   - New requirements added?
4. Focus on requirements where capability_level increased
5. Identify implementation gaps
6. Prioritize remediation efforts
```

### Use Case 3: Component-Specific Planning

**Scenario:** You're upgrading your SCADA HMI workstations (host components).

**Approach:**
```
1. Query: "Show me host requirements for Security Level 2"
2. Tool: map_security_level_requirements(2, component_type="host")
3. Focus only on host-relevant controls
4. Map to specific HMI hardening tasks
5. Build implementation checklist
```

### Use Case 4: Roadmap Planning

**Scenario:** Plan a multi-year journey from SL-1 to SL-3.

**Approach:**
```
Year 1: Achieve SL-2
  - Query: map_security_level_requirements(2)
  - Identify quick wins (low complexity, high impact)
  - Focus on Foundational Requirements (base SRs)

Year 2: Strengthen SL-2, prepare for SL-3
  - Query: map_security_level_requirements(3, include_enhancements=false)
  - Identify base requirements for SL-3
  - Plan capability upgrades

Year 3: Achieve SL-3
  - Query: map_security_level_requirements(3, include_enhancements=true)
  - Implement all required REs
  - Validate compliance
```

## Interpreting Results

### Reading Security Level Mappings

Each requirement includes a `security_levels` array showing how the requirement applies across SL-1 through SL-4:

```json
{
  "requirement_id": "SR 1.1",
  "title": "Human user identification and authentication",
  "security_levels": [
    {
      "security_level": 1,
      "capability_level": 1,
      "notes": "Basic authentication required"
    },
    {
      "security_level": 2,
      "capability_level": 1,
      "notes": "Same as SL-1"
    },
    {
      "security_level": 3,
      "capability_level": 2,
      "notes": "Enhanced capability required - see SR 1.1 RE 1"
    }
  ]
}
```

**Interpretation:**
- At SL-1 and SL-2: Basic authentication (capability level 1) is sufficient
- At SL-3: Enhanced authentication (capability level 2) is required
- The "notes" field points you to SR 1.1 RE 1 for the enhancement details

### Identifying Required Enhancements

When a requirement shows capability_level > 1, look for corresponding REs:

**Base requirement:** SR 1.1 (capability level 1)
**Enhancement:** SR 1.1 RE 1 (capability level 2) - Unique identification
**Enhancement:** SR 1.1 RE 2 (capability level 3) - Multi-factor authentication

To achieve SL-3, you need both SR 1.1 (base) and SR 1.1 RE 1 (enhancement).

## Common Patterns

### Pattern 1: Incremental Capability Requirements

Most requirements follow an incremental pattern:
- SL-1: Capability 1 (basic)
- SL-2: Capability 1 (same as SL-1)
- SL-3: Capability 2 (enhanced)
- SL-4: Capability 3 (advanced)

This means SL-2 often requires the same controls as SL-1, while SL-3 and SL-4 require progressively stronger controls.

### Pattern 2: Component-Specific Requirements

Different component types have different requirements:
- **Host:** Authentication, malware protection, integrity checking
- **Network:** Segmentation, boundary protection, traffic filtering
- **Embedded:** Physical security, secure boot, tamper detection
- **App:** Input validation, session management, secure communications

### Pattern 3: Foundational Requirements Hierarchy

IEC 62443-3-3 organizes requirements into 7 Foundational Requirements:
- **FR 1:** Identification and Authentication Control
- **FR 2:** Use Control
- **FR 3:** System Integrity
- **FR 4:** Data Confidentiality
- **FR 5:** Restricted Data Flow
- **FR 6:** Timely Response to Events
- **FR 7:** Resource Availability

All SRs roll up to these FRs, providing a structured approach to security.

## Tips and Best Practices

1. **Start broad, then filter:** Query all SL requirements first, then narrow by component_type
2. **Compare across levels:** Query multiple SLs to understand the progression
3. **Focus on capability changes:** Look for requirements where capability_level increases
4. **Read the rationale:** Use `get_requirement_rationale` for requirements you don't understand
5. **Check parent requirements:** For REs, always review the parent SR for context
6. **Consider your threat model:** Choose SL based on your risk assessment, not just regulatory requirements
7. **Plan incrementally:** Achieve SL-1, then SL-2, then SL-3 over time
8. **Document exceptions:** Not all requirements may apply to your specific environment

## Related Tools

- **get_ot_requirement:** Get detailed information about a specific requirement
- **get_requirement_rationale:** Understand why a requirement exists and its context
- **search_ot_requirements:** Search for requirements by keyword across all SLs
- **get_zone_conduit_guidance:** Get network segmentation guidance for implementing SR 5.x requirements

## Error Handling

**Invalid security level:**
```json
{
  "security_level": 5  // Error: must be 1-4
}
```
Returns error: "Security level must be between 1 and 4"

**Invalid component type:**
```json
{
  "security_level": 2,
  "component_type": "invalid"  // Error: must be host, network, embedded, or app
}
```
Returns error: "Invalid component_type. Must be one of: host, network, embedded, app"

**No requirements found:**
```json
{
  "security_level": 2,
  "component_type": "embedded"  // If no embedded requirements exist
}
```
Returns empty array: `[]`

## Further Reading

- IEC 62443-3-3: System security requirements and security levels (purchase from ISA/IEC)
- [IEC 62443 Ingestion Guide](../ingestion/iec62443-guide.md): How to populate requirement data
- [IEC 62443 Security Levels Overview](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards): Official ISA documentation
