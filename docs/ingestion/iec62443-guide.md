# IEC 62443 Ingestion Guide

This guide explains how to extract IEC 62443 standard data from your licensed copies and ingest it into the OT Security MCP Server.

## Important Legal Notice

**IEC 62443 standards are copyrighted material** published by the International Society of Automation (ISA) and the International Electrotechnical Commission (IEC). You must have licensed access to these standards to use this ingestion process.

### Where to Purchase Standards

- **ISA Global:** https://www.isa.org/standards-and-publications
- **IEC Webstore:** https://www.iec.ch/homepage
- **Note:** Many organizations have enterprise licenses through professional memberships

## Overview

The IEC 62443 series provides security requirements for industrial automation and control systems (IACS). This MCP server supports three key parts:

- **IEC 62443-3-3:** System security requirements and security levels
- **IEC 62443-4-2:** Technical security requirements for IACS components
- **IEC 62443-3-2:** Security risk assessment and system design (zones/conduits)

## Workflow

The ingestion process follows these steps:

1. **Acquire Standards** - Purchase/access licensed copies
2. **Extract Requirements** - Manually extract into JSON templates
3. **Validate JSON** - Verify structure and completeness
4. **Ingest Data** - Load into SQLite database
5. **Verify** - Test with MCP tools

## Step-by-Step Instructions

### Step 1: Acquire Standards

Obtain licensed access to the IEC 62443 standards you wish to ingest. Most organizations need at minimum:

- **IEC 62443-3-3** (System requirements with security levels)
- **IEC 62443-3-2** (Zones and conduits for network segmentation)

### Step 2: Prepare JSON Templates

JSON templates are provided in `data/templates/`:

```bash
data/templates/
├── README.md                      # Detailed template instructions
├── iec62443-3-3-template.json    # System requirements template
├── iec62443-4-2-template.json    # Component requirements template
└── iec62443-3-2-template.json    # Zones and conduits template
```

### Step 3: Extract Requirements from IEC 62443-3-3

IEC 62443-3-3 contains System Requirements (SR) organized into 7 Foundational Requirements (FR):

- **FR 1:** Identification and Authentication Control
- **FR 2:** Use Control
- **FR 3:** System Integrity
- **FR 4:** Data Confidentiality
- **FR 5:** Restricted Data Flow
- **FR 6:** Timely Response to Events
- **FR 7:** Resource Availability

#### JSON Structure for Requirements

Open `data/templates/iec62443-3-3-template.json` and populate with this structure:

```json
{
  "meta": {
    "part": "3-3",
    "title": "IEC 62443-3-3 System Security Requirements and Security Levels",
    "version": "v2.0",
    "published_date": "2023-10-01"
  },
  "requirements": [
    {
      "requirement_id": "SR 1.1",
      "parent_requirement_id": null,
      "title": "Human user identification and authentication",
      "description": "The control system shall provide the capability to identify and authenticate all human users...",
      "rationale": "Human user identification and authentication is the basis for most types of accesses control...",
      "component_type": "host",
      "security_levels": [
        {
          "security_level": 1,
          "sl_type": "SL-T",
          "capability_level": 1,
          "notes": "Basic capability - identification and authentication required"
        },
        {
          "security_level": 2,
          "sl_type": "SL-T",
          "capability_level": 1,
          "notes": "Same as SL-1"
        }
      ]
    }
  ]
}
```

#### Field Descriptions

- **requirement_id**: SR identifier (e.g., "SR 1.1", "SR 2.3")
- **parent_requirement_id**: For Requirement Enhancements (RE), reference the parent SR (e.g., "SR 1.1 RE 1" has parent "SR 1.1")
- **title**: Short requirement name from the standard
- **description**: Full requirement text from the standard
- **rationale**: Why this requirement exists (from standard's rationale sections)
- **component_type**: One of: `host`, `network`, `embedded`, `app`
- **security_levels**: Array mapping SL-1 through SL-4 to capability levels

#### Security Level Mappings

For each requirement, map security levels to capability levels:

- **security_level**: 1, 2, 3, or 4 (SL-1 through SL-4)
- **sl_type**: Usually "SL-T" (Target Security Level)
- **capability_level**: The capability level required (1-4)
  - 1 = Basic capability
  - 2 = Enhanced capability (usually requires an RE)
  - 3 = Advanced capability (usually requires multiple REs)
  - 4 = Maximum capability (all REs required)
  - *Note: If a requirement does not apply at a given security level, omit that security level entry entirely*
- **notes**: Implementation guidance or references to REs

#### Handling Requirement Enhancements (RE)

Requirement Enhancements provide higher capability levels for SL-3 and SL-4:

```json
{
  "requirement_id": "SR 1.1 RE 1",
  "parent_requirement_id": "SR 1.1",
  "title": "Unique identification and authentication",
  "description": "The control system shall provide the capability to uniquely identify and authenticate...",
  "rationale": "Provides enhanced capability by requiring unique identification for each user...",
  "component_type": "host",
  "security_levels": [
    {
      "security_level": 3,
      "sl_type": "SL-T",
      "capability_level": 2,
      "notes": "Required for SL-3"
    },
    {
      "security_level": 4,
      "sl_type": "SL-T",
      "capability_level": 2,
      "notes": "Minimum requirement for SL-4"
    }
  ]
}
```

### Step 4: Extract Zones and Conduits from IEC 62443-3-2

IEC 62443-3-2 provides guidance on network segmentation using zones and conduits based on the Purdue Enterprise Reference Architecture.

Open `data/templates/iec62443-3-2-template.json` and populate:

```json
{
  "meta": {
    "part": "3-2",
    "title": "IEC 62443-3-2 Security Risk Assessment for System Design",
    "version": "v1.0",
    "published_date": "2020-03-01"
  },
  "zones": [
    {
      "name": "Process Control Network",
      "purdue_level": 1,
      "security_level_target": 2,
      "description": "Basic control devices including PLCs, RTUs, and field I/O",
      "typical_assets": "PLCs, RTUs, Field Controllers, I/O modules"
    }
  ],
  "conduits": [
    {
      "name": "Unidirectional Data Diode",
      "conduit_type": "unidirectional",
      "description": "Hardware-enforced one-way data flow preventing reverse communication",
      "minimum_security_level": 3
    }
  ],
  "flows": [
    {
      "source_zone_name": "Process Control Network",
      "target_zone_name": "SCADA DMZ",
      "conduit_name": "Unidirectional Data Diode",
      "data_flow_description": "Process data flows up to SCADA for monitoring",
      "security_level_requirement": 3,
      "bidirectional": false
    }
  ]
}
```

#### Purdue Levels

Map zones to Purdue Enterprise Reference Architecture levels:

- **Level 0:** Physical Process (sensors, actuators)
- **Level 1:** Basic Control (PLCs, RTUs, field controllers)
- **Level 2:** Area Supervisory Control (SCADA, HMI, local historians)
- **Level 3:** Operations Management (DMZ, plant historians, MES)
- **Level 4:** Enterprise Network (ERP, business systems)
- **Level 5:** Internet/Cloud (external connectivity)

### Step 5: Validate Your JSON

Before ingesting, validate the JSON structure:

```bash
# Validate IEC 62443-3-3 requirements
npm run validate:iec62443 data/your-iec62443-3-3-data.json

# Validate IEC 62443-3-2 zones/conduits
npm run validate:iec62443 data/your-iec62443-3-2-data.json
```

The validator checks for:
- Required metadata fields
- Valid requirement IDs and structure
- Security level mappings (1-4 only)
- Component types (host, network, embedded, app)
- Purdue levels (0-5)
- Parent requirement references

### Step 6: Ingest into Database

Once validated, ingest your data:

```bash
# Ingest IEC 62443-3-3 System Requirements
npm run ingest:iec62443 data/your-iec62443-3-3-data.json

# Ingest IEC 62443-3-2 Zones and Conduits
npm run ingest:iec62443 data/your-iec62443-3-2-data.json
```

The ingestion script will:
1. Validate the JSON structure
2. Create or update the standard in `ot_standards` table
3. Insert requirements into `ot_requirements` table
4. Create security level mappings in `security_levels` table
5. Insert zones, conduits, and flows into respective tables
6. Update metadata with ingestion timestamp

### Step 7: Verify Ingestion

Test that data was ingested correctly using the MCP tools:

```bash
# Start the MCP server
npm run build
npm start
```

Then in Claude Desktop, test queries:

**Test 1: List standards**
```
What OT security standards are available?
```

**Test 2: Search for a requirement**
```
Show me IEC 62443 requirements related to authentication
```

**Test 3: Get a specific requirement**
```
Tell me about IEC 62443 requirement SR 1.1
```

**Test 4: Map security levels**
```
What IEC 62443 requirements apply to Security Level 2?
```

**Test 5: Query zones and conduits**
```
Show me network segmentation guidance for Purdue Level 1
```

### Step 8: Ingest Cross-Standard Mappings

After ingesting IEC 62443 requirements, run the cross-standard mappings ingestion to enable cross-referencing between IEC 62443, NIST 800-53, and MITRE ATT&CK for ICS:

```bash
# Ingest cross-standard mappings (IEC↔NIST, MITRE↔NIST)
npm run ingest:mappings
```

This populates:
- **IEC 62443 ↔ NIST 800-53** mappings (102 mappings linking SRs/CRs to NIST controls)
- **MITRE ATT&CK ↔ NIST 800-53** mappings (88 mitigation-to-control mappings)
- **MITRE technique linkages** (populates `ot_requirement_id` in technique-mitigation relationships)

After ingestion, verify with:
```bash
npm run verify:integrity
npm test
```

Test cross-standard queries in Claude Desktop:
```
What NIST 800-53 controls map to IEC 62443 requirement SR 1.1?
Show MITRE ATT&CK mitigations for technique T0800 with NIST mappings
```

## Common Issues and Troubleshooting

### Issue: Validation fails with "Invalid requirement ID"

**Solution:** Ensure requirement IDs follow the correct format:
- Base requirements: "SR 1.1", "SR 2.3", etc.
- Enhancements: "SR 1.1 RE 1", "SR 2.3 RE 2", etc.

### Issue: "Parent requirement not found"

**Solution:** Ensure parent requirements are defined before their enhancements. The ingestion script processes requirements in order.

### Issue: Security level mapping errors

**Solution:** Verify security_level values are 1, 2, 3, or 4 only. Capability levels should be 0, 1, 2, or 3.

### Issue: Zone flow references unknown zone

**Solution:** Ensure all zones referenced in flows are defined in the zones array first. Use exact zone names.

## Data Model Reference

### ot_standards table
- `id`: Standard identifier (e.g., "iec62443-3-3")
- `name`: Full standard name
- `version`: Version string (e.g., "v2.0")
- `published_date`: ISO 8601 date
- `status`: "current", "superseded", or "draft"

### ot_requirements table
- `id`: Auto-generated primary key
- `standard_id`: References ot_standards.id
- `requirement_id`: Human-readable ID (e.g., "SR 1.1")
- `parent_requirement_id`: For REs, references parent SR
- `title`: Requirement title
- `description`: Full requirement text
- `rationale`: Why the requirement exists
- `component_type`: host, network, embedded, or app

### security_levels table
- `id`: Auto-generated primary key
- `requirement_db_id`: Foreign key to ot_requirements.id
- `security_level`: 1, 2, 3, or 4
- `sl_type`: "SL-T" (Target) or "SL-C" (Capability)
- `capability_level`: 0, 1, 2, or 3
- `notes`: Implementation guidance

### zones table
- `id`: Auto-generated primary key
- `name`: Zone name
- `purdue_level`: 0-5
- `security_level_target`: Target SL (1-4)
- `description`: Zone description
- `iec_reference`: Reference to IEC 62443-3-2 sections
- `typical_assets`: Common assets in this zone

### conduits table
- `id`: Auto-generated primary key
- `name`: Conduit name
- `conduit_type`: unidirectional, filtered_bidirectional, open_bidirectional
- `description`: Conduit description
- `security_requirements`: Required security controls
- `iec_reference`: Reference to IEC 62443-3-2 sections
- `minimum_security_level`: Minimum SL required

### zone_conduit_flows table
- `id`: Auto-generated primary key
- `source_zone_id`: Foreign key to zones.id
- `target_zone_id`: Foreign key to zones.id
- `conduit_id`: Foreign key to conduits.id
- `data_flow_description`: What data flows
- `security_level_requirement`: Required SL for this flow
- `bidirectional`: true or false

## Example Complete Workflow

Here's a complete example of extracting and ingesting IEC 62443-3-3:

1. Purchase IEC 62443-3-3 from ISA Global
2. Copy `data/templates/iec62443-3-3-template.json` to `data/iec62443-3-3.json`
3. Open your licensed PDF of IEC 62443-3-3
4. For each SR in Foundational Requirement 1 (FR 1):
   - Extract requirement_id (e.g., "SR 1.1")
   - Copy title, description, and rationale text
   - Identify component_type from the requirement
   - Map security levels from the SL tables in the standard
   - Add to JSON file
5. Repeat for all 7 Foundational Requirements
6. Add Requirement Enhancements (REs) with parent references
7. Validate: `npm run validate:iec62443 data/iec62443-3-3.json`
8. Fix any validation errors
9. Ingest: `npm run ingest:iec62443 data/iec62443-3-3.json`
10. Verify in Claude Desktop

## Tips for Efficient Extraction

1. **Start with high-value requirements:** Focus on FR 1 (Authentication) and FR 5 (Data Flow) first
2. **Use consistent formatting:** Copy text exactly as written in the standard
3. **Validate frequently:** Run validation after adding 5-10 requirements
4. **Document exceptions:** Use the notes field for clarifications
5. **Consider automation:** For large extractions, consider PDF parsing tools (with careful review)

## Next Steps

After successfully ingesting IEC 62443 data:

1. Review the [Tool Reference Documentation](../tools/) to understand how to query your data
2. Set up Claude Desktop to use the MCP server (see main README.md)
3. Consider ingesting NIST standards for cross-standard mapping (see [NIST Ingestion Guide](nist-guide.md))
4. Explore the `map_security_level_requirements` tool for security level analysis

## Support

For issues with the ingestion process:
- Check the [templates README](../../data/templates/README.md) for detailed field descriptions
- Review validation error messages carefully
- Consult the main [project README](../../README.md) for setup issues
- Open a GitHub issue for bugs in the ingestion scripts
