# IEC 62443 JSON Templates

This directory contains templates for populating IEC 62443 standard data from your licensed copies of the standards.

## Important Notice

**IEC 62443 standards are copyrighted material** published by the International Society of Automation (ISA) and the International Electrotechnical Commission (IEC). You must have licensed access to these standards to populate these templates.

## Templates Provided

### 1. `iec62443-3-3-template.json` - System Security Requirements

- **Standard:** IEC 62443-3-3 System security requirements and security levels
- **Version:** v2.0 (2023)
- **Content:** System Requirements (SR) organized into 7 Foundational Requirements (FR)
- **Structure:** ~67 base requirements plus Requirement Enhancements (RE) for higher security levels

**How to populate:**
1. Purchase/access IEC 62443-3-3 from ISA or IEC
2. For each SR (e.g., SR 1.1, SR 1.2, etc.):
   - Copy the requirement ID, title, description, and rationale
   - Identify the component type (host, network, embedded, app)
   - Map security levels (SL-1 through SL-4) to capability levels
3. Include Requirement Enhancements (RE) as separate entries with parent references
4. Validate: `npm run validate:iec62443 data/templates/iec62443-3-3-template.json`

### 2. `iec62443-4-2-template.json` - Component Requirements

- **Standard:** IEC 62443-4-2 Technical security requirements for IACS components
- **Version:** v2.0 (2023)
- **Content:** Component Requirements (CR) for individual control components
- **Structure:** Similar to 3-3 but focused on component-level requirements

**How to populate:**
1. Purchase/access IEC 62443-4-2 from ISA or IEC
2. For each CR (e.g., CR 1.1, CR 2.1, etc.):
   - Copy the requirement ID, title, description, and rationale
   - Identify the component type this CR applies to
   - Map security level capabilities (SL-C values)
3. Include CRs across all 7 foundational requirements
4. Validate: `npm run validate:iec62443 data/templates/iec62443-4-2-template.json`

### 3. `iec62443-3-2-template.json` - Security Risk Assessment

- **Standard:** IEC 62443-3-2 Security risk assessment for system design
- **Version:** v1.0 (2020)
- **Content:** Zones and Conduits based on Purdue Enterprise Reference Architecture
- **Structure:** Reference zone configurations and conduit types

**How to populate:**
1. Purchase/access IEC 62443-3-2 from ISA or IEC
2. Define **Zones** for each Purdue level (0-5):
   - Level 0: Physical Process
   - Level 1: Basic Control
   - Level 2: Area Supervisory Control
   - Level 3: Operations/SCADA DMZ
   - Level 4: Enterprise Network
   - Level 5: Internet/Cloud
3. Define **Conduits** between zones:
   - Unidirectional (data diodes)
   - Filtered Bidirectional (firewalls)
   - Open Bidirectional (internal networks)
4. Validate: `npm run validate:iec62443 data/templates/iec62443-3-2-template.json`

## Validation

Before ingesting data into the database, validate your JSON files:

```bash
# Validate a specific template
npm run validate:iec62443 path/to/your-iec62443-data.json

# Run validation tests
npm test tests/unit/validate-iec62443.test.ts
```

## Schema Definition

The JSON schema is defined in `schemas/iec62443-schema.json`. This schema enforces:

- Required metadata fields (part, title, version, published_date)
- Proper requirement structure (IDs, titles, descriptions, rationale)
- Valid security level mappings (SL-1 through SL-4)
- Correct component types (host, network, embedded, app)
- Valid zone configurations (Purdue levels 0-5)
- Valid conduit types (unidirectional, filtered_bidirectional, open_bidirectional)

## Next Steps

After populating and validating your templates:

1. Place your completed JSON files in the `data/` directory
2. Run the IEC 62443 ingestion script (Task 15 - coming soon)
3. Verify data was ingested correctly using the MCP tools

## Where to Purchase Standards

- **ISA:** https://www.isa.org/standards-and-publications
- **IEC:** https://www.iec.ch/homepage
- **Note:** Many organizations have enterprise licenses through professional memberships

## Questions?

See the main project README for more information about the OT Security MCP Server.
