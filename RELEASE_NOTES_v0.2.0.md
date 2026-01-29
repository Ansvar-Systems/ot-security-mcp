# Release Notes: OT Security MCP Server v0.2.0

**Release Date:** January 29, 2026

## Overview

Stage 2 release brings comprehensive OT security standards integration, adding IEC 62443 and NIST SP 800-82/800-53 to the existing MITRE ATT&CK for ICS foundation. This release enables security level-based requirement mapping, zone/conduit network segmentation guidance, and detailed requirement rationale across multiple frameworks.

## New Features

### 🔐 IEC 62443 Industrial Control Systems Security

- **IEC 62443-3-3**: System Security Requirements and Security Levels
  - 2 foundational security requirements (SR 1.1, SR 1.1 RE 1)
  - Security Level (SL-1 through SL-4) mappings with capability levels
  - Detailed requirement rationale and enhancement notes

- **IEC 62443-4-2**: Technical Security Requirements for IACS Components
  - 2 component-level requirements
  - System vs. component type differentiation
  - Security level applicability for embedded systems and host devices

- **IEC 62443-3-2**: Security Risk Assessment for System Design
  - Purdue Model zones (Levels 0-5)
  - Network conduits and data flow mappings
  - Reference architecture templates
  - Zone-to-zone communication security requirements

### 🏛️ NIST Security Controls Integration

- **NIST SP 800-53 Rev 5**: Security and Privacy Controls for Information Systems
  - 228 security controls from 12 control families
  - OSCAL-based ingestion (JSON format)
  - Control families: AC, AU, CA, CM, CP, IA, IR, MA, PE, SA, SC, SI
  - Detailed control descriptions, supplemental guidance, and parameters

- **NIST SP 800-82 Rev 3**: Guide to Operational Technology (OT) Security
  - 6 critical OT security guidance topics
  - Cross-references to NIST 800-53 controls
  - OT-specific implementation guidance
  - 12 validated mappings between 800-82 and 800-53

### 🛠️ New MCP Tools

#### 1. `map_security_level_requirements`

Map requirements to specific IEC 62443 security levels (SL-1 through SL-4).

**Parameters:**
- `security_level` (required): Target security level (1-4)
- `component_type` (optional): Filter by "system", "component", or "both"
- `include_enhancements` (optional): Include requirement enhancements (default: true)

**Returns:** Array of requirements applicable to the specified security level with complete security level details.

**Use Cases:**
- Compliance planning for target security level
- Gap analysis between current and target SL
- Component vs. system requirement differentiation

#### 2. `get_zone_conduit_guidance`

Generate IEC 62443-3-2 network segmentation guidance based on Purdue Model zones.

**Parameters:**
- `purdue_level` (optional): Filter by Purdue level (0-5)
- `security_level_target` (optional): Filter by target security level (1-4)
- `reference_architecture` (optional): Filter by reference architecture

**Returns:**
- Zones with Purdue level, security level target, typical assets
- Conduits with security requirements and minimum SL
- Data flows between zones with bidirectional indicators
- Practical implementation guidance text

**Use Cases:**
- Network segmentation design
- Zone-based security architecture planning
- Conduit security requirement identification

#### 3. `get_requirement_rationale`

Retrieve detailed rationale and regulatory context for security requirements.

**Parameters:**
- `requirement_id` (required): Requirement identifier
- `standard` (required): Standard identifier

**Returns:**
- Complete requirement details
- Rationale explaining why the requirement exists
- Security levels (for IEC 62443)
- Regulatory context and sector applicability
- Related requirements from other standards

**Use Cases:**
- Understanding requirement justification
- Compliance documentation
- Cross-framework requirement tracing

### 📊 Enhanced Existing Tools

All Stage 1 tools now support Stage 2 standards:

- **`search_ot_requirements`**: Search across all 6 standards (was: MITRE only)
- **`get_ot_requirement`**: Retrieve requirements from IEC 62443, NIST 800-53, NIST 800-82
- **`list_ot_standards`**: Lists all 6 ingested standards with accurate requirement counts
- **`get_mitre_ics_technique`**: Enhanced error handling and validation

## Database Schema Updates

### New Tables

- `security_levels`: IEC 62443 security level mappings (SL-1 through SL-4)
- `zones`: Purdue Model network zones (Levels 0-5)
- `conduits`: Network conduits connecting zones
- `zone_conduit_flows`: Data flow mappings between zones via conduits
- `reference_architectures`: Standard reference architecture templates
- `sector_applicability`: Regulatory drivers by industrial sector

### Updated Tables

- `ot_mappings`: Cross-standard requirement mappings (NIST 800-82 ↔ 800-53)
- `ot_requirements`: Enhanced with `rationale` and `component_type` fields

## Standards Coverage

| Standard | Requirements/Techniques | Version |
|----------|------------------------|---------|
| IEC 62443-3-3 | 2 requirements | 2013 |
| IEC 62443-4-2 | 2 requirements | 2018 |
| IEC 62443-3-2 | 3 zones, 1 conduit | 2020 |
| NIST SP 800-53 | 228 controls | Rev 5 |
| NIST SP 800-82 | 6 guidance topics | Rev 3 (Draft) |
| MITRE ATT&CK ICS | 83 techniques | v16 |

## Testing

- **263 tests passing** (up from 233 in v0.1.0)
- New end-to-end workflow tests covering:
  - Cross-standard queries (IEC ↔ NIST mappings)
  - Security level filtering and requirement mapping
  - Zone/conduit guidance generation workflows
  - Requirement rationale with complete metadata
  - Multi-tool chained operations
  - Data consistency validation
  - Error handling and edge cases

## Data Integrity

New data integrity verification script ensures:
- ✅ All foreign key relationships valid
- ✅ No orphaned records in junction tables
- ✅ All security levels in valid range (1-4)
- ✅ All Purdue levels in valid range (0-5)
- ✅ All cross-standard mappings reference valid requirements
- ✅ Requirement counts match expected values

**Run verification:** `npm run verify:integrity`

## Documentation

### New Documentation

- `docs/INGESTION_GUIDE_IEC62443.md`: IEC 62443 data ingestion
- `docs/INGESTION_GUIDE_NIST.md`: NIST 800-53 and 800-82 ingestion
- `docs/TOOL_REFERENCE.md`: Updated with all 7 tools

### Updated Documentation

- `README.md`: Complete feature list and usage examples
- All tool schemas validated with comprehensive examples

## Migration Guide

### From v0.1.0 to v0.2.0

**No breaking changes** - v0.2.0 is fully backward compatible with v0.1.0.

#### Database Migration

The database schema automatically migrates on first run. Existing MITRE ICS data is preserved.

**Steps:**
1. Update package: `npm install @ansvar/ot-security-mcp@0.2.0`
2. Database schema auto-upgrades on next server start
3. Ingest new standards (optional):
   ```bash
   npm run ingest:iec62443
   npm run ingest:nist-80053
   npm run ingest:nist-80082
   ```

#### New Optional Dependencies

None - all dependencies compatible with v0.1.0.

## Performance

- **Search queries**: <500ms for 50 results across all 6 standards
- **Standard listing**: <100ms
- **Requirement retrieval**: <50ms with full mappings
- **Zone guidance generation**: <200ms with flows

## Known Limitations

1. **NIST 800-53 Coverage**: 228/325 controls (12/20 families)
   - Missing families: AT, MP, PL, PM, PS, PT, RA, SR
   - These will be added in future updates

2. **IEC 62443 Sample Data**: 2 requirements per part (proof of concept)
   - Full standard ingestion requires licensed access to IEC 62443 documents

3. **Cross-Standard Mappings**: 12 NIST 800-82 ↔ 800-53 mappings
   - IEC 62443 ↔ NIST mappings to be added in v0.3.0

## Breaking Changes

None - fully backward compatible with v0.1.0.

## Deprecations

None.

## Security

No security issues identified or fixed in this release.

## Contributors

- Ansvar Systems Development Team
- Co-Authored-By: Claude Sonnet 4.5

## Roadmap to v0.3.0

- Complete NIST 800-53 control family coverage
- IEC 62443 ↔ NIST cross-standard mappings
- Additional IEC 62443-3-2 zones and conduits
- Sector-specific requirement filtering
- Enhanced zone flow visualization data
- Performance optimizations for large result sets

## Upgrade Instructions

### NPM Installation

```bash
npm install @ansvar/ot-security-mcp@0.2.0
```

### Git Installation

```bash
git checkout v0.2.0
npm install
npm run build
```

### Data Ingestion (Recommended)

Ingest all Stage 2 standards for full functionality:

```bash
# IEC 62443 (all three parts)
npm run ingest:iec62443

# NIST SP 800-53 Rev 5
npm run ingest:nist-80053

# NIST SP 800-82 Rev 3
npm run ingest:nist-80082

# Verify data integrity
npm run verify:integrity
```

## Support

- **Issues**: https://github.com/ansvar-systems/ot-security-mcp/issues
- **Documentation**: https://github.com/ansvar-systems/ot-security-mcp/tree/main/docs
- **Email**: hello@ansvar.eu

---

**Full Changelog**: https://github.com/ansvar-systems/ot-security-mcp/compare/v0.1.0...v0.2.0
