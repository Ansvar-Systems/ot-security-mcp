# NIST Standards Ingestion Guide

This guide explains how to ingest NIST SP 800-53 and NIST SP 800-82 data into the OT Security MCP Server.

## Overview

The OT Security MCP Server supports two key NIST publications for OT/ICS security:

- **NIST SP 800-53 Rev 5:** Security and Privacy Controls for Information Systems
- **NIST SP 800-82 Rev 3:** Guide to Operational Technology (OT) Security

### Why NIST Standards?

NIST standards are:
- **Publicly available** (no license required)
- **Widely adopted** in federal and critical infrastructure sectors
- **Comprehensive** security control frameworks
- **Well-mapped** to other standards (IEC 62443, ISO 27001, etc.)

## NIST SP 800-53 Rev 5 Ingestion

NIST SP 800-53 provides a comprehensive catalog of security and privacy controls.

### Step 1: Download OSCAL Data

NIST provides machine-readable data in OSCAL (Open Security Controls Assessment Language) format:

```bash
# The ingestion script automatically downloads OSCAL data from NIST
npm run ingest:nist-80053
```

The script will:
1. Download the official OSCAL JSON from NIST
2. Parse control families (AC, AU, SC, etc.)
3. Extract control baselines (LOW, MODERATE, HIGH)
4. Create mappings to IEC 62443 (if available)
5. Ingest into the database

### Step 2: Verify Ingestion

After ingestion completes, verify the data:

```bash
# Check ingestion logs
# Look for: "Ingested X controls from Y families"

# Test via Claude Desktop
# Ask: "List all NIST 800-53 controls in the Access Control family"
```

### What Gets Ingested

The ingestion script extracts:

- **Control Families:** AC (Access Control), AU (Audit), SC (System Communications), etc.
- **Controls:** Individual controls like AC-2, AU-6, SC-7
- **Control Enhancements:** Enhanced requirements like AC-2(1), SC-7(5)
- **Baselines:** LOW, MODERATE, HIGH baseline assignments
- **Metadata:** Control titles, descriptions, discussion, related controls

### Data Structure

Controls are stored as `ot_requirements` with:

```
requirement_id: "AC-2"
standard_id: "nist-800-53"
title: "Account Management"
description: Full control text from NIST
rationale: Discussion section from OSCAL
component_type: Mapped based on control family
```

### Manual Extraction (Alternative)

If automatic download fails, you can manually download and parse:

```bash
# Download OSCAL JSON
curl -o data/nist-800-53-oscal.json \
  https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json

# Run ingestion with local file
npm run ingest:nist-80053 data/nist-800-53-oscal.json
```

## NIST SP 800-82 Rev 3 Ingestion

NIST SP 800-82 provides OT/ICS-specific security guidance that complements SP 800-53.

### Step 1: Understand the Structure

Unlike 800-53 (which is a control catalog), 800-82 is a guidance document. We extract:

- **Risk Assessment Guidance** (Chapter 5)
- **Security Recommendations** (Chapter 6)
- **ICS Overlay for 800-53** (Appendix G)

### Step 2: Prepare Guidance JSON

A sample guidance JSON is provided at `data/nist-80082-guidance.json`:

```json
{
  "meta": {
    "title": "NIST SP 800-82 Rev 3: Guide to Operational Technology (OT) Security",
    "version": "Rev 3",
    "published_date": "2023-11-01",
    "url": "https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final"
  },
  "guidance": [
    {
      "id": "G-5.1",
      "section": "5.2",
      "title": "Risk Assessment for ICS Environments",
      "description": "Organizations should conduct risk assessments that account for ICS-specific factors...",
      "ics_context": "ICS risk assessments must consider safety, availability as primary concern...",
      "related_800_53_controls": ["RA-3", "RA-5", "PM-9"]
    }
  ]
}
```

### Step 3: Extract Guidance Items

To extract guidance from the NIST SP 800-82 PDF:

1. Download SP 800-82 Rev 3 from https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final
2. Open `data/nist-80082-guidance.json` (or create a new file)
3. For each key guidance section in Chapters 5-6 and Appendix G:
   - Create a unique ID (e.g., "G-5.1" for Chapter 5, item 1)
   - Extract the section number
   - Create a concise title
   - Copy the guidance text as description
   - Add ICS-specific context in `ics_context`
   - Map to related 800-53 controls if mentioned

### Step 4: Ingest Guidance Data

```bash
# Ingest with the provided sample
npm run ingest:nist-80082

# Or ingest your custom extraction
npm run ingest:nist-80082 data/your-nist-80082-data.json
```

The ingestion script will:
1. Validate the JSON structure
2. Create the standard in `ot_standards`
3. Insert guidance items as requirements in `ot_requirements`
4. Create mappings to NIST 800-53 controls in `ot_mappings`

### What Gets Ingested

Key guidance areas include:

**Chapter 5: Risk Management**
- G-5.1: Risk Assessment for ICS Environments
- G-5.2: Vulnerability Management in OT
- G-5.3: Threat Intelligence for ICS

**Chapter 6: Security Program**
- G-6.1: Network Segmentation and Isolation
- G-6.2: Access Control for ICS
- G-6.3: Security Monitoring and Logging
- G-6.4: Incident Response for OT

**Appendix G: ICS Overlay**
- G-AppG.1: ICS Overlay for NIST 800-53
- Control-specific ICS implementation guidance

### Data Structure

Guidance items are stored as:

```
requirement_id: "G-6.1"
standard_id: "nist-800-82"
title: "Network Segmentation and Isolation"
description: Guidance text
rationale: ICS context and justification
component_type: network (mapped based on topic)
```

Related 800-53 controls are stored in `ot_mappings`:

```
source_standard: "nist-800-82"
source_requirement: "G-6.1"
target_standard: "nist-800-53"
target_requirement: "SC-7"
mapping_type: "implements"
confidence: 1.0
```

## Cross-Standard Mappings

When both NIST and IEC 62443 data are ingested, the system can create cross-standard mappings.

### Automatic Mapping Creation

The ingestion scripts include mapping logic for common relationships:

**NIST 800-53 to IEC 62443:**
- AC-2 (Account Management) → SR 1.1 (Human user identification)
- SC-7 (Boundary Protection) → SR 5.1 (Network segmentation)
- AU-2 (Audit Events) → SR 6.1 (Audit log accessibility)

**NIST 800-82 to 800-53:**
- Automatically created from `related_800_53_controls` field

### Manual Mapping Enhancement

You can add custom mappings by inserting into `ot_mappings` table:

```sql
INSERT INTO ot_mappings (
  source_standard,
  source_requirement,
  target_standard,
  target_requirement,
  mapping_type,
  confidence,
  notes
) VALUES (
  'iec62443-3-3',
  'SR 1.1',
  'nist-800-53',
  'AC-2',
  'equivalent',
  0.9,
  'Both require user account management with similar controls'
);
```

Mapping types include:
- `equivalent`: Nearly identical requirements
- `implements`: Target implements the source
- `related`: Related but not equivalent
- `supports`: Supports implementation of the target

## Verification and Testing

After ingesting NIST data, verify with these test queries:

### Test 1: List NIST Standards
```
What NIST standards are available in the OT Security MCP?
```

Expected: Should show nist-800-53 and nist-800-82

### Test 2: Search for Access Controls
```
Show me NIST guidance on access control for OT environments
```

Expected: Should return AC-family controls from 800-53 and G-6.2 from 800-82

### Test 3: Get Specific Control
```
Tell me about NIST 800-53 control SC-7 (Boundary Protection)
```

Expected: Full control text, enhancements, and mappings to IEC 62443

### Test 4: Cross-Standard Mapping
```
What IEC 62443 requirements map to NIST 800-53 AC-2?
```

Expected: SR 1.1 and related authentication requirements

### Test 5: ICS-Specific Guidance
```
What does NIST 800-82 say about network segmentation for ICS?
```

Expected: G-6.1 guidance with Purdue Model reference

## Common Issues and Solutions

### Issue: OSCAL download fails

**Solution:** Download manually from NIST GitHub:
```bash
curl -L -o data/nist-800-53-oscal.json \
  https://github.com/usnistgov/oscal-content/raw/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json
```

### Issue: Missing control enhancements

**Solution:** Ensure your OSCAL file includes the full catalog, not just baselines. Use the catalog JSON, not the profile JSON.

### Issue: Duplicate guidance items

**Solution:** The ingestion script uses `INSERT OR REPLACE`, so running it multiple times is safe. Check for unique `id` values in your JSON.

### Issue: Mappings not appearing

**Solution:** Ensure both standards are ingested before querying mappings. Mappings are created during ingestion if target standards exist.

## Data Sources

### NIST SP 800-53
- **Official Page:** https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- **OSCAL GitHub:** https://github.com/usnistgov/oscal-content
- **License:** Public domain (U.S. government work)

### NIST SP 800-82
- **Official Page:** https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final
- **PDF Download:** https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-82r3.pdf
- **License:** Public domain (U.S. government work)

## Advanced Topics

### Custom Baselines

To create custom baselines (e.g., "OT-MODERATE"):

1. Ingest base 800-53 controls
2. Query controls meeting your criteria
3. Store baseline in a custom table or external configuration
4. Use with `search_ot_requirements` filters

### Sector-Specific Overlays

To add sector-specific guidance (e.g., Electric Sector):

1. Create guidance JSON following 800-82 structure
2. Use sector-specific IDs (e.g., "E-6.1" for Electric)
3. Add `sector_applicability` entries
4. Link to base 800-53/800-82 controls via mappings

### Updating NIST Data

NIST periodically updates standards:

```bash
# Check for updates
npm run check-updates

# Re-run ingestion (safe - uses INSERT OR REPLACE)
npm run ingest:nist-80053
npm run ingest:nist-80082 data/updated-guidance.json
```

## Example Complete Workflow

Here's a complete example of ingesting both NIST standards:

```bash
# Step 1: Build the project
npm run build

# Step 2: Ingest NIST 800-53 (auto-downloads)
npm run ingest:nist-80053

# Step 3: Review the sample 800-82 guidance
cat data/nist-80082-guidance.json

# Step 4: Optionally extract more guidance from the PDF
# (Edit data/nist-80082-guidance.json)

# Step 5: Ingest NIST 800-82
npm run ingest:nist-80082

# Step 6: Verify in Claude Desktop
# Ask: "Compare NIST 800-53 AC-2 to IEC 62443 SR 1.1"

# Step 7: Check mappings
# Ask: "What NIST controls map to IEC 62443 security level 2?"
```

## Integration with IEC 62443

When both NIST and IEC 62443 data are ingested:

1. **Cross-reference requirements:** Query equivalent controls across standards
2. **Security level mapping:** Map NIST baselines (LOW/MODERATE/HIGH) to IEC SL-1 through SL-4
3. **Compliance gap analysis:** Identify which NIST controls satisfy IEC requirements
4. **Unified search:** Search across both standards simultaneously

Example unified query:
```
Show me all requirements for network segmentation across NIST and IEC 62443 standards
```

This will return:
- NIST 800-53: SC-7 (Boundary Protection) and related controls
- NIST 800-82: G-6.1 (Network Segmentation guidance)
- IEC 62443: SR 5.1 (Network segmentation) and related SRs
- IEC 62443-3-2: Zone and conduit guidance

## Next Steps

After ingesting NIST data:

1. Review [Tool Reference Documentation](../tools/) to learn query capabilities
2. Set up [Claude Desktop integration](../../README.md#configuration)
3. Ingest [IEC 62443 data](iec62443-guide.md) for cross-standard analysis
4. Explore the `get_requirement_rationale` tool for understanding control context

## Support

For issues with NIST ingestion:
- Check the [main README](../../README.md) for setup requirements
- Review NIST's OSCAL documentation at https://pages.nist.gov/OSCAL/
- Open a GitHub issue for ingestion script bugs
- Consult NIST's official publications for interpretation questions
