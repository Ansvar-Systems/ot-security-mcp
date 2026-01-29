# Architecture

Technical architecture of the OT Security MCP Server.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Desktop                          │
│                  (or other MCP client)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol (JSON-RPC)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  OT Security MCP Server                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Tool Registry (7 tools)                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  search_ot_requirements                              │  │
│  │  get_ot_requirement                                  │  │
│  │  list_ot_standards                                   │  │
│  │  get_mitre_ics_technique                            │  │
│  │  map_security_level_requirements                    │  │
│  │  get_zone_conduit_guidance                          │  │
│  │  get_requirement_rationale                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │            Database Client Wrapper                   │  │
│  │  - Query execution with parameterization            │  │
│  │  - Transaction management                           │  │
│  │  - Connection pooling                               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              SQLite Database (ot-security.db)                │
│  - 14 tables (standards, requirements, mappings)            │
│  - FTS5 full-text search indexes                            │
│  - Foreign key constraints                                   │
│  - 435+ requirements, 6 standards                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. MCP Server Layer (`src/index.ts`)

**Responsibilities:**
- Implement Model Context Protocol
- Handle tool registration and invocation
- Manage database connection lifecycle
- Format responses for Claude

**Key Classes:**

```typescript
class McpServer {
  private server: Server;           // MCP SDK server
  private db: DatabaseClient;       // Database connection

  constructor(dbPath?: string);     // Initialize with optional DB path
  registerHandlers(): void;         // Register MCP handlers
  async run(): Promise<void>;       // Start server on stdio
}
```

**Protocol Flow:**

1. Claude sends `tools/list` request
2. Server responds with tool definitions
3. Claude sends `tools/call` with tool name + arguments
4. Server validates arguments, executes tool
5. Server returns JSON-formatted result

---

### 2. Tool Layer (`src/tools/`)

**Design Pattern:** Functional, stateless

Each tool is a pure function:

```typescript
export async function toolName(
  db: DatabaseClient,
  options: ToolOptions
): Promise<ToolResult> {
  // 1. Validate inputs
  // 2. Query database
  // 3. Transform results
  // 4. Return structured data
}
```

**Tool Categories:**

**Core Query Tools:**
- `search.ts` - Full-text search across all standards
- `get-requirement.ts` - Detailed requirement lookup
- `list-standards.ts` - Standards catalog with counts

**Threat Intelligence:**
- `get-mitre-technique.ts` - MITRE ATT&CK for ICS lookup

**IEC 62443-Specific:**
- `map-security-level-requirements.ts` - Security level filtering
- `get-zone-conduit-guidance.ts` - Network segmentation
- `get-requirement-rationale.ts` - Requirement context

**Design Decisions:**

- **No caching** - Database is fast enough, simplicity > performance
- **No state** - Tools don't maintain state between calls
- **Fail gracefully** - Return null/empty arrays, not errors
- **Parameterized queries** - SQL injection prevention

---

### 3. Database Layer (`src/database/`)

#### Database Client (`client.ts`)

**Wrapper around better-sqlite3:**

```typescript
class DatabaseClient {
  private db: Database;

  // Execute query, return multiple rows
  query<T>(sql: string, params?: any[]): T[];

  // Execute query, return single row or undefined
  queryOne<T>(sql: string, params?: any[]): T | undefined;

  // Execute write operation (INSERT, UPDATE, DELETE)
  run(sql: string, params?: any[]): RunResult;

  // Execute transaction (automatic rollback on error)
  transaction<T>(fn: () => T): T;

  close(): void;
}
```

**Features:**
- Automatic parameterization
- Type-safe generics
- Transaction support with auto-rollback
- Connection management

#### Database Schema (`schema.sql`)

**14 Tables Organized by Function:**

**Core OT Standards:**
```sql
ot_standards           -- Standard metadata (6 standards)
ot_requirements        -- Requirements/controls (435+ items)
ot_mappings           -- Cross-standard relationships (16 mappings)
sector_applicability  -- Industry/jurisdiction rules
```

**IEC 62443 Specific:**
```sql
security_levels       -- SL-1 through SL-4 mappings (junction table)
zones                 -- Network zones (Purdue Model)
conduits             -- Communication pathways
zone_conduit_flows   -- Zone-to-zone data flows
reference_architectures -- Standard architectures
```

**MITRE ATT&CK for ICS:**
```sql
mitre_ics_techniques        -- 83 attack techniques
mitre_ics_mitigations       -- 52 defensive mitigations
mitre_technique_mitigations -- Technique-mitigation relationships (331)
```

**System:**
```sql
metadata         -- Schema version, timestamps
ingestion_log    -- Audit trail
```

**Indexes (24 total):**
- FTS5 full-text search on requirement descriptions
- Foreign key indexes for JOIN performance
- Composite indexes for common queries

---

## Data Model

### Entity Relationships

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│ ot_standards │──1:N──│ ot_requirements │──N:M──│security_levels│
└──────────────┘       └─────────────────┘       └──────────────┘
                               │
                               │ 1:N
                               │
                       ┌───────▼────────┐
                       │  ot_mappings   │ (cross-standard links)
                       └────────────────┘

┌────────┐   ┌──────────┐   ┌────────────────────┐
│ zones  │──1│ conduits │──N│zone_conduit_flows │
└────────┘   └──────────┘   └────────────────────┘

┌────────────────────┐   ┌──────────────────────┐
│mitre_ics_techniques│──N│mitre_technique_      │
└────────────────────┘   │  mitigations         │
                         └──────────────────────┘
                                   N──│
                         ┌──────────────────────┐
                         │mitre_ics_mitigations │
                         └──────────────────────┘
```

### Key Design Patterns

**1. Junction Tables (Many-to-Many)**

`security_levels` links requirements to multiple security levels:

```sql
CREATE TABLE security_levels (
  id INTEGER PRIMARY KEY,
  requirement_db_id INTEGER,  -- FK to ot_requirements.id
  security_level INTEGER,     -- 1, 2, 3, or 4
  sl_type TEXT,              -- SL-T, SL-C, SL-A
  capability_level INTEGER,
  FOREIGN KEY (requirement_db_id) REFERENCES ot_requirements(id)
);
```

A single requirement (e.g., SR 1.1) can have:
- SL-1 with capability level 1
- SL-2 with capability level 2
- SL-3 with capability level 3
- SL-4 with capability level 4

**2. Hierarchical Requirements**

`parent_requirement_id` creates tree structure:

```
SR 1.1 (Identification and Authentication)
├── SR 1.1 RE 1 (Unique identification)
└── SR 1.1 RE 2 (Multi-factor authentication)
```

Stored as:
```sql
-- Base requirement
INSERT INTO ot_requirements (requirement_id, parent_requirement_id, ...)
VALUES ('SR 1.1', NULL, ...);

-- Enhancements
INSERT INTO ot_requirements (requirement_id, parent_requirement_id, ...)
VALUES ('SR 1.1 RE 1', 'SR 1.1', ...);
```

**3. Cross-Standard Mappings**

`ot_mappings` with confidence scores:

```sql
CREATE TABLE ot_mappings (
  source_standard TEXT,        -- 'nist-800-82'
  source_requirement TEXT,     -- 'Network Segmentation'
  target_standard TEXT,        -- 'nist-800-53'
  target_requirement TEXT,     -- 'AC-4'
  mapping_type TEXT,          -- 'exact_match', 'partial', 'related'
  confidence REAL,            -- 0.0 - 1.0
  notes TEXT
);
```

**4. JSON Storage**

Some fields store JSON for flexibility:

```sql
-- MITRE platforms array
platforms TEXT  -- '["Windows","Linux","Field Controller/RTU/PLC/IED"]'

-- Parsed in application:
const platforms = JSON.parse(row.platforms) as string[];
```

---

## Data Flow

### Ingestion Flow

```
Official Source → Fetch → Parse → Validate → Transform → Load → Verify
                    ↓
              [MITRE STIX]  [NIST OSCAL]  [User JSON]
                    ↓           ↓              ↓
              Parse STIX    Parse OSCAL   Validate with Ajv
                    ↓           ↓              ↓
              Map to Schema  Map to Schema  Map to Schema
                    ↓           ↓              ↓
              ─────────── SQLite Transaction ───────────
                               ↓
                    INSERT OR REPLACE (idempotent)
                               ↓
                    Foreign Key Validation
                               ↓
                    Commit or Rollback
                               ↓
                    Verification Queries
```

**Ingestion Principles:**
- **Idempotent** - Re-running scripts is safe (INSERT OR REPLACE)
- **Atomic** - Transactions ensure all-or-nothing
- **Validated** - Schema checks before database insertion
- **Audited** - Ingestion logged to ingestion_log table

### Query Flow

```
Claude Query → MCP Server → Tool Function → Database Query → Transform → JSON Response

Example: "What IEC 62443 requirements apply to SL-2?"

1. Claude: tools/call with name="map_security_level_requirements"
2. Server: Validates arguments, calls mapSecurityLevelRequirements()
3. Tool: Builds SQL query with parameterized security_level = 2
4. Database: FTS5 search + JOIN on security_levels table
5. Tool: Transforms rows to Requirement[] objects
6. Server: JSON.stringify(requirements)
7. Claude: Receives formatted response, presents to user
```

---

## Performance Characteristics

### Benchmarks (Stage 2, 435 requirements)

| Operation | Average Time | Notes |
|-----------|-------------|-------|
| `list_ot_standards` | <10ms | Simple SELECT with COUNT |
| `search_ot_requirements` | <50ms | FTS5 search, 50 results |
| `get_ot_requirement` | <20ms | Single row + JOINs |
| `get_mitre_ics_technique` | <30ms | Single row + relationship JOINs |
| `map_security_level_requirements` | <100ms | JOIN with security_levels |
| `get_zone_conduit_guidance` | <150ms | Complex JOINs with markdown generation |

**Optimization Strategies:**
1. **Indexes** - 24 indexes cover all common queries
2. **FTS5** - Virtual table for full-text search
3. **Parameterized queries** - Prepared statement caching
4. **Selective columns** - Only fetch needed fields

**Scalability:**
- **Current:** 435 requirements - all queries <200ms
- **Stage 3:** 1,000+ requirements - expect <500ms (still acceptable)
- **Stage 4:** 3,000+ requirements - may need query optimization

No caching needed at current scale.

---

## Security Considerations

### SQL Injection Prevention

✅ **All queries use parameterization:**

```typescript
// GOOD - Parameterized
db.query('SELECT * FROM ot_requirements WHERE id = ?', [userInput]);

// BAD - String concatenation (NEVER DO THIS)
db.query(`SELECT * FROM ot_requirements WHERE id = '${userInput}'`);
```

### Input Validation

✅ **Validate before database access:**

```typescript
if (security_level < 1 || security_level > 4) {
  throw new Error('Invalid security level');
}
```

### Database Permissions

- **Read-only access** for tool queries
- **Write access** only for ingestion scripts
- **No remote access** - SQLite is local file

### Sensitive Data

- **No secrets stored** - Database contains public standards
- **No PII** - Standards are technical documents
- **User data** - IEC 62443 user-supplied data is user's responsibility

---

## Extensibility

### Adding New Tools

1. Create tool function in `src/tools/`
2. Register in `src/index.ts` MCP handlers
3. Add tests in `tests/unit/`
4. Document in `docs/tools/`

### Adding New Standards

1. Extend schema in `src/database/schema.sql`
2. Create ingestion script in `scripts/`
3. Add validation logic
4. Update tests
5. Document ingestion process

### Adding New Mappings

1. Extend `ot_mappings` table (already flexible)
2. Create mapping curation workflow
3. Add validation tests
4. Document mapping methodology

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ | JavaScript execution |
| **Language** | TypeScript | 5.9+ | Type safety |
| **Database** | SQLite | 3.x | Local data storage |
| **DB Driver** | better-sqlite3 | 12.6+ | Synchronous SQLite bindings |
| **MCP** | @modelcontextprotocol/sdk | 1.25+ | MCP protocol implementation |
| **Validation** | Ajv | 8.17+ | JSON schema validation |
| **Testing** | Vitest | 4.0+ | Unit/integration tests |

**Why these choices:**

- **SQLite** - No server setup, portable, fast for read-heavy workloads
- **better-sqlite3** - Synchronous API (simpler), better performance than async
- **TypeScript** - Compile-time safety prevents entire classes of bugs
- **Vitest** - Fast, ESM-native, better developer experience than Jest

---

## Deployment Architecture

### Local Development

```
Developer Machine
├── Source code (TypeScript)
├── SQLite database (local file)
├── Ingestion scripts (Node.js)
└── Test suite (Vitest)
```

### Claude Desktop Integration

```
User Machine
├── Claude Desktop (MCP client)
├── npm package: @ansvar/ot-security-mcp
│   ├── dist/ (compiled JavaScript)
│   └── data/ (user ingests standards)
└── Configuration: claude_desktop_config.json
```

### NPM Distribution

```
NPM Registry
└── @ansvar/ot-security-mcp
    ├── dist/ (compiled code)
    ├── README.md
    └── LICENSE

User runs: npm install -g @ansvar/ot-security-mcp
Then: npm run ingest:mitre, ingest:nist-80053, ingest:nist-80082
```

---

## Future Architecture Considerations

### Stage 3: Caching Layer

If queries exceed 500ms:

```
Tool Layer
    ↓
[Query Cache] ← LRU cache, 100 entries
    ↓
Database Layer
```

### Stage 4: Remote Database Option

Support cloud deployments:

```typescript
interface DatabaseProvider {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
}

class SqliteProvider implements DatabaseProvider { ... }
class PostgresProvider implements DatabaseProvider { ... }
```

### Stage 5: Distributed Architecture

For enterprise deployments:

```
[Load Balancer]
    ├── MCP Server Instance 1 → [Shared SQLite]
    ├── MCP Server Instance 2 → [Shared SQLite]
    └── MCP Server Instance 3 → [Shared SQLite]
```

---

## Resources

- **MCP Protocol Spec:** https://spec.modelcontextprotocol.io/
- **SQLite Architecture:** https://www.sqlite.org/arch.html
- **better-sqlite3 Docs:** https://github.com/WiseLibs/better-sqlite3
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/

---

**Last Updated:** 2026-01-29 (Stage 2 Release)
