# Development Guide

Complete guide for developing and extending the OT Security MCP Server.

---

## Development Environment

### Prerequisites

- **Node.js 18+** - Required for ES modules and modern features
- **TypeScript 5.9+** - Strict mode enabled
- **SQLite3** - For database inspection (optional but helpful)
- **Git** - Version control

### Initial Setup

```bash
# Clone repository
git clone https://github.com/Ansvar-Systems/ot-security-mcp.git
cd ot-security-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build

# Ingest data
npm run ingest:mitre
npm run ingest:nist-80053
npm run ingest:nist-80082

# Verify setup
npm run verify:setup

# Run tests
npm test
```

---

## Project Structure

```
ot-security-mcp/
├── src/                          # Source code
│   ├── index.ts                  # MCP server entry point
│   ├── database/
│   │   ├── client.ts             # SQLite wrapper
│   │   └── schema.sql            # Database DDL
│   ├── tools/                    # MCP tool implementations
│   │   ├── search.ts             # Full-text search
│   │   ├── get-requirement.ts    # Requirement details
│   │   ├── list-standards.ts     # Standards catalog
│   │   ├── get-mitre-technique.ts # MITRE ATT&CK
│   │   ├── map-security-level-requirements.ts # IEC SL mapping
│   │   ├── get-zone-conduit-guidance.ts # Network segmentation
│   │   ├── get-requirement-rationale.ts # Requirement context
│   │   └── index.ts              # Tool registry
│   └── types/
│       └── index.ts              # TypeScript definitions
├── scripts/                      # Ingestion and utilities
│   ├── ingest-mitre-ics.ts       # MITRE ATT&CK ingestion
│   ├── ingest-iec62443.ts        # IEC 62443 ingestion
│   ├── ingest-nist-80053.ts      # NIST 800-53 OSCAL ingestion
│   ├── ingest-nist-80082.ts      # NIST 800-82 ingestion
│   ├── validate-iec62443.ts      # JSON schema validation
│   ├── verify-data-integrity.ts  # Data consistency checker
│   └── verify-setup.ts           # Setup verification
├── tests/                        # Test suite
│   ├── unit/                     # Unit tests (208 tests)
│   ├── integration/              # Integration tests (25 tests)
│   └── e2e/                      # E2E workflow tests (30 tests)
├── data/
│   ├── ot-security.db            # SQLite database (gitignored)
│   ├── templates/                # IEC 62443 JSON templates
│   └── nist-80082-guidance.json  # NIST 800-82 sample data
├── schemas/
│   └── iec62443-schema.json      # Ajv JSON schema for IEC
└── docs/                         # Documentation
```

---

## Development Workflow

### Adding a New Tool

**1. Define Types**

Add interfaces to `src/types/index.ts`:

```typescript
export interface MyToolOptions {
  param1: string;
  param2?: number;
}

export interface MyToolResult {
  data: string[];
  metadata: Record<string, unknown>;
}
```

**2. Implement Tool**

Create `src/tools/my-tool.ts`:

```typescript
import { DatabaseClient } from '../database/client.js';
import { MyToolOptions, MyToolResult } from '../types/index.js';

export async function myTool(
  db: DatabaseClient,
  options: MyToolOptions
): Promise<MyToolResult> {
  const { param1, param2 = 10 } = options;

  // Query database
  const rows = db.query<{ value: string }>(
    'SELECT value FROM my_table WHERE key = ? LIMIT ?',
    [param1, param2]
  );

  return {
    data: rows.map(r => r.value),
    metadata: { count: rows.length }
  };
}
```

**3. Register in MCP Server**

Update `src/index.ts`:

```typescript
import { myTool } from './tools/my-tool.js';

// In registerHandlers()
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // ... existing cases ...

    case 'my_tool': {
      const result = await myTool(this.db, args as MyToolOptions);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  }
});

// In ListToolsRequestSchema handler
{
  name: 'my_tool',
  description: 'Brief description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Description' },
      param2: { type: 'number', description: 'Optional parameter' }
    },
    required: ['param1']
  }
}
```

**4. Write Tests**

Create `tests/unit/my-tool.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { myTool } from '../../src/tools/my-tool.js';

describe('myTool', () => {
  let db: DatabaseClient;

  beforeAll(() => {
    db = new DatabaseClient(':memory:');
    // Setup test data
  });

  afterAll(() => {
    db.close();
  });

  it('should return results for valid input', async () => {
    const result = await myTool(db, { param1: 'test' });
    expect(result.data).toHaveLength(5);
  });

  it('should handle missing data gracefully', async () => {
    const result = await myTool(db, { param1: 'nonexistent' });
    expect(result.data).toHaveLength(0);
  });
});
```

**5. Document Tool**

Create `docs/tools/my-tool.md` following existing tool documentation patterns.

---

## Adding a New Standard

### Process Overview

1. **Proposal** - Open GitHub discussion
2. **Schema Design** - Define database tables
3. **Ingestion Script** - Create parser and loader
4. **Testing** - Validate data quality
5. **Documentation** - Ingestion guide + coverage docs

### Example: Adding ISO 27019

**1. Schema Updates**

Add to `src/database/schema.sql`:

```sql
-- ISO 27019 controls
CREATE TABLE IF NOT EXISTS iso27019_controls (
  control_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  control_type TEXT,
  sector_applicability TEXT
);

-- Update ot_standards
INSERT INTO ot_standards (id, name, version, status, published_date, url)
VALUES (
  'iso-27019',
  'ISO/IEC 27019:2017',
  '2017',
  'current',
  '2017-10-01',
  'https://www.iso.org/standard/68091.html'
);
```

**2. Ingestion Script**

Create `scripts/ingest-iso27019.ts`:

```typescript
import { DatabaseClient } from '../src/database/client.js';

export class Iso27019Ingester {
  constructor(private db: DatabaseClient) {}

  async ingestAll(jsonPath: string): Promise<void> {
    // Parse JSON
    const data = await readFile(jsonPath, 'utf-8');
    const controls = JSON.parse(data);

    // Transaction for atomicity
    this.db.transaction(() => {
      for (const control of controls) {
        this.db.run(
          `INSERT OR REPLACE INTO iso27019_controls
           (control_id, title, description, control_type, sector_applicability)
           VALUES (?, ?, ?, ?, ?)`,
          [
            control.id,
            control.title,
            control.description,
            control.type,
            JSON.stringify(control.sectors)
          ]
        );
      }
    });

    console.log(`Ingested ${controls.length} ISO 27019 controls`);
  }
}
```

**3. Tests**

Create `tests/unit/ingest-iso27019.test.ts` validating:
- Parsing from JSON
- Database insertion
- Idempotency (re-run safety)
- Foreign key relationships

**4. Documentation**

Create `docs/ingestion/iso27019-guide.md` explaining:
- Where to obtain ISO 27019
- JSON format expected
- Ingestion command
- Verification steps

---

## Database Development

### Inspecting the Database

```bash
# Open SQLite CLI
sqlite3 data/ot-security.db

# Useful queries
.tables                          # List tables
.schema ot_requirements          # Show table schema
SELECT COUNT(*) FROM ot_standards;
SELECT * FROM ot_standards;
```

### Schema Migrations

When modifying schema:

1. **Test migration** on a copy first
2. **Document changes** in schema.sql comments
3. **Update tests** expecting old schema
4. **Version the schema** (consider adding schema_version table)

Example migration:

```sql
-- Add new column
ALTER TABLE ot_requirements ADD COLUMN priority INTEGER DEFAULT 2;

-- Create index
CREATE INDEX IF NOT EXISTS idx_requirements_priority
  ON ot_requirements(priority);

-- Update existing data
UPDATE ot_requirements SET priority = 3 WHERE security_level >= 3;
```

### Transaction Best Practices

```typescript
// Always use transactions for multi-statement operations
db.transaction(() => {
  db.run('DELETE FROM old_data');
  db.run('INSERT INTO new_data SELECT * FROM temp');
  db.run('UPDATE metadata SET version = ?', [newVersion]);
});

// Automatic rollback on error
try {
  db.transaction(() => {
    // operations
    throw new Error('Oops');  // Rollback triggered
  });
} catch (error) {
  console.error('Transaction rolled back:', error);
}
```

---

## Testing Strategy

### Test Pyramid

```
       /\
      /  \     30 E2E Tests (Complex workflows)
     /____\
    /      \   25 Integration Tests (Multi-component)
   /________\
  /          \ 208 Unit Tests (Individual functions)
 /____________\
```

### Writing Effective Tests

**Unit Test Pattern:**

```typescript
describe('ComponentName', () => {
  describe('functionName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => { ... });
    it('should handle error case', () => { ... });
  });
});
```

**Integration Test Pattern:**

```typescript
describe('MCP Tool Integration', () => {
  let db: DatabaseClient;

  beforeAll(() => {
    db = new DatabaseClient('tests/data/test.sqlite');
    // Populate with test data
  });

  afterAll(() => {
    db.close();
  });

  it('should work end-to-end', async () => {
    const result = await tool(db, options);
    expect(result).toMatchSnapshot();
  });
});
```

**E2E Workflow Test Pattern:**

```typescript
describe('User Workflow: Security Assessment', () => {
  it('should complete full assessment workflow', async () => {
    // Step 1: Search for requirements
    const searchResults = await searchOtRequirements(db, {
      query: 'authentication',
      standards: ['iec62443-3-3']
    });
    expect(searchResults.length).toBeGreaterThan(0);

    // Step 2: Get requirement details
    const req = await getRequirement(db, {
      requirement_id: searchResults[0].requirement_id,
      standard: 'iec62443-3-3'
    });
    expect(req).toBeDefined();

    // Step 3: Get rationale
    const rationale = await getRequirementRationale(db, {
      requirement_id: req!.requirement_id,
      standard: 'iec62443-3-3'
    });
    expect(rationale.rationale).toBeTruthy();
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npx vitest tests/unit/search.test.ts

# Specific test case
npx vitest -t "should return requirements"
```

---

## Code Quality

### TypeScript Configuration

`tsconfig.json` is configured for strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Benefits:**
- Catches null/undefined bugs at compile time
- Prevents implicit any types
- Enforces proper error handling

### Linting Standards

Follow existing code style:

- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Trailing commas:** Multiline objects/arrays
- **Line length:** 100 characters (soft limit)

### Error Handling Patterns

```typescript
// For "not found" scenarios - return null
export async function getRequirement(
  db: DatabaseClient,
  options: GetRequirementOptions
): Promise<Requirement | null> {
  const row = db.queryOne(...);
  return row || null;
}

// For actual errors - throw
export async function ingestData(path: string): Promise<void> {
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  // ... process file
}

// For validation errors - throw with details
if (securityLevel < 1 || securityLevel > 4) {
  throw new Error(
    `Invalid security level ${securityLevel}. Must be 1-4.`
  );
}
```

---

## Debugging

### Debug MCP Server

```bash
# Run with console logging
NODE_ENV=development npm run dev

# Inspect database during runtime
sqlite3 data/ot-security.db "SELECT * FROM ot_standards;"
```

### Debug Claude Desktop Integration

1. **Open Developer Tools**
   - Claude Desktop → View → Developer → Developer Tools

2. **Check Console for Errors**
   - Look for MCP connection errors
   - Check tool invocation logs

3. **Verify MCP Server is Running**
```bash
# Check if server process exists
ps aux | grep "ot-security-mcp"
```

### Common Issues

**Issue:** Tests fail with "database locked"
**Fix:** Ensure no other process has database open

**Issue:** TypeScript compilation errors
**Fix:** `npm run clean && npm run build`

**Issue:** MCP server not responding
**Fix:** Check Claude Desktop config syntax, restart Claude

---

## Release Process

### Versioning

Follow semantic versioning:

- **Major (1.0.0):** Breaking changes
- **Minor (0.2.0):** New features, backward compatible
- **Patch (0.2.1):** Bug fixes

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] RELEASE_NOTES written
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] npm publish (if public)

```bash
# Bump version
npm version minor  # or major, patch

# Tag release
git tag -a v0.3.0 -m "Stage 3: Enhanced Mappings"

# Push with tags
git push origin main --tags

# Publish to npm (when ready)
npm publish --access public
```

---

## Resources

- **MCP SDK Docs:** https://github.com/modelcontextprotocol/sdk
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Vitest Docs:** https://vitest.dev/
- **SQLite Docs:** https://www.sqlite.org/docs.html

---

## Getting Help

- **Questions:** [GitHub Discussions](https://github.com/Ansvar-Systems/ot-security-mcp/discussions)
- **Bugs:** [GitHub Issues](https://github.com/Ansvar-Systems/ot-security-mcp/issues)
- **Contributing:** See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Last Updated:** 2026-01-29 (Stage 2 Release)
