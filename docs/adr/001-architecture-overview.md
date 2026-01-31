# ADR 001: OT Security MCP Architecture

**Status:** Accepted
**Date:** 2026-01-29

## Context

The OT Security MCP Server needs to provide AI-native access to operational technology security standards: IEC 62443, NIST SP 800-82, MITRE ATT&CK for ICS. Built for industrial control systems, manufacturing, energy, water, and critical infrastructure sectors.

**Key requirements:**
- Query OT security standards programmatically
- Map security levels to requirements (IEC 62443)
- Cross-reference standards (IEC 62443 ↔ NIST ↔ MITRE)
- Handle copyrighted content appropriately (IEC 62443)

## Decision

### Technology Stack

- **MCP Server**: `@modelcontextprotocol/sdk`
- **Database**: SQLite with better-sqlite3 (portable, no server required)
- **Runtime**: Node.js 18+
- **Build**: TypeScript with strict mode
- **Testing**: Vitest

### Data Sources

| Standard | Format | Licensing | Ingestion |
|----------|--------|-----------|-----------|
| MITRE ATT&CK for ICS | STIX 2.0 JSON | Apache 2.0 | Automated |
| NIST 800-53 Rev 5 | OSCAL JSON | Public Domain | Automated |
| NIST 800-82 Rev 3 | Curated JSON | Public Domain | Automated |
| IEC 62443 | User-supplied JSON | Copyrighted | Manual |

### Database Schema

Core tables:
- `ot_standards` - Standard registry with version tracking
- `ot_requirements` - Requirements/controls with metadata
- `security_levels` - IEC 62443 SL-1 through SL-4 mappings
- `ot_mappings` - Cross-standard relationships
- `zones` / `conduits` - IEC 62443-3-2 architecture guidance
- `mitre_ics_techniques` / `mitre_ics_mitigations` - Threat intelligence

### Tool Design

7 MCP tools organized by function:

**Query tools:**
- `list_standards` - Available standards and coverage
- `get_requirement` - Single requirement by ID
- `search_requirements` - Full-text search across standards

**IEC 62443-specific:**
- `map_security_level_requirements` - Requirements by SL (1-4)
- `get_zone_conduit_guidance` - Network architecture guidance
- `get_requirement_rationale` - Why requirements exist

**Threat intelligence:**
- `get_mitre_technique` - ATT&CK techniques with mitigations

## Consequences

### Positive

- **Portable**: SQLite database ships with package, no external DB required
- **Compliant**: IEC 62443 content user-supplied, respects copyright
- **Automated updates**: NIST/MITRE data can be refreshed from official sources
- **Extensible**: Schema supports future standards (NERC CIP, etc.)

### Negative

- **User effort**: IEC 62443 requires manual JSON creation from licensed PDFs
- **Database size**: Pre-built DB adds ~5MB to package
- **Offline only**: No real-time API queries to external services

### Risks Mitigated

- **Copyright compliance**: No copyrighted IEC content distributed
- **Data freshness**: Automated ingestion from NIST/MITRE GitHub repos
- **Vendor lock-in**: Standard SQLite, portable across platforms
