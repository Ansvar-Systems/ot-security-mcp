# ADR 002: IEC 62443 Licensing Strategy

**Status:** Accepted
**Date:** 2026-01-29

## Context

IEC 62443 is the primary international standard for industrial automation and control system (IACS) security. It's copyrighted by ISA/IEC and sold commercially ($200-400 per part).

We need to support IEC 62443 queries without distributing copyrighted content.

## Decision

### User-Supplied Content Model

1. **We provide:**
   - Database schema for IEC 62443 data
   - JSON templates with field definitions
   - Validation scripts
   - Ingestion scripts
   - Sample data (2 demo requirements only)

2. **Users provide:**
   - Licensed IEC 62443 PDFs (purchased from ISA/IEC)
   - JSON files created from their licensed standards
   - Responsibility for compliance with their license terms

### Template Structure

```json
{
  "standard": "iec62443-3-3",
  "version": "v2.0",
  "requirements": [
    {
      "requirement_id": "SR 1.1",
      "title": "Human user identification and authentication",
      "description": "...",
      "security_levels": [
        { "security_level": 1, "capability_level": 1 },
        { "security_level": 2, "capability_level": 2 }
      ]
    }
  ]
}
```

### Graceful Degradation

The MCP server functions fully without IEC 62443 data:
- NIST 800-53/800-82 queries work
- MITRE ATT&CK queries work
- IEC 62443-specific tools return empty results with helpful messages

## Consequences

### Positive

- **Legal compliance**: No copyright infringement risk
- **User flexibility**: Works with any IEC 62443 version they own
- **Clear boundaries**: Distinction between our code (Apache 2.0) and their data

### Negative

- **User friction**: Manual PDF-to-JSON extraction required
- **No out-of-box IEC support**: Users must do work to enable IEC queries
- **Support burden**: Users may need help with extraction

### Mitigations

- Comprehensive ingestion guide with examples
- JSON schema validation catches errors early
- Sample templates show expected structure
