# Troubleshooting Guide

Common issues and solutions for the OT Security MCP Server.

---

## Installation Issues

### NPM Installation Fails

**Symptoms:**
```
npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/@ansvar%2fot-security-mcp
```

**Cause:** Package not yet published to npm OR typo in package name

**Solution:**
```bash
# Install from source instead
git clone https://github.com/Ansvar-Systems/ot-security-mcp.git
cd ot-security-mcp
npm install
npm run build
```

### Build Fails with TypeScript Errors

**Symptoms:**
```
error TS2307: Cannot find module '@modelcontextprotocol/sdk'
```

**Cause:** Dependencies not installed

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Database Issues

### Database File Not Found

**Symptoms:**
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Cause:** Database hasn't been created or path is wrong

**Solution:**
```bash
# Check if database exists
ls -la data/ot-security.db

# If missing, run ingestion scripts
npm run ingest:mitre
npm run ingest:nist-80053
npm run ingest:nist-80082

# Verify setup
npm run verify:setup
```

### Database is Empty / No Standards Found

**Symptoms:**
```
list_ot_standards returns: []
```

**Cause:** Ingestion scripts haven't been run

**Solution:**
```bash
# Run all required ingestion scripts
npm run ingest:mitre          # Takes ~30 seconds
npm run ingest:nist-80053     # Takes ~1 minute
npm run ingest:nist-80082     # Takes ~10 seconds

# Verify data
sqlite3 data/ot-security.db "SELECT COUNT(*) FROM ot_standards;"
# Expected: 6 (or 3 without IEC 62443)
```

### Database Locked Error

**Symptoms:**
```
Error: SQLITE_BUSY: database is locked
```

**Cause:** Another process has the database open

**Solution:**
```bash
# Find processes using the database
lsof data/ot-security.db

# Kill the process if needed
kill <PID>

# Or close Claude Desktop and retry
```

### Permission Denied

**Symptoms:**
```
Error: EACCES: permission denied, open 'data/ot-security.db'
```

**Cause:** File permissions issue

**Solution:**
```bash
# Fix permissions
chmod 644 data/ot-security.db

# If directory permissions
chmod 755 data/
```

---

## Claude Desktop Integration

### MCP Server Not Appearing in Claude

**Symptoms:**
- Claude Desktop shows no MCP tools available
- No error messages

**Cause:** Configuration not loaded or invalid JSON

**Solution:**

1. **Check config file location:**
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. **Validate JSON syntax:**
   ```bash
   # Test if JSON is valid
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool
   ```

3. **Check config content:**
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

4. **Restart Claude Desktop** - Required after config changes

### MCP Server Crashes on Startup

**Symptoms:**
- Claude shows "MCP server disconnected" error
- Tools briefly appear then disappear

**Cause:** Server startup error (usually database path)

**Debugging:**

1. **Test server manually:**
   ```bash
   node dist/index.js
   # Should show: "OT Security MCP Server running on stdio"
   ```

2. **Check Node.js version:**
   ```bash
   node --version
   # Must be 18.0.0 or higher
   ```

3. **Check database path:**
   ```json
   {
     "mcpServers": {
       "ot-security": {
         "command": "node",
         "args": ["/FULL/PATH/TO/ot-security-mcp/dist/index.js"],
         "env": {
           "OT_MCP_DB_PATH": "/FULL/PATH/TO/ot-security-mcp/data/ot-security.db"
         }
       }
     }
   }
   ```

   **Important:** Must be ABSOLUTE paths, not relative

4. **View Claude Desktop logs:**
   - Open Developer Tools (View → Developer → Developer Tools)
   - Check Console tab for errors

### Tools Work But Return Empty Results

**Symptoms:**
```
Query: "What IEC 62443 requirements apply to SL-2?"
Result: []
```

**Cause:** Database has no data OR wrong standard ID

**Solution:**
```bash
# Check data exists
npm run verify:setup

# Check standard IDs
sqlite3 data/ot-security.db "SELECT id, name FROM ot_standards;"

# Expected IDs:
# - iec62443-3-3
# - iec62443-4-2
# - iec62443-3-2
# - nist-800-53
# - nist-800-82
# - mitre-ics
```

---

## Ingestion Issues

### MITRE Ingestion Fails

**Symptoms:**
```
Error: Failed to fetch MITRE data: ETIMEDOUT
```

**Cause:** Network issues or GitHub API rate limit

**Solution:**
```bash
# Check internet connection
curl -I https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/ics-attack/ics-attack.json

# If rate limited, wait and retry
# If timeout, check firewall/proxy settings
```

### NIST 800-53 Ingestion Fails

**Symptoms:**
```
Error: Failed to fetch OSCAL catalog: HTTP 404
```

**Cause:** NIST changed the URL or repository structure

**Solution:**
```bash
# Check current URL
cat scripts/ingest-nist-80053.ts | grep "NIST_OSCAL_URL"

# Test URL manually
curl -I https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json

# If URL changed, open GitHub issue
```

### IEC 62443 Validation Fails

**Symptoms:**
```
Error: JSON validation failed: data/my-iec.json
```

**Cause:** JSON doesn't match schema

**Solution:**
```bash
# Validate manually
npm run validate:iec62443 data/my-iec.json

# Check schema
cat schemas/iec62443-schema.json

# Use template as reference
cat data/templates/iec62443-3-3-template.json
```

**Common validation errors:**

1. **Wrong security level range:**
   ```json
   // BAD
   "security_level": 5

   // GOOD
   "security_level": 4  // Must be 1-4
   ```

2. **Missing required fields:**
   ```json
   // BAD
   {
     "requirement_id": "SR 1.1",
     "title": "Authentication"
   }

   // GOOD
   {
     "requirement_id": "SR 1.1",
     "title": "Authentication",
     "description": "...",
     "rationale": "...",
     "component_type": "host",
     "security_levels": [...]
   }
   ```

3. **Invalid requirement_id pattern:**
   ```json
   // BAD
   "requirement_id": "SR-1.1"

   // GOOD
   "requirement_id": "SR 1.1"  // Space, not hyphen
   ```

---

## Query Issues

### Search Returns No Results

**Symptoms:**
```
search_ot_requirements({ query: "authentication" })
→ []
```

**Cause:** No data OR query syntax issue

**Debugging:**
```bash
# Check total requirements
sqlite3 data/ot-security.db "SELECT COUNT(*) FROM ot_requirements;"

# Test query manually
sqlite3 data/ot-security.db "SELECT title FROM ot_requirements WHERE description LIKE '%authentication%' LIMIT 5;"

# Check FTS5 index
sqlite3 data/ot-security.db "SELECT * FROM ot_requirements_fts WHERE ot_requirements_fts MATCH 'authentication' LIMIT 5;"
```

### Get Requirement Returns Null

**Symptoms:**
```
get_ot_requirement({
  requirement_id: "SR 1.1",
  standard: "iec62443-3-3"
})
→ null
```

**Cause:** Wrong requirement_id OR wrong standard ID

**Solution:**
```bash
# List available requirements
sqlite3 data/ot-security.db "SELECT requirement_id, standard_id FROM ot_requirements WHERE requirement_id LIKE 'SR%' LIMIT 10;"

# Check exact match
sqlite3 data/ot-security.db "SELECT * FROM ot_requirements WHERE requirement_id = 'SR 1.1' AND standard_id = 'iec62443-3-3';"
```

### Security Level Mapping Returns Wrong Count

**Symptoms:**
```
map_security_level_requirements({ security_level: 2 })
→ Returns 0 items (expected 67)
```

**Cause:** security_levels junction table not populated

**Solution:**
```bash
# Check security_levels table
sqlite3 data/ot-security.db "SELECT COUNT(*) FROM security_levels;"

# Re-ingest IEC 62443 data
npm run ingest:iec62443 data/templates/iec62443-3-3-template.json
```

---

## Performance Issues

### Queries Take Too Long

**Symptoms:**
- Queries take >1 second
- Claude times out

**Debugging:**
```bash
# Check database size
ls -lh data/ot-security.db

# Analyze query performance
sqlite3 data/ot-security.db "EXPLAIN QUERY PLAN SELECT * FROM ot_requirements WHERE standard_id = 'nist-800-53';"

# Check for missing indexes
sqlite3 data/ot-security.db ".indexes"
```

**Solution:**
```bash
# Rebuild database from scratch
rm data/ot-security.db
npm run ingest:mitre
npm run ingest:nist-80053
npm run ingest:nist-80082
```

### Database File Too Large

**Symptoms:**
```
ls -lh data/ot-security.db
-rw-r--r--  1 user  staff   500M Jan 29 10:00 data/ot-security.db
```

**Cause:** Duplicate data or inefficient storage

**Solution:**
```bash
# Vacuum database (reclaim space)
sqlite3 data/ot-security.db "VACUUM;"

# Check for duplicates
sqlite3 data/ot-security.db "SELECT requirement_id, COUNT(*) FROM ot_requirements GROUP BY requirement_id HAVING COUNT(*) > 1;"
```

---

## Testing Issues

### Tests Fail After Changes

**Symptoms:**
```
FAIL tests/unit/search.test.ts
Expected: 5, Received: 0
```

**Cause:** Test database not initialized OR schema changed

**Solution:**
```bash
# Clean and rebuild
npm run clean
npm run build

# Run tests with verbose output
npx vitest --reporter=verbose

# Run specific failing test
npx vitest tests/unit/search.test.ts
```

### Integration Tests Fail

**Symptoms:**
```
FAIL tests/integration/e2e-tools.test.ts
Database file not found
```

**Cause:** Integration tests need real database

**Solution:**
```bash
# Ensure test database exists
ls -la tests/data/

# Create test data if needed
# (Integration tests usually handle this in beforeAll)
```

---

## Development Issues

### TypeScript Compilation Errors

**Symptoms:**
```
error TS2322: Type 'string | undefined' is not assignable to type 'string'
```

**Cause:** Strict TypeScript mode enforces null checks

**Solution:**
```typescript
// BAD
const value: string = options.param;  // param might be undefined

// GOOD
const value: string = options.param ?? 'default';

// OR
if (!options.param) {
  throw new Error('param is required');
}
const value: string = options.param;
```

### Import Errors in Node.js

**Symptoms:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'src/database/client'
```

**Cause:** Missing `.js` extension in imports (required for ESM)

**Solution:**
```typescript
// BAD
import { DatabaseClient } from '../database/client';

// GOOD
import { DatabaseClient } from '../database/client.js';
```

---

## Common User Errors

### Wrong Standard ID Format

**Error:**
```
get_ot_requirement({
  requirement_id: "SR 1.1",
  standard: "IEC 62443-3-3"  // ❌ Wrong format
})
```

**Fix:**
```typescript
get_ot_requirement({
  requirement_id: "SR 1.1",
  standard: "iec62443-3-3"  // ✅ Lowercase, hyphens
})
```

### Wrong Requirement ID Format

**Error:**
```
requirement_id: "SR-1.1"  // ❌ Hyphen instead of space
```

**Fix:**
```typescript
requirement_id: "SR 1.1"  // ✅ Space between SR and number
```

### Forgetting to Restart Claude Desktop

After modifying `claude_desktop_config.json`, you **must** restart Claude Desktop for changes to take effect.

---

## Getting Help

### Before Opening an Issue

1. ✅ Run `npm run verify:setup` - Does it pass?
2. ✅ Check this troubleshooting guide
3. ✅ Search [existing issues](https://github.com/Ansvar-Systems/ot-security-mcp/issues)
4. ✅ Try with a fresh database (delete and re-ingest)

### Opening a Good Bug Report

Include:

```markdown
**Environment:**
- OS: macOS 14.2
- Node.js: v20.10.0
- Package version: 0.2.0
- Installation method: npm / source

**Steps to Reproduce:**
1. npm run ingest:mitre
2. Open Claude Desktop
3. Query: "Show MITRE techniques"

**Expected:** List of 83 techniques
**Actual:** Empty array []

**Logs:**
[Paste relevant error messages]

**Database Status:**
```bash
npm run verify:setup
```
[Paste output]
```

### Getting Help

- **Community Support:** [GitHub Discussions](https://github.com/Ansvar-Systems/ot-security-mcp/discussions)
- **Bug Reports:** [GitHub Issues](https://github.com/Ansvar-Systems/ot-security-mcp/issues)
- **Commercial Support:** [info@ansvar.eu](mailto:info@ansvar.eu)

---

## Diagnostic Commands

Quick reference for troubleshooting:

```bash
# Verify setup
npm run verify:setup

# Check data integrity
npm run verify:integrity

# List standards
sqlite3 data/ot-security.db "SELECT id, name FROM ot_standards;"

# Count requirements
sqlite3 data/ot-security.db "SELECT standard_id, COUNT(*) FROM ot_requirements GROUP BY standard_id;"

# Check MITRE data
sqlite3 data/ot-security.db "SELECT COUNT(*) FROM mitre_ics_techniques;"

# Test MCP server manually
node dist/index.js

# Run tests
npm test

# Check Node version
node --version

# Check npm version
npm --version
```

---

**Last Updated:** 2026-01-29 (Stage 2 Release)
