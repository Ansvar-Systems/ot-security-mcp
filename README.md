# OT Security MCP Server

> Model Context Protocol server providing AI-native access to OT/ICS security standards, frameworks, and threat intelligence

## Overview

The OT Security MCP Server provides Claude with structured access to operational technology (OT) and industrial control system (ICS) security standards, requirements, and MITRE ATT&CK for ICS threat intelligence. It enables AI-assisted security assessments, compliance mapping, and threat analysis for critical infrastructure environments.

This server implements the Model Context Protocol (MCP), allowing seamless integration with Claude Desktop and other MCP-compatible clients.

## Features

Stage 1 (Current):
- ✅ **MITRE ATT&CK for ICS** - 83 techniques, 52 mitigations, 331 relationships
- ✅ **Full-text search** - Search across all OT security requirements
- ✅ **Detailed lookups** - Get comprehensive information on techniques and requirements
- ✅ **Standards registry** - List available OT security standards

Roadmap:
- 🚧 **IEC 62443** - Industrial automation security requirements (Stage 2)
- 🚧 **NIST SP 800-82** - Guide to ICS security (Stage 2)
- 🚧 **Cross-standard mappings** - Link requirements across frameworks (Stage 3)
- 🚧 **NERC CIP** - Critical Infrastructure Protection standards (Stage 4)
- 🚧 **Sector applicability** - Industry-specific compliance guidance (Stage 4)

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

# Ingest MITRE ATT&CK for ICS data
npm run ingest:mitre
```

The ingestion script will fetch the latest MITRE ATT&CK for ICS data from the official repository and populate your local database.

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

**Query MITRE ATT&CK for ICS techniques:**
```
What is MITRE technique T0800 and what mitigations are available?
```

**Search for security requirements** (available in Stage 2):
```
Show me IEC 62443 requirements related to user authentication at security level 2
```

**List available standards:**
```
What OT security standards are available in your knowledge base?
```

**Analyze threat scenarios:**
```
What MITRE ICS techniques target Programmable Logic Controllers (PLCs)?
```

### Available Tools

The server provides 4 tools that Claude can use:

1. **search_ot_requirements** - Full-text search across OT requirements with filtering
2. **get_ot_requirement** - Get detailed requirement information by ID
3. **list_ot_standards** - List all available OT security standards
4. **get_mitre_ics_technique** - Query MITRE ATT&CK for ICS techniques

See [docs/tools.md](docs/tools.md) for comprehensive tool reference documentation.

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
│   └── mitre/                  # Downloaded MITRE data
├── docs/
│   ├── plans/                  # Implementation plans
│   └── tools.md                # Tool reference documentation
├── scripts/
│   ├── ingest-mitre-ics.ts     # MITRE data ingestion
│   └── verify-mitre-data.ts    # Data verification
├── src/
│   ├── database/
│   │   └── client.ts           # Database client
│   ├── tools/                  # Tool implementations
│   │   ├── search.ts
│   │   ├── get-requirement.ts
│   │   ├── list-standards.ts
│   │   ├── get-mitre-technique.ts
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   └── index.ts                # MCP server entry point
└── tests/
    ├── integration/            # Integration tests
    └── unit/                   # Unit tests
```

## Stage 1 Implementation Status

Current Stage 1 implementation includes:

**Completed:**
- ✅ Database schema (all 9 tables defined)
- ✅ MITRE ATT&CK for ICS data ingestion (83 techniques, 52 mitigations)
- ✅ 4 core tools fully implemented
- ✅ 153 passing tests (131 unit + 22 integration)
- ✅ MCP server scaffolding
- ✅ TypeScript type definitions

**Stage 1 Limitations:**
- `search_ot_requirements` returns empty (no requirements ingested yet)
- `get_ot_requirement` returns null (no requirements ingested yet)
- `list_ot_standards` returns empty (no standards ingested yet)
- `get_mitre_ics_technique` fully functional with real data

**Next Steps (Stage 2):**
- Ingest IEC 62443-3-3 security requirements
- Ingest NIST SP 800-82 Rev 3 requirements
- Populate `ot_standards` table
- Enable full-text search across requirements

## Roadmap

### Stage 1: Foundation + MITRE (Current)
- Database schema design
- MITRE ATT&CK for ICS integration
- Core tool implementations
- MCP server scaffolding

### Stage 2: Core Standards
- IEC 62443-3-3 security requirements
- NIST SP 800-82 Rev 3 requirements
- Full-text search implementation
- Standards metadata

### Stage 3: Cross-Standard Mappings
- NIST Framework mappings
- IEC-to-NIST requirement mappings
- MITRE-to-standard mappings
- Advanced search with mappings

### Stage 4: Advanced Features
- NERC CIP requirements
- Sector applicability engine
- Compliance gap analysis
- Risk-based requirement prioritization

## Database Schema

The server uses SQLite with 9 tables:

**OT Standards:**
- `ot_standards` - Standard metadata
- `ot_requirements` - Individual requirements
- `cross_standard_mappings` - Requirement relationships
- `requirement_applicability` - Sector/asset applicability

**MITRE ATT&CK for ICS:**
- `mitre_ics_techniques` - Attack techniques
- `mitre_ics_mitigations` - Security mitigations
- `mitre_technique_mitigations` - Technique-mitigation relationships
- `mitre_standard_mappings` - MITRE-to-standard mappings

**Metadata:**
- `metadata` - Database version and ingestion timestamps

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

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Review the [tool documentation](docs/tools.md)
- Check the [implementation plans](docs/plans/)

## Version

Current version: 0.1.0 (Stage 1)
