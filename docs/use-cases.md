# OT Security MCP Server - Use Cases by Industry

Real-world scenarios showing how different industries use the OT Security MCP Server.

---

## Manufacturing

### Scenario 1: Automotive Assembly Plant Security Assessment

**Challenge:** Tier 1 automotive supplier needs IEC 62443 Security Level 2 compliance for PLCs controlling robotic assembly lines.

**How the MCP Helps:**

```
Query: "What IEC 62443 requirements apply to Security Level 2 for embedded devices?"

Result: Returns 45+ requirements specific to SL-2 for PLCs/embedded controllers

Query: "Show me the zone and conduit architecture for a Purdue Level 1 manufacturing cell"

Result: Network segmentation guidance with zones for:
- Level 0: Sensors/actuators on robots
- Level 1: PLCs controlling assembly stations
- Level 2: HMI/SCADA supervisory control
- Conduits between levels with firewall requirements

Query: "What MITRE ATT&CK techniques target PLCs in manufacturing?"

Result: T0800 (Modify Control Logic), T0858 (Modify Program), T0836 (Modify Parameter)
+ mitigations mapped to IEC requirements
```

**Outcome:** Complete security assessment in hours instead of weeks, with clear requirements mapped to equipment.

---

### Scenario 2: Pharmaceutical Manufacturing Compliance

**Challenge:** Pharma plant must comply with FDA 21 CFR Part 11 + IEC 62443 for batch control systems.

**How the MCP Helps:**

```
Query: "Map IEC 62443 SR 1.1 (user authentication) to NIST 800-53 controls"

Result: Mappings to IA-2 (Identification and Authentication), AC-2 (Account Management)

Query: "What are the audit and accountability requirements from NIST 800-53 for OT systems?"

Result: 16 AU-family controls applicable to manufacturing execution systems (MES)

Query: "Design network zones for a pharmaceutical batch control system at Purdue Level 2"

Result: Zone architecture with:
- Recipe management zone (Level 2)
- Batch execution zone (Level 2)
- Quality system interface zone (Level 3)
- Conduit security requirements per IEC 62443-3-2
```

**Outcome:** Compliance framework integrating FDA, IEC, and NIST requirements in one query.

---

## Energy & Utilities

### Scenario 3: Substation Automation Security

**Challenge:** Electric utility deploying IEC 61850-based substation automation must meet NERC CIP + IEC 62443 requirements.

**How the MCP Helps:**

```
Query: "What are NIST 800-82 recommendations for SCADA system security monitoring?"

Result: Guidance on AU-6 (Audit Review), SI-4 (System Monitoring), with NIST 800-53 mappings

Query: "Show zone/conduit design for a Purdue Level 2 substation control network"

Result: Network segmentation:
- Level 1: IEDs, protection relays (bay level)
- Level 2: Substation automation (station level)
- Level 3: Control center SCADA
- DMZ for external communication
- IEC 62443 security requirements per conduit

Query: "Which MITRE ATT&CK techniques target SCADA systems?"

Result: T0830 (Man in the Middle), T0885 (Commonly Used Port), T0842 (Network Connection Enumeration)
+ Mitigations: M0930 (Network Segmentation), M0937 (Filter Network Traffic)
```

**Outcome:** Security architecture aligned with both IEC 62443 and NERC CIP-005/007 requirements.

---

### Scenario 4: Water Treatment Facility Compliance

**Challenge:** Municipal water utility must comply with America's Water Infrastructure Act (AWIA) + implement IEC 62443 SL-2.

**How the MCP Helps:**

```
Query: "What IEC 62443 requirements apply to water treatment SCADA systems at SL-2?"

Result: 67 system requirements filtered by SL-2, including:
- SR 1.1: User authentication
- SR 2.1: Authorization enforcement
- SR 3.3: Security event logging
- SR 7.1: Denial of service protection

Query: "Map NIST 800-82 incident response guidance to NIST 800-53 controls"

Result: NIST 800-82 → IR-4, IR-6, IR-8 with water/wastewater-specific considerations

Query: "What are the physical security requirements for OT environments?"

Result: NIST 800-53 PE family (23 controls):
- PE-3: Physical Access Control
- PE-6: Monitoring Physical Access
- PE-9: Power Equipment and Cabling
```

**Outcome:** Complete compliance framework from federal mandates to technical controls.

---

## Critical Infrastructure

### Scenario 5: Data Center OT Security

**Challenge:** Hyperscale data center managing HVAC, power distribution, and fire suppression via building automation systems (BAS).

**How the MCP Helps:**

```
Query: "What are the security requirements for building automation systems under IEC 62443?"

Result: Component requirements from IEC 62443-4-2 for:
- Embedded devices (BACnet controllers)
- Host devices (BAS servers)
- Network devices (BAS network switches)

Query: "Design network segmentation for data center facility management systems"

Result: Purdue Model adaptation:
- Level 1: Field controllers (VAVs, chillers, UPS)
- Level 2: Building management system (BMS)
- Level 3: Enterprise facility management
- DMZ for remote monitoring

Query: "What MITRE ATT&CK techniques exploit building automation systems?"

Result: T0868 (Detect Operating Mode), T0858 (Change Program State), T0831 (Manipulation of Control)
```

**Outcome:** Secure BAS architecture protecting critical data center infrastructure.

---

## Medical Devices

### Scenario 6: Hospital Medical Device Security

**Challenge:** Hospital network includes FDA-regulated medical devices requiring IEC 81001-5-1 + IEC 62443-4-2 compliance.

**How the MCP Helps:**

```
Query: "What IEC 62443 component requirements apply to networked medical devices?"

Result: IEC 62443-4-2 requirements for embedded devices:
- CR 1.1: Human user identification
- CR 2.1: Authorization enforcement
- CR 3.4: Software integrity
- CR 7.1: Denial of service protection

Query: "Map medical device security to NIST 800-53 healthcare controls"

Result: Cross-mappings to:
- AC-19: Access Control for Mobile Devices
- SC-8: Transmission Confidentiality
- SI-7: Software Integrity

Query: "What network segmentation is recommended for medical device networks?"

Result: NIST 800-82 + IEC 62443-3-2 guidance:
- Medical device VLAN (isolated)
- Clinical workstation VLAN
- Hospital IT network
- Firewalls at each boundary
```

**Outcome:** Compliance framework for FDA Premarket Cybersecurity Guidance + IEC standards.

---

## Transportation

### Scenario 7: Railway Signaling System Security

**Challenge:** Rail operator deploying CBTC (Communications-Based Train Control) must meet EN 50159 + IEC 62443 requirements.

**How the MCP Helps:**

```
Query: "What are IEC 62443 security requirements for safety-critical control systems?"

Result: IEC 62443-3-3 requirements + IEC 62443-4-2 for:
- SR 3.3: Security audit
- SR 7.2: Resource management
- CR 3.9: Protection of audit information
- SL-3 or SL-4 recommended for safety systems

Query: "Design zone architecture for railway signaling network"

Result: Purdue Model for rail:
- Level 0: Track circuits, point machines
- Level 1: Interlocking systems
- Level 2: Traffic management system
- Level 3: Operations control center
- Safety zone isolation per EN 50159

Query: "What MITRE techniques target industrial safety systems?"

Result: T0880 (Loss of Safety), T0816 (Device Restart/Shutdown), T0829 (Loss of View)
```

**Outcome:** Security architecture integrating IEC 62443 with railway-specific safety standards.

---

## Oil & Gas

### Scenario 8: Pipeline SCADA Security

**Challenge:** Interstate pipeline operator must comply with TSA Security Directive + implement IEC 62443 for SCADA/DCS systems.

**How the MCP Helps:**

```
Query: "What are NIST 800-82 recommendations for pipeline control system security?"

Result: Network segmentation, access control, incident response guidance
+ Mappings to NIST 800-53 controls

Query: "Show zone/conduit architecture for oil & gas pipeline SCADA"

Result: Network design:
- Field sites: RTUs at pump/compressor stations (Level 1)
- SCADA master: Control center (Level 2)
- Corporate: Business network (Level 4)
- DMZ: Historian, reporting systems
- Satellite/radio backhaul: Encrypted conduits

Query: "What MITRE ATT&CK techniques target pipeline infrastructure?"

Result: T0840 (Network Connection Enumeration), T0858 (Modify Program), T0884 (Connection Proxy)
+ Mitigations mapped to IEC 62443 requirements
```

**Outcome:** TSA-compliant security architecture with defense-in-depth controls.

---

## Common Queries Across Industries

### Security Level Targeting

```
"Which IEC 62443 security level should I target for [asset type]?"
"Compare requirements between SL-2 and SL-3"
"What's the difference between SL-T, SL-C, and SL-A?"
```

### Network Segmentation

```
"How should I segment my OT network using the Purdue Model?"
"What firewall rules are needed between Purdue Level 2 and Level 3?"
"Design a zone architecture for a [industry] facility"
```

### Threat Intelligence

```
"What MITRE ATT&CK techniques target [asset type]?"
"Show mitigations for lateral movement in OT networks"
"Map MITRE techniques to IEC 62443 requirements"
```

### Compliance Mapping

```
"Map [regulation] to IEC 62443 requirements"
"What NIST 800-53 controls support IEC 62443 SL-3?"
"Compare authentication requirements across IEC and NIST"
```

### Implementation Guidance

```
"What's the rationale behind IEC 62443 SR [X.Y]?"
"How do I implement [requirement] for [component type]?"
"What are the testing requirements for SL-[X] compliance?"
```

---

## Integration with Other Tools

### Threat Modeling

Use with STRIDE or MITRE for threat modeling:
1. Identify assets and attack surface
2. Query MITRE ATT&CK for applicable techniques
3. Map techniques to IEC 62443 requirements
4. Generate security controls matrix

### Compliance Audits

Support audit workflows:
1. Query requirements for target security level
2. Generate controls matrix from NIST 800-53
3. Map to existing security controls
4. Identify gaps automatically

### Security Architecture

Design secure OT networks:
1. Query zone/conduit guidance for Purdue levels
2. Get security requirements per zone
3. Design conduit security (firewalls, encryption)
4. Validate against IEC 62443-3-2

---

## Support

Need help with your use case?

- **Community:** [GitHub Discussions](https://github.com/Ansvar-Systems/ot-security-mcp/discussions)
- **Commercial:** [info@ansvar.eu](mailto:info@ansvar.eu)

---

**Last Updated:** 2026-01-29 (Stage 2 Release)
