# OT Security MCP Server

> Model Context Protocol server providing AI-native access to OT/ICS security standards, frameworks, and threat intelligence

## Overview

The OT Security MCP Server provides Claude with structured access to operational technology (OT) and industrial control system (ICS) security standards, requirements, and MITRE ATT&CK for ICS threat intelligence. It enables AI-assisted security assessments, compliance mapping, and threat analysis for critical infrastructure environments.

This server implements the Model Context Protocol (MCP), allowing seamless integration with Claude Desktop and other MCP-compatible clients.

## Features

### Stage 2 (Current) - Core Standards
- ✅ **MITRE ATT&CK for ICS** - 83 techniques, 52 mitigations, 331 relationships
- ✅ **IEC 62443-3-3** - System security requirements with security levels (SL-1 through SL-4)
- ✅ **IEC 62443-3-2** - Zones and conduits for network segmentation
- ✅ **NIST SP 800-53 Rev 5** - Security controls catalog via OSCAL
- ✅ **NIST SP 800-82 Rev 3** - OT-specific security guidance
- ✅ **Full-text search** - Search across all OT security requirements
- ✅ **Security level mapping** - Map IEC 62443 requirements to target security levels
- ✅ **Zone/conduit guidance** - Network segmentation based on Purdue Model
- ✅ **Requirement rationale** - Understand why requirements exist and their context
- ✅ **Cross-standard mappings** - NIST ↔ IEC 62443 requirement relationships

### Roadmap
- 🚧 **Enhanced mappings** - Deeper cross-standard analysis (Stage 3)
- 🚧 **NERC CIP** - Critical Infrastructure Protection standards (Stage 4)
- 🚧 **Sector applicability** - Industry-specific compliance guidance (Stage 4)
- 🚧 **Compliance gap analysis** - Automated assessment tools (Stage 4)

## Installation

### Prerequisites

- Node.js 18 or later
- npm or pnpm package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ot-security-mcp.git
cd ot-security-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Ingest data into the database
npm run ingest:mitre          # MITRE ATT&CK for ICS (required)
npm run ingest:nist-80053     # NIST 800-53 Rev 5 (auto-downloads from NIST)
npm run ingest:nist-80082     # NIST 800-82 Rev 3 guidance

# For IEC 62443, see docs/ingestion/iec62443-guide.md
# (Requires licensed access to IEC 62443 standards)
```

The ingestion scripts will fetch and populate your local database with OT security standards and threat intelligence.

## Configuration

### Claude Desktop

Add the OT Security MCP Server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ot-security": {
      "command": "node",
      "args": ["/absolute/path/to/ot-security-mcp/dist/index.js"],
      "env": {
        "OT_MCP_DB_PATH": "/absolute/path/to/ot-security-mcp/data/ot-security.db"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/ot-security-mcp` with the actual path to your installation.

After adding the configuration, restart Claude Desktop for the changes to take effect.

## Usage

Once configured, you can ask Claude to help with OT security tasks. Claude will automatically use the appropriate tools from this MCP server.

### Example Queries

**MITRE ATT&CK for ICS:**
```
What is MITRE technique T0800 and what mitigations are available?
What MITRE ICS techniques target Programmable Logic Controllers (PLCs)?
```

**IEC 62443 Security Levels:**
```
What IEC 62443 requirements apply to Security Level 2?
Show me authentication requirements for IEC 62443 SL-3
```

**Network Segmentation:**
```
Show me IEC 62443 zone and conduit guidance for Purdue Level 1
What network segmentation does IEC 62443 recommend for SCADA systems?
```

**Requirement Analysis:**
```
Why does IEC 62443 require user authentication? Tell me about SR 1.1
What's the rationale behind NIST 800-53 control SC-7?
```

**Cross-Standard Mapping:**
```
What NIST 800-53 controls map to IEC 62443 Security Level 2?
Compare NIST 800-82 network segmentation guidance to IEC 62443 zones
```

**Standards Discovery:**
```
What OT security standards are available in your knowledge base?
Search for requirements related to encryption across all standards
```

### Available Tools

The server provides 7 tools that Claude can use:

**Core Tools:**
1. **search_ot_requirements** - Full-text search across OT requirements with filtering by standard, security level, component type
2. **get_ot_requirement** - Get detailed requirement information by ID with cross-standard mappings
3. **list_ot_standards** - List all available OT security standards with coverage statistics
4. **get_mitre_ics_technique** - Query MITRE ATT&CK for ICS techniques with mitigations

**Stage 2 Tools:**
5. **map_security_level_requirements** - Map IEC 62443 requirements to specific security levels (SL-1 through SL-4)
6. **get_zone_conduit_guidance** - Get network segmentation guidance with zones, conduits, and data flows
7. **get_requirement_rationale** - Get detailed rationale, regulatory context, and related standards for any requirement

**Tool Documentation:**
- [map_security_level_requirements](docs/tools/map-security-level-requirements.md) - Security level mapping guide
- [get_zone_conduit_guidance](docs/tools/get-zone-conduit-guidance.md) - Network segmentation guide
- [get_requirement_rationale](docs/tools/get-requirement-rationale.md) - Requirement context and rationale

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
# Build TypeScript to JavaScript
npm run build

# Clean build artifacts
npm run clean
```

### Development Mode

```bash
# Run with auto-reload
npm run dev
```

### Type Checking

```bash
# Check TypeScript types
npm run typecheck
```

## Project Structure

```
ot-security-mcp/
├── data/
│   ├── ot-security.db          # SQLite database
│   ├── templates/              # JSON templates for IEC 62443 ingestion
│   └── nist-80082-guidance.json # Sample NIST 800-82 guidance
├── docs/
│   ├── ingestion/              # Data ingestion guides
│   │   ├── iec62443-guide.md   # IEC 62443 ingestion workflow
│   │   └── nist-guide.md       # NIST standards ingestion
│   └── tools/                  # Tool reference documentation
│       ├── map-security-level-requirements.md
│       ├── get-zone-conduit-guidance.md
│       └── get-requirement-rationale.md
├── scripts/
│   ├── ingest-mitre-ics.ts     # MITRE ATT&CK for ICS ingestion
│   ├── ingest-iec62443.ts      # IEC 62443 ingestion
│   ├── ingest-nist-80053.ts    # NIST 800-53 OSCAL ingestion
│   ├── ingest-nist-80082.ts    # NIST 800-82 guidance ingestion
│   └── validate-iec62443.ts    # IEC 62443 JSON validation
├── src/
│   ├── database/
│   │   ├── client.ts           # Database client
│   │   └── schema.sql          # Database schema
│   ├── tools/                  # Tool implementations (7 tools)
│   │   ├── search.ts
│   │   ├── get-requirement.ts
│   │   ├── list-standards.ts
│   │   ├── get-mitre-technique.ts
│   │   ├── map-security-level-requirements.ts
│   │   ├── get-zone-conduit-guidance.ts
│   │   ├── get-requirement-rationale.ts
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   └── index.ts                # MCP server entry point
└── tests/
    ├── integration/            # Integration tests
    └── unit/                   # Unit tests (233 passing tests)
```

## Stage 2 Implementation Status

**Completed Features:**
- ✅ Database schema (14 tables including zones, conduits, security levels)
- ✅ MITRE ATT&CK for ICS data ingestion (83 techniques, 52 mitigations)
- ✅ IEC 62443-3-3 ingestion framework with JSON templates
- ✅ IEC 62443-3-2 zones and conduits support
- ✅ NIST SP 800-53 Rev 5 OSCAL ingestion
- ✅ NIST SP 800-82 Rev 3 guidance ingestion
- ✅ 7 fully implemented tools
- ✅ 233 passing tests (208 unit + 25 integration)
- ✅ Cross-standard mappings (NIST ↔ IEC 62443)
- ✅ Security level mapping (SL-1 through SL-4)
- ✅ Comprehensive documentation (ingestion guides + tool references)

**Data Requirements:**
- IEC 62443 data requires licensed access (see [IEC 62443 Ingestion Guide](docs/ingestion/iec62443-guide.md))
- NIST data is publicly available and auto-downloaded
- Sample data provided for testing and validation

**What's Working:**
- All 7 tools fully functional
- Full-text search across requirements
- Security level mapping and filtering
- Zone/conduit network segmentation guidance
- Requirement rationale with regulatory context
- Cross-standard relationship queries

## Roadmap

### Stage 1: Foundation + MITRE ✅ Completed
- Database schema design
- MITRE ATT&CK for ICS integration
- Core tool implementations
- MCP server scaffolding

### Stage 2: Core Standards ✅ Completed (Current)
- IEC 62443-3-3 system security requirements
- IEC 62443-3-2 zones and conduits
- NIST SP 800-53 Rev 5 controls (OSCAL)
- NIST SP 800-82 Rev 3 guidance
- Security level mapping tools
- Cross-standard relationship queries
- Comprehensive documentation

### Stage 3: Enhanced Mappings (Planned)
- Deeper NIST Framework integration
- Enhanced IEC-to-NIST requirement mappings
- MITRE technique to standard control mappings
- Advanced compliance analysis queries
- Automated gap identification

### Stage 4: Advanced Features (Planned)
- NERC CIP requirements
- Sector-specific applicability engine
- Automated compliance gap analysis
- Risk-based requirement prioritization
- Assessment report generation

## Database Schema

The server uses SQLite with 14 tables organized into functional areas:

**OT Standards (Core):**
- `ot_standards` - Standard metadata (IEC 62443, NIST 800-53, NIST 800-82)
- `ot_requirements` - Individual requirements with descriptions and rationale
- `ot_mappings` - Cross-standard requirement relationships
- `sector_applicability` - Sector/jurisdiction regulatory drivers

**IEC 62443 Security Levels:**
- `security_levels` - Security level mappings (SL-1 through SL-4) with capability levels

**Network Segmentation (IEC 62443-3-2):**
- `zones` - Network zones by Purdue level (0-5)
- `conduits` - Communication pathways between zones
- `zone_conduit_flows` - Data flows with security requirements
- `reference_architectures` - Standard reference architectures (Purdue Model, etc.)

**MITRE ATT&CK for ICS:**
- `mitre_ics_techniques` - Attack techniques (83 techniques)
- `mitre_ics_mitigations` - Security mitigations (52 mitigations)
- `mitre_technique_mitigations` - Technique-mitigation relationships

**System:**
- `metadata` - Database version and ingestion timestamps
- `ingestion_log` - Audit trail of data ingestion operations

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Run type checking and tests before committing

## License

Apache 2.0

## Acknowledgments

- MITRE ATT&CK for ICS data from [MITRE Corporation](https://attack.mitre.org/matrices/ics/)
- Built using the [Model Context Protocol SDK](https://github.com/modelcontextprotocol)
- Inspired by the need for AI-assisted OT security assessments

## Documentation

Comprehensive documentation is available in the `docs/` directory:

**Ingestion Guides:**
- [IEC 62443 Ingestion Guide](docs/ingestion/iec62443-guide.md) - Complete workflow for extracting and ingesting IEC 62443 data
- [NIST Ingestion Guide](docs/ingestion/nist-guide.md) - Instructions for NIST SP 800-53 and 800-82 ingestion

**Tool Reference:**
- [map_security_level_requirements](docs/tools/map-security-level-requirements.md) - Security level mapping tool
- [get_zone_conduit_guidance](docs/tools/get-zone-conduit-guidance.md) - Network segmentation guidance tool
- [get_requirement_rationale](docs/tools/get-requirement-rationale.md) - Requirement context and rationale tool

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Review the tool reference documentation in `docs/tools/`
- Check the ingestion guides in `docs/ingestion/`
- Consult the data templates in `data/templates/`

## Version

Current version: 0.2.0 (Stage 2)

**Stage 2 Release Notes:**
- Added IEC 62443-3-3 and 62443-3-2 support
- Added NIST SP 800-53 Rev 5 and 800-82 Rev 3 support
- New tools: map_security_level_requirements, get_zone_conduit_guidance, get_requirement_rationale
- Enhanced cross-standard mapping capabilities
- 233 tests (80 more than Stage 1)
- Comprehensive ingestion and tool documentation
