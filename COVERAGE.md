# OT Security MCP -- Coverage

**Last verified:** 2026-04-01

This document declares what data this MCP includes, what it does NOT include, and known limitations.

## What is Included

| Source | Format | Update Frequency | Last Verified | Notes |
|--------|--------|-----------------|---------------|-------|
| NIST SP 800-53 Rev 5 | OSCAL JSON | Daily check via GitHub Actions | 2026-02-17 | 260 OT-relevant controls from 15 families |
| NIST SP 800-82 Rev 3 | Curated JSON from official PDF | On new NIST revision | 2026-02-17 | 16 curated guidance sections |
| MITRE ATT&CK for ICS | STIX 2.0 JSON | Daily check via GitHub Actions | 2026-02-17 | 83 techniques, 52 mitigations, 331 relationships |
| IEC 62443 Series (3-3, 4-2, 3-2) | User-created JSON from licensed PDFs | On user license renewal or new standard revision | N/A - user-supplied | NOT included in distribution. Users must supply their own licensed data. |
| Cross-Standard Mappings (IEC<>NIST, MITRE<>NIST) | JSON | On new standard revisions | 2026-02-17 | 243 validated mappings |
| Purdue Enterprise Reference Architecture | Curated JSON | Stable reference architecture | 2026-02-17 | 6 Purdue levels, 7 conduit types, 8 zone-to-zone flows |

## What is NOT Included

| Gap | Reason | Planned? |
|-----|--------|----------|
| Full IEC 62443 standard text | Copyrighted by IEC -- users must supply their own licensed copies | No |
| Dragos/Claroty threat reports | Commercial threat intel -- not redistributable | No |
| Full NERC CIP standard text | Copyrighted by NERC | Summaries only |

## Known Limitations

- IEC 62443 content is NOT included due to copyright. The MCP provides mappings and references only.
- NIST 800-82 content is curated from the official PDF, not machine-ingested.
- MITRE ATT&CK for ICS data is a point-in-time snapshot. Use check_data_freshness for currency.
- This MCP provides reference data, not professional advice. See DISCLAIMER.md.
