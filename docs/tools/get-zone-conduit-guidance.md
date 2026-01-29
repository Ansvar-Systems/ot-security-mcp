# get_zone_conduit_guidance Tool

Get IEC 62443 zone and conduit guidance for network segmentation in OT environments.

## Purpose

This tool provides comprehensive network segmentation guidance based on IEC 62443-3-2, including:
- **Zones:** Network segments organized by Purdue level
- **Conduits:** Communication pathways between zones
- **Data flows:** Specific data exchange patterns with security requirements
- **Implementation guidance:** Best practices for OT network architecture

## When to Use This Tool

- **Network architecture design:** Plan secure network segmentation for new OT facilities
- **Security assessment:** Review existing network architecture against IEC 62443 standards
- **Purdue Model implementation:** Understand zone placement and hierarchy
- **Firewall rule planning:** Identify required conduits and traffic flows
- **Defense-in-depth planning:** Layer security controls at zone boundaries

## Parameters

All parameters are optional. Without parameters, returns all zones, conduits, and flows.

### Optional Parameters

**purdue_level** (number, 0-5)
- Filter zones by Purdue Enterprise Reference Architecture level
- Values:
  - `0`: Physical Process (sensors, actuators)
  - `1`: Basic Control (PLCs, RTUs, field controllers)
  - `2`: Area Supervisory Control (SCADA, HMI, local historians)
  - `3`: Operations Management (DMZ, plant historians, MES)
  - `4`: Enterprise Network (ERP, business systems)
  - `5`: Internet/Cloud (external connectivity)

**security_level_target** (number, 1-4)
- Filter zones by their target IEC 62443 security level
- Values: 1 (SL-1), 2 (SL-2), 3 (SL-3), 4 (SL-4)
- Example: `3` to find zones requiring SL-3 protection

**reference_architecture** (string)
- Filter by reference architecture model
- Values: `"Purdue Model"`, `"IEC 62443-3-2"`, `"ISA-95"`
- Example: `"Purdue Model"` for traditional industrial networks

## Return Value

Returns a structured object containing:

```typescript
{
  zones: Array<{
    id: number;
    name: string;
    purdue_level: number;
    security_level_target: number;
    description: string;
    iec_reference: string;
    typical_assets: string;
  }>;

  conduits: Array<{
    id: number;
    name: string;
    conduit_type: string;  // unidirectional, filtered_bidirectional, open_bidirectional
    security_requirements: string;
    description: string;
    iec_reference: string;
    minimum_security_level: number;
  }>;

  flows: Array<{
    id: number;
    source_zone_id: number;
    source_zone_name: string;
    target_zone_id: number;
    target_zone_name: string;
    conduit_id: number;
    conduit_name: string;
    data_flow_description: string;
    security_level_requirement: number;
    bidirectional: boolean;
  }>;

  reference_architecture: string;
  guidance: string;  // Formatted markdown guidance text
}
```

## Examples

### Example 1: Get all network segmentation guidance

**Query:**
```
Show me IEC 62443 network segmentation guidance
```

**Tool invocation:**
```json
{}
```

**Result:**
Returns complete zone/conduit architecture including:
- All 6 Purdue levels (0-5) with typical zones
- All conduit types (unidirectional, filtered bidirectional, open bidirectional)
- Data flows between zones with security requirements
- Implementation best practices

**Guidance includes:**
```markdown
# IEC 62443 Network Segmentation Guidance

## All Network Zones

Found 8 zone(s), 5 conduit type(s), and 12 flow(s).

### Zone Security Considerations:

**Process Control Network** (Purdue Level 1, Target SL-2):
- Basic control devices including PLCs, RTUs, and field I/O
- Typical assets: PLCs, RTUs, Field Controllers, I/O modules

**SCADA DMZ** (Purdue Level 3, Target SL-3):
- Demilitarized zone between control networks and enterprise
- Typical assets: Data historians, application servers, jump hosts
...
```

### Example 2: Get Purdue Level 1 (Basic Control) guidance

**Query:**
```
What zones and conduits should I implement for Purdue Level 1?
```

**Tool invocation:**
```json
{
  "purdue_level": 1
}
```

**Result:**
Returns zones at Purdue Level 1 (Process Control Network), relevant conduits, and data flows to/from Level 1.

**Key information:**
- Zone: Process Control Network (SL-2 target)
- Typical assets: PLCs, RTUs, field controllers
- Upward flows: Process data to Level 2 (Supervisory)
- Downward flows: Control commands from Level 2
- Recommended conduits: Filtered bidirectional with deep packet inspection

### Example 3: Get high-security zones (SL-3 or higher)

**Query:**
```
Show me zones that require Security Level 3 or higher
```

**Tool invocation:**
```json
{
  "security_level_target": 3
}
```

**Result:**
Returns zones with SL-3 target, typically:
- SCADA DMZ (Level 3)
- Safety Instrumented Systems (SIS) network (Level 1 but SL-3)
- Critical infrastructure control zones

**Guidance includes:**
- Enhanced security requirements
- Unidirectional data flow recommendations
- Advanced monitoring and access controls
- Physical security considerations

### Example 4: Filter by reference architecture

**Query:**
```
Show me IEC 62443-3-2 reference architecture zones
```

**Tool invocation:**
```json
{
  "reference_architecture": "IEC 62443-3-2"
}
```

**Result:**
Returns zones explicitly defined in IEC 62443-3-2 standard, excluding vendor-specific or custom architectures.

## Understanding Zones

### Purdue Enterprise Reference Architecture

The Purdue Model divides industrial networks into hierarchical levels:

```
Level 5: Internet/Cloud
         ↕ (Demilitarized, Unidirectional)
Level 4: Enterprise Network (ERP, Email, Business)
         ↕ (DMZ, Filtered)
Level 3: Operations Management (Historians, MES, Engineering)
         ↕ (Filtered Bidirectional)
Level 2: Supervisory Control (SCADA, HMI)
         ↕ (Filtered Bidirectional)
Level 1: Basic Control (PLCs, RTUs, DCS)
         ↕ (Real-time, Low-latency)
Level 0: Physical Process (Sensors, Actuators)
```

### Common Zones

**Level 0: Physical Process Zone**
- Sensors, actuators, field instruments
- Direct physical interface with industrial processes
- Often air-gapped or connected via fieldbus
- SL requirement varies by criticality

**Level 1: Process Control Network**
- PLCs (Programmable Logic Controllers)
- RTUs (Remote Terminal Units)
- DCS controllers
- Field I/O modules
- Typical SL: SL-2 for most facilities, SL-3 for critical infrastructure

**Level 2: Supervisory Control Zone**
- SCADA servers
- HMI workstations
- Local historians
- Engineering workstations
- Typical SL: SL-2, SL-3 for critical systems

**Level 3: Operations Management Zone (DMZ)**
- Plant historians
- MES (Manufacturing Execution Systems)
- Asset management systems
- Jump hosts for remote access
- Typical SL: SL-3 (acts as security boundary)

**Level 4: Enterprise Network**
- ERP systems
- Email and office applications
- Business intelligence
- Corporate databases
- Typical SL: SL-1 or SL-2 (IT security controls)

**Level 5: Internet/Cloud**
- External connectivity
- Cloud services
- Remote access
- Vendor connections
- Typical SL: N/A (external boundary, maximum protection)

## Understanding Conduits

Conduits are logical groupings of communication channels between zones.

### Conduit Types

**1. Unidirectional (Data Diode)**
- **Description:** Hardware-enforced one-way data flow
- **Use case:** Critical data flowing from OT to IT with zero risk of reverse traffic
- **Example:** Process data from Level 1/2 to Level 3 historian
- **Security:** Highest - physically impossible to send commands back
- **Minimum SL:** Usually SL-3 or SL-4

**2. Filtered Bidirectional (Firewall)**
- **Description:** Stateful firewall with protocol-aware inspection
- **Use case:** Controlled two-way communication between adjacent levels
- **Example:** SCADA (Level 2) to PLC (Level 1) communications
- **Security:** High - deep packet inspection, allow-list rules, protocol validation
- **Minimum SL:** Usually SL-2 or SL-3

**3. Open Bidirectional (Switched)**
- **Description:** Minimal filtering, standard network switching
- **Use case:** Communication within a single zone
- **Example:** HMIs talking to SCADA server within Level 2
- **Security:** Moderate - rely on endpoint security, monitoring
- **Minimum SL:** SL-1 or SL-2

### Conduit Security Requirements

Each conduit type has specific security requirements:

**Unidirectional:**
- Hardware data diode or proxy pair
- Protocol termination and re-generation
- Application-level data transfer
- Out-of-band management

**Filtered Bidirectional:**
- Industrial firewall or unified threat management (UTM)
- Deep packet inspection (DPI) for OT protocols
- Application layer gateway (ALG) for industrial protocols
- Intrusion detection/prevention (IDS/IPS)
- Logging and alerting
- Fail-closed configuration

**Open Bidirectional:**
- VLAN segmentation
- Network monitoring (passive)
- Access control lists (ACLs)
- Anomaly detection

## Understanding Data Flows

Data flows represent specific communication patterns between zones.

### Flow Attributes

**source_zone → target_zone**
- Direction of primary data flow

**conduit_name**
- Type of conduit securing this flow

**data_flow_description**
- What data is exchanged and why

**security_level_requirement**
- Minimum SL needed for this flow

**bidirectional**
- true: Two-way communication
- false: One-way communication

### Example Flow Analysis

**Flow:** Process Control Network → SCADA DMZ

```json
{
  "source_zone_name": "Process Control Network",
  "target_zone_name": "SCADA DMZ",
  "conduit_name": "Filtered Bidirectional Firewall",
  "data_flow_description": "Process data and alarms flow to historians",
  "security_level_requirement": 2,
  "bidirectional": true
}
```

**Interpretation:**
- Process data flows UP from Level 1 to Level 3 (historian)
- Control commands may flow DOWN from Level 3 to Level 1 (engineering access)
- Requires filtered bidirectional conduit (firewall with DPI)
- Must meet SL-2 security controls
- Implement least privilege, protocol validation, logging

## Use Cases

### Use Case 1: New Facility Network Design

**Scenario:** Designing network architecture for a new manufacturing plant.

**Approach:**
```
1. Query all zones: get_zone_conduit_guidance()
2. Review Purdue levels and typical assets
3. Map your physical assets to zones
4. Identify required data flows between zones
5. Select appropriate conduits for each flow
6. Document security level targets
7. Design firewall rules based on flow descriptions
```

**Deliverable:** Network architecture diagram with zones, conduits, and security controls.

### Use Case 2: Security Assessment

**Scenario:** Audit existing OT network against IEC 62443-3-2.

**Approach:**
```
1. For each Purdue level in your network:
   - Query: get_zone_conduit_guidance(purdue_level=X)
   - Compare actual vs. recommended zones
2. Map your network flows to IEC flows
3. Identify gaps:
   - Missing zones (no DMZ at Level 3?)
   - Wrong conduit types (open where filtered needed?)
   - Insufficient security levels
4. Prioritize remediation
```

**Deliverable:** Gap analysis report with remediation roadmap.

### Use Case 3: Firewall Rule Review

**Scenario:** Validate firewall rules comply with IEC 62443-3-2.

**Approach:**
```
1. Query flows between relevant zones
   - Example: get_zone_conduit_guidance(purdue_level=2)
2. For each flow:
   - Verify firewall rules match data_flow_description
   - Check bidirectional flag vs. actual rules
   - Validate security_level_requirement is met
3. Identify unauthorized flows (not in IEC guidance)
4. Update firewall rules to match best practices
```

**Deliverable:** Validated firewall ruleset with IEC 62443 compliance notes.

### Use Case 4: DMZ Implementation

**Scenario:** Implement a SCADA DMZ between OT and IT.

**Approach:**
```
1. Query Level 3 zones: get_zone_conduit_guidance(purdue_level=3)
2. Review "SCADA DMZ" zone guidance
3. Identify required conduits:
   - Filtered bidirectional to Level 2 (SCADA)
   - Filtered bidirectional to Level 4 (Enterprise)
   - Unidirectional to Level 5 (Internet) if needed
4. Implement zone with:
   - Historians (data aggregation)
   - Jump hosts (secure remote access)
   - Application servers (HMI/SCADA web interfaces)
5. Configure conduits per guidance
```

**Deliverable:** Functioning DMZ with defense-in-depth security.

## Interpreting Guidance

The tool returns a `guidance` field with formatted markdown. Key sections include:

### Zone Security Considerations
- Describes each zone returned by the query
- Lists Purdue level and target SL
- Identifies typical assets
- Provides security context

### Conduit Types and Requirements
- Explains each conduit type
- Lists security requirements (firewall, DPI, etc.)
- Specifies minimum security levels
- References IEC 62443-3-2 sections

### Data Flows
- Shows specific zone-to-zone communications
- Describes what data flows and why
- Indicates required security level
- Notes bidirectional vs. unidirectional

### Best Practices
- Defense-in-depth strategies
- Firewall and access control guidance
- Monitoring recommendations
- Least privilege principles
- Unidirectional flow considerations

## Common Patterns

### Pattern 1: Upward Data Flow (Process → Business)

Most OT data flows upward:
- Level 0 → Level 1: Sensor readings
- Level 1 → Level 2: Process variables, alarms
- Level 2 → Level 3: Historical data, KPIs
- Level 3 → Level 4: Manufacturing metrics
- Level 4 → Level 5: Business intelligence

**Security:** Use unidirectional conduits where possible.

### Pattern 2: Downward Control Flow (Business → Process)

Control commands and configurations flow downward:
- Level 4 → Level 3: Production schedules, recipes
- Level 3 → Level 2: Setpoints, operational changes
- Level 2 → Level 1: Control commands, logic updates
- Level 1 → Level 0: Actuator commands

**Security:** Use filtered bidirectional with strict validation and authentication.

### Pattern 3: DMZ as Security Boundary

Level 3 (DMZ) acts as security boundary:
- **Function:** Data aggregation, protocol translation, access control
- **Ingress:** Filtered from Level 2 (OT data)
- **Egress:** Filtered to Level 4 (business data)
- **Remote access:** Jump hosts within DMZ, not direct to OT
- **Security:** Highest scrutiny, SL-3 typical

### Pattern 4: Air-Gapped Critical Systems

Safety systems may be air-gapped:
- **Example:** Safety Instrumented Systems (SIS)
- **Connection:** No network connection, or unidirectional only
- **Data flow:** Monitoring data out, no commands in
- **Security:** Physical separation, unidirectional gateway

## Tips and Best Practices

1. **Start with Purdue Model:** Query by purdue_level to understand the standard architecture
2. **Verify asset placement:** Ensure your assets are in appropriate zones (PLCs in Level 1, HMI in Level 2, etc.)
3. **Implement DMZ:** Always include a Level 3 DMZ between OT and IT networks
4. **Prefer unidirectional flows:** Use data diodes for upward flows where commands aren't needed
5. **Validate bidirectional flows:** If a flow is bidirectional, ensure it's truly necessary
6. **Meet minimum SL requirements:** Each zone and conduit specifies minimum security levels
7. **Defense-in-depth:** Layer multiple controls at zone boundaries
8. **Monitor all flows:** Implement network monitoring at each conduit
9. **Least privilege:** Only allow necessary protocols and ports
10. **Document deviations:** If you deviate from guidance, document the risk-based decision

## Related Tools

- **map_security_level_requirements:** Get specific security controls for each zone's target SL
- **search_ot_requirements:** Search for network segmentation requirements (SR 5.x)
- **get_ot_requirement:** Get details on specific segmentation requirements like SR 5.1
- **get_requirement_rationale:** Understand why network segmentation is required

## Integration with Other Standards

### NIST SP 800-82 Alignment

NIST 800-82 provides complementary guidance:
- Section 6.2: Network Architecture and Security
- Appendix H: ICS Network Architectures

Query both:
```
1. Get IEC zones: get_zone_conduit_guidance()
2. Search NIST: "Show me NIST 800-82 guidance on network segmentation"
3. Map NIST recommendations to IEC zones
```

### ISA-95 Integration

ISA-95 defines functional levels that map to Purdue:
- Level 4: Business Planning & Logistics (Purdue 4)
- Level 3: Manufacturing Operations Management (Purdue 3)
- Level 2: Batch Control, Supervisory Control (Purdue 2)
- Level 1: Discrete, Batch, Continuous Control (Purdue 1)
- Level 0: Physical Process (Purdue 0)

## Error Handling

**Invalid Purdue level:**
```json
{
  "purdue_level": 6  // Error: must be 0-5
}
```
Returns error: "Purdue level must be between 0 and 5"

**Invalid security level:**
```json
{
  "security_level_target": 5  // Error: must be 1-4
}
```
Returns error: "Security level target must be between 1 and 4"

**No zones found:**
```json
{
  "purdue_level": 5,
  "security_level_target": 4  // If no SL-4 zones at Level 5
}
```
Returns empty zones array but still returns conduits and general guidance

## Further Reading

- IEC 62443-3-2: Security risk assessment and system design (purchase from ISA/IEC)
- [IEC 62443 Ingestion Guide](../ingestion/iec62443-guide.md): How to populate zone/conduit data
- NIST SP 800-82 Rev 3: Guide to Operational Technology Security (free from NIST)
- Purdue Reference Architecture: [ISA-95 Standards](https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95)
