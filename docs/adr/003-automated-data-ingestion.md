# ADR 003: Automated Data Ingestion Strategy

**Status:** Accepted
**Date:** 2026-01-29

## Context

OT security standards are updated periodically:
- MITRE ATT&CK for ICS: Quarterly updates
- NIST 800-53: Major revisions every 3-5 years
- NIST 800-82: Major revisions every 5-7 years
- IEC 62443: Parts updated independently, 3-5 year cycles

We need a sustainable approach to keeping data current.

## Decision

### Automated Sources (NIST, MITRE)

**NIST 800-53 Rev 5:**
- Source: NIST OSCAL GitHub repository
- Format: JSON (machine-readable)
- URL: `github.com/usnistgov/oscal-content`
- Script: `npm run ingest:nist-80053`

**MITRE ATT&CK for ICS:**
- Source: MITRE STIX repository
- Format: STIX 2.0 JSON bundles
- URL: `github.com/mitre-attack/attack-stix-data`
- Script: `npm run ingest:mitre`

### Semi-Automated Sources (NIST 800-82)

**NIST 800-82 Rev 3:**
- Source: Curated JSON from official PDF
- Rationale: No machine-readable format available
- Updates: Manual curation when new revision published
- Script: `npm run ingest:nist-80082`

### Manual Sources (IEC 62443)

**IEC 62443 (all parts):**
- Source: User-supplied JSON
- Rationale: Copyrighted content
- Updates: User responsibility
- Script: `npm run ingest:iec62443`

### Update Workflow

```
GitHub Actions (daily)
    └── Check NIST/MITRE repos for updates
        └── If changed: Create PR with updated data
            └── CI validates data integrity
                └── Manual review and merge
```

## Consequences

### Positive

- **Minimal maintenance**: NIST/MITRE updates largely automated
- **Traceable**: Git history shows all data changes
- **Verifiable**: CI validates data integrity on every change

### Negative

- **Lag time**: Updates require PR review (intentional safety measure)
- **NIST 800-82**: Manual curation needed for major revisions
- **Schema changes**: May require migration scripts

### Data Integrity

All ingestion scripts:
- Validate input against JSON schemas
- Run in transactions (rollback on error)
- Log detailed progress for debugging
- Can be run idempotently (safe to re-run)
