# Contributing to OT Security MCP Server

Thank you for your interest in contributing! This guide will help you get started.

---

## Ways to Contribute

### 1. Report Bugs

Found a bug? [Open an issue](https://github.com/Ansvar-Systems/ot-security-mcp/issues/new) with:

- **Description:** What happened vs. what you expected
- **Steps to reproduce:** Minimal example to trigger the bug
- **Environment:** OS, Node.js version, installation method
- **Logs:** Relevant error messages or stack traces

**Example:**
```markdown
**Bug:** MITRE ingestion fails on macOS

**Steps:**
1. npm run ingest:mitre
2. Error: "Cannot connect to GitHub API"

**Environment:**
- macOS 14.2
- Node.js 20.10.0
- npm install from source

**Logs:**
Error: connect ETIMEDOUT 140.82.112.4:443
    at TCPConnectWrap.afterConnect...
```

### 2. Suggest Features

Have an idea? [Open a discussion](https://github.com/Ansvar-Systems/ot-security-mcp/discussions/new?category=ideas) with:

- **Use case:** What problem does this solve?
- **Proposed solution:** How should it work?
- **Alternatives:** Other approaches you considered
- **Impact:** Who benefits from this feature?

**Example:**
```markdown
**Feature:** ISO/IEC 27019 Energy Sector Security

**Use case:** Energy utilities need ISO 27019 mapped to IEC 62443

**Proposed solution:**
- Add ISO 27019 ingestion script
- Create 150+ control-to-requirement mappings
- New tool: get_iso27019_controls()

**Impact:** 500+ electric utilities worldwide
```

### 3. Improve Documentation

Documentation contributions welcome:

- **Fix typos or unclear explanations**
- **Add industry-specific examples** to use-cases.md
- **Create tutorials** for specific scenarios
- **Improve tool reference** with more examples

**Small fixes:** Direct PR

**Large additions:** Open discussion first

### 4. Add Cross-Standard Mappings

Help expand our mapping database:

**Requirements:**
- Must reference official source documents
- Include confidence score (0.0-1.0) with rationale
- Add test case validating the mapping
- Document in `docs/mappings/`

**Example PR:**
```markdown
**Mapping:** IEC 62443 SR 1.1 → NIST 800-53 IA-2

**Source:**
- IEC 62443-3-3:2013 Section 4.3.3.3.1
- NIST 800-53 Rev 5 IA-2

**Rationale:**
Both require multi-factor authentication for privileged users.
IEC SR 1.1 RE 2 directly aligns with IA-2(1) and IA-2(2).

**Confidence:** 0.95 (strong textual alignment)

**Test:** tests/unit/mappings/iec-to-nist-auth.test.ts
```

### 5. Add New Standards

Contribute ingestion scripts for new standards:

**Process:**
1. Open discussion proposing the standard
2. Create ingestion script in `scripts/ingest-<standard>.ts`
3. Add database schema updates if needed
4. Create tests validating ingestion
5. Document in `docs/ingestion/<standard>-guide.md`

**See:** Stage 3/4 roadmap for priority standards

---

## Development Setup

### Prerequisites

- Node.js 18+
- Git
- SQLite3 (for manual database inspection)

### Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/ot-security-mcp.git
cd ot-security-mcp
npm install
```

### Development Workflow

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Run MCP server in dev mode
npm run dev
```

### Database Setup

```bash
# Ingest data
npm run ingest:mitre
npm run ingest:nist-80053
npm run ingest:nist-80082

# Verify setup
npm run verify:setup

# Check data integrity
npm run verify:integrity
```

---

## Code Guidelines

### TypeScript Style

- **Strict mode:** All code must pass `tsc --noImplicitAny`
- **Naming:**
  - Functions: `camelCase`
  - Classes: `PascalCase`
  - Constants: `SCREAMING_SNAKE_CASE`
  - Interfaces: `PascalCase`
- **Exports:** Named exports preferred over default exports

**Example:**
```typescript
// Good
export interface RequirementDetail {
  requirement_id: string;
  title: string;
}

export async function getRequirement(
  db: DatabaseClient,
  options: GetRequirementOptions
): Promise<RequirementDetail | null> {
  // implementation
}

// Avoid
export default function getRequirement() { ... }
```

### Database Queries

- **Always use parameterized queries** (SQL injection prevention)
- **Use transactions** for multi-statement operations
- **Index frequently queried columns**
- **Document complex queries** with comments

**Example:**
```typescript
// Good
db.query<Requirement>(
  `SELECT * FROM ot_requirements WHERE standard_id = ? AND security_level >= ?`,
  [standardId, minSecurityLevel]
);

// Bad - SQL injection risk
db.query(`SELECT * FROM ot_requirements WHERE standard_id = '${standardId}'`);
```

### Testing

- **Write tests first** (TDD approach)
- **One test file per source file**
- **Test both success and error cases**
- **Use descriptive test names**

**Example:**
```typescript
describe('getRequirement', () => {
  it('should return requirement with security levels', async () => {
    const result = await getRequirement(db, {
      requirement_id: 'SR 1.1',
      standard: 'iec62443-3-3'
    });

    expect(result).toBeDefined();
    expect(result?.security_levels).toHaveLength(4);
  });

  it('should return null for non-existent requirement', async () => {
    const result = await getRequirement(db, {
      requirement_id: 'INVALID',
      standard: 'iec62443-3-3'
    });

    expect(result).toBeNull();
  });
});
```

### Error Handling

- **Use try-catch** for async operations
- **Return null** for "not found" scenarios
- **Throw errors** for actual failures
- **Log errors** with context

**Example:**
```typescript
try {
  const data = await fetchFromAPI(url);
  return parseData(data);
} catch (error) {
  console.error(`Failed to fetch from ${url}:`, error);
  throw new Error(`Data ingestion failed: ${error.message}`);
}
```

---

## Pull Request Process

### Before Submitting

1. ✅ **Tests pass:** `npm test`
2. ✅ **Types valid:** `npm run typecheck`
3. ✅ **Code formatted:** Follow existing style
4. ✅ **Documentation updated:** If adding features
5. ✅ **Commit messages clear:** See format below

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Your Name <your.email@example.com>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding/updating tests
- `refactor`: Code restructuring without behavior change
- `chore`: Build process, dependencies, etc.

**Example:**
```
feat(mappings): add IEC 62443 to NIST 800-53 authentication mappings

- Map SR 1.1 to IA-2 (Identification and Authentication)
- Map SR 1.2 to IA-8 (Identification and Authentication for Non-Org Users)
- Map SR 1.7 to IA-5 (Authenticator Management)
- Add 15 tests validating mappings
- Document in docs/mappings/iec-to-nist-ident-authn.md

Confidence scores: 0.90-0.95 based on textual alignment

Co-Authored-By: Jane Smith <jane@example.com>
```

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented in PR)
- [ ] Commit messages follow format
- [ ] Branch is up to date with main

### Review Process

1. **Automated checks run** (tests, type checking)
2. **Maintainer review** (usually within 3 business days)
3. **Feedback addressed** (iterate as needed)
4. **Approved and merged**

---

## Community Guidelines

### Code of Conduct

- **Be respectful:** Treat everyone with kindness
- **Be constructive:** Critique ideas, not people
- **Be collaborative:** We're building together
- **Be patient:** Maintainers are volunteers

### Communication Channels

- **GitHub Issues:** Bugs and feature requests
- **GitHub Discussions:** Questions, ideas, show-and-tell
- **Email:** [info@ansvar.eu](mailto:info@ansvar.eu) for sensitive topics

### Recognition

All contributors are credited in:
- Git commit co-authorship
- Release notes
- README acknowledgments

---

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

## Questions?

- **Development questions:** [GitHub Discussions](https://github.com/Ansvar-Systems/ot-security-mcp/discussions)
- **Contribution process:** This document or open an issue
- **General questions:** [info@ansvar.eu](mailto:info@ansvar.eu)

---

**Thank you for making OT security standards more accessible!** 🎉
