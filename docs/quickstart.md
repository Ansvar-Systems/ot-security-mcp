# Quick Start Guide

Get the OT Security MCP Server running in 5 minutes.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm or pnpm** - Comes with Node.js
- **Claude Desktop** - [Download](https://claude.ai/download)

## Installation

### Option 1: NPM Package (Recommended)

```bash
npm install -g @ansvar/ot-security-mcp
```

### Option 2: From Source

```bash
git clone https://github.com/Ansvar-Systems/ot-security-mcp.git
cd ot-security-mcp
npm install
npm run build
```

## Data Setup

The server requires ingesting OT security standards data:

### Required Standards (Public Data)

```bash
# 1. MITRE ATT&CK for ICS (automated)
npm run ingest:mitre

# 2. NIST SP 800-53 Rev 5 (automated)
npm run ingest:nist-80053

# 3. NIST SP 800-82 Rev 3 (automated)
npm run ingest:nist-80082
```

**Time:** ~2-3 minutes total

### Optional: IEC 62443 (Licensed Data)

IEC 62443 standards require purchase from [ISA](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) or [IEC](https://webstore.iec.ch/).

See [IEC 62443 Ingestion Guide](ingestion/iec62443-guide.md) for details.

## Configure Claude Desktop

### macOS

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows

Edit: `%APPDATA%\Claude\claude_desktop_config.json`

### Configuration

**For NPM installation:**
```json
{
  "mcpServers": {
    "ot-security": {
      "command": "npx",
      "args": ["-y", "@ansvar/ot-security-mcp"]
    }
  }
}
```

**For source installation:**
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

**Important:** Replace `/absolute/path/to/ot-security-mcp` with your actual installation path.

## Verify Setup

Restart Claude Desktop, then run:

```bash
npm run verify:setup
```

Expected output:
```
✅ Database file exists
✅ All 7 required tables present
✅ Setup complete! Your OT Security MCP Server is ready.
```

## First Query

Open Claude Desktop and try:

```
What are the IEC 62443 requirements for Security Level 2?
```

Claude should respond with security level requirements from the database.

## Troubleshooting

### Database Not Found

```bash
# Check database exists
ls -la data/ot-security.db

# If missing, run ingestion scripts (see Data Setup above)
```

### Claude Can't Connect

1. **Check config syntax** - Must be valid JSON
2. **Restart Claude Desktop** - Required after config changes
3. **Check paths** - Must be absolute paths, not relative
4. **Check permissions** - Database must be readable

### No Data Returned

```bash
# Verify data was ingested
npm run verify:setup

# Check standard count
sqlite3 data/ot-security.db "SELECT COUNT(*) FROM ot_standards;"
# Expected: 6 (or 3 without IEC 62443)
```

### MCP Server Crashes

```bash
# Check Node.js version
node --version  # Should be 18+

# Rebuild
npm run clean && npm run build

# Check logs
# Claude Desktop → View → Developer → Developer Tools → Console
```

## Next Steps

- **[Example Queries](../README.md#example-queries)** - Try more queries
- **[Tool Reference](tools.md)** - Learn about available tools
- **[Use Cases](use-cases.md)** - Industry-specific examples
- **[IEC 62443 Ingestion](ingestion/iec62443-guide.md)** - Add licensed IEC data

## Support

- **GitHub Issues:** [Report problems](https://github.com/Ansvar-Systems/ot-security-mcp/issues)
- **GitHub Discussions:** [Ask questions](https://github.com/Ansvar-Systems/ot-security-mcp/discussions)
- **Email:** [info@ansvar.eu](mailto:info@ansvar.eu)
