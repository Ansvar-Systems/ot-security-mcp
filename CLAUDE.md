# OT Security MCP - Development Guide

**Part of the Ansvar MCP Suite** → See [central architecture docs](https://github.com/Ansvar-Systems/security-controls-mcp/blob/main/docs/ANSVAR_MCP_ARCHITECTURE.md) for complete suite documentation

## Project Overview

MCP server for Operational Technology (OT) security standards. Query IEC 62443, NIST 800-82/53, and MITRE ATT&CK for ICS from Claude Desktop.

## Key Features

- **IEC 62443**: 238 requirements (3-3, 4-2, 3-2) - user-supplied licensed data
- **NIST 800-53 Rev 5**: 228 OT-relevant controls from 12 families
- **NIST 800-82 Rev 3**: Guide to Operational Technology Security
- **MITRE ATT&CK for ICS**: 83 techniques, 52 mitigations, 331 relationships
- **Security Level Mapping**: Query by SL-1 through SL-4
- **Zone/Conduit Guidance**: Purdue Model architecture
- **Cross-Standard Mappings**: IEC ↔ NIST relationships

## Tech Stack

- **Language**: TypeScript
- **Database**: SQLite with FTS5 full-text search
- **Package Manager**: npm
- **Distribution**: npm (`npm install @ansvar/ot-security-mcp`)
- **Data Sources**:
  - NIST 800-53: OSCAL format (automated ingestion)
  - MITRE ATT&CK: STIX 2.0 format (automated ingestion)
  - IEC 62443: User-supplied (licensed standards)
  - NIST 800-82: Curated from official PDF

## Quick Start

```bash
# Install globally
npm install -g @ansvar/ot-security-mcp

# Claude Desktop config
{
  "mcpServers": {
    "ot-security": {
      "command": "npx",
      "args": ["-y", "@ansvar/ot-security-mcp"]
    }
  }
}
```

## Project Structure

```
ot-security-mcp/
├── src/
│   ├── index.ts               # MCP server entry point
│   ├── database/
│   │   ├── client.ts          # SQLite database layer
│   │   └── schema.sql         # Database schema
│   ├── tools/                 # 7 MCP tool implementations
│   │   ├── list-standards.ts
│   │   ├── get-requirement.ts
│   │   ├── search.ts
│   │   ├── map-security-level-requirements.ts
│   │   ├── get-zone-conduit-guidance.ts
│   │   ├── get-requirement-rationale.ts
│   │   └── get-mitre-technique.ts
│   └── data/
│       └── ot-security.db     # Pre-built database
├── scripts/                   # Ingestion scripts
│   ├── ingest-iec62443.ts    # IEC 62443 ingestion
│   ├── ingest-nist-80053.ts  # NIST 800-53 (OSCAL)
│   ├── ingest-nist-80082.ts  # NIST 800-82
│   └── ingest-mitre-ics.ts   # MITRE ATT&CK
├── tests/                     # 294 passing tests
└── docs/                      # Comprehensive documentation
```

## Available Tools

### 1. `list_standards`
List all OT security standards and their coverage

### 2. `get_requirement`
Retrieve specific requirements by ID (e.g., "SR 1.1", "AC-2")

### 3. `search_requirements`
Full-text search across all standards

### 4. `map_security_level_requirements`
Get IEC 62443 requirements for a specific security level (SL-1 to SL-4)

### 5. `get_zone_conduit_guidance`
Network segmentation guidance based on Purdue Model

### 6. `get_requirement_rationale`
Understand WHY requirements exist (regulatory drivers, threats)

### 7. `get_mitre_technique`
Query MITRE ATT&CK for ICS techniques and mitigations

## IEC 62443 Licensing

> ⚠️ **IEC 62443 NOT INCLUDED**
>
> IEC 62443 is copyrighted by ISA/IEC. This package provides:
> - Database schema for IEC data
> - Ingestion scripts
> - JSON templates
> - Sample data (2 requirements for demo)
>
> **You must provide your own licensed standards:**
> - Purchase from [ISA](https://www.isa.org/standards-and-publications/isa-iec-62443-series-of-standards) or [IEC](https://webstore.iec.ch/)
> - Create JSON files from your licensed PDFs
> - Run ingestion: `npx tsx scripts/ingest-iec62443.ts`

See [docs/ingestion/iec62443-guide.md](./docs/ingestion/iec62443-guide.md) for details.

## Development

```bash
# Clone and install
git clone https://github.com/Ansvar-Systems/ot-security-mcp
cd ot-security-mcp
npm install

# Run tests (294 tests)
npm test

# Build
npm run build

# Run locally
npm run dev
```

## Data Updates

### Automated (NIST, MITRE)

```bash
# Update NIST 800-53 from official OSCAL GitHub
npm run ingest:nist-80053

# Update MITRE ATT&CK from official STIX repository
npm run ingest:mitre

# Daily GitHub Actions check for updates
```

### Manual (IEC 62443)

```bash
# After obtaining licensed standards:
npm run ingest:iec62443
npm run verify:integrity
npm test
npm version patch
npm publish
```

## Security Levels (IEC 62443)

| Level | Description | Example Use Case |
|-------|-------------|------------------|
| **SL-1** | Protection against casual violation | Office building HVAC |
| **SL-2** | Protection against intentional violation | Manufacturing plant |
| **SL-3** | Protection against sophisticated means | Energy/utilities |
| **SL-4** | Protection against sophisticated means with extensive resources | Nuclear, military |

Query requirements by level:
```json
{
  "tool": "map_security_level_requirements",
  "security_level": 2,
  "component_type": "embedded_device"
}
```

## Purdue Model (Zone/Conduit Architecture)

```
Level 5: Enterprise Network
────────────────────────────── DMZ ──────────────────────────────
Level 4: Site Business Planning
Level 3: Site Operations (SCADA, HMI)
Level 2: Area Supervisory Control (PLC, DCS)
Level 1: Basic Control (Sensors, Actuators)
Level 0: Physical Process
```

Get guidance: `get_zone_conduit_guidance` tool

## Integration with Other Ansvar MCPs

Essential for OT security workflows:
- **EU Regulations MCP**: Map NIS2 → IEC 62443 security levels
- **Security Controls MCP**: Bridge IEC 62443 ↔ ISO 27001 ↔ NIST CSF
- **Sanctions MCP**: Screen OT vendors/suppliers
- **US Regulations MCP**: Healthcare IoT (HIPAA + IEC 62443-4-2)

See [central architecture docs](https://github.com/Ansvar-Systems/security-controls-mcp/blob/main/docs/ANSVAR_MCP_ARCHITECTURE.md) for complete workflows.

## Testing

```bash
# Run all 294 tests
npm test

# With coverage
npm run test:coverage

# Specific test suite
npm test -- tests/unit/map-security-level-requirements.test.ts
```

## CI/CD

Comprehensive GitHub Actions:
- **CI Workflow**: Multi-version testing (Node 18.x, 20.x, 22.x)
- **Security Workflow**: npm audit, CodeQL, SBOM generation
- **Pre-commit Hooks**: Lint, format, type-check
- **Daily Update Checks**: Monitor NIST/MITRE sources

See [docs/CI-CD-SETUP.md](./docs/CI-CD-SETUP.md) for details.

## Coding Guidelines

- TypeScript strict mode
- ESLint + Prettier
- Vitest for testing (294 tests, 100% passing)
- Conventional Commits
- All data from official public sources (or user-supplied licensed)

## Current Statistics

- **IEC 62443 Requirements**: 238 (user-supplied)
- **NIST 800-53 Controls**: 228 OT-relevant
- **NIST 800-82 Guidance**: Curated sections
- **MITRE ICS Techniques**: 83 techniques, 52 mitigations
- **Cross-Standard Mappings**: 16 validated mappings
- **Database Size**: ~5MB (without IEC data)
- **Tests**: 294 passing

## Version History

- **v0.2.0** (2026-01-29): MITRE ATT&CK, zone/conduit guidance, CI/CD
- **v0.1.0**: Initial release with IEC 62443 + NIST

## Support

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and use cases
- **Commercial**: hello@ansvar.eu (IEC 62443 consulting, security level targeting)

## License

**Code**: Apache License 2.0
**Data**:
- IEC 62443: User-supplied (requires license)
- NIST 800-53/82: Public domain (US government)
- MITRE ATT&CK: Apache 2.0

---

**For complete Ansvar MCP suite documentation, see:**
📖 [Central Architecture Documentation](https://github.com/Ansvar-Systems/security-controls-mcp/blob/main/docs/ANSVAR_MCP_ARCHITECTURE.md)
