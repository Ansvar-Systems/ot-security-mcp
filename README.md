# OT Security MCP Server

**IEC 62443 for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fot-security-mcp.svg)](https://www.npmjs.com/package/@ansvar/ot-security-mcp)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/ot-security-mcp?style=social)](https://github.com/Ansvar-Systems/ot-security-mcp)
[![Database](https://img.shields.io/badge/database-pre--built-green)](docs/coverage.md)
[![Tests](https://img.shields.io/badge/tests-263%20passing-brightgreen)](docs/tools.md)

Query **IEC 62443, NIST 800-82, NIST 800-53, and MITRE ATT&CK for ICS** — the complete OT security framework stack — directly from Claude, Cursor, or any MCP-compatible client.

If you're securing industrial control systems, manufacturing plants, energy infrastructure, or critical OT environments, this is your security standards reference.

Built by [Ansvar Systems](https://ansvar.eu) — Stockholm, Sweden

---

## Why This Exists

OT security standards are scattered across ISA PDFs, NIST publications, and MITRE matrices. Whether you're:
- A **control systems engineer** implementing IEC 62443 security levels
- A **security architect** designing network segmentation with the Purdue Model
- A **compliance officer** mapping NIS2 requirements to IEC controls
- A **threat hunter** investigating MITRE ATT&CK for ICS techniques
- A **product team** building secure PLCs, SCADA systems, or industrial IoT devices

...you shouldn't need to juggle 6 different documentation sites and 200 pages of standards. Ask Claude. Get the exact requirement. With context.

This MCP server makes **OT security standards searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Installation

```bash
npm install @ansvar/ot-security-mcp
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. Done.

### Cursor / VS Code

```json
{
  "mcp.servers": {
    "ot-security": {
      "command": "npx",
      "args": ["-y", "@ansvar/ot-security-mcp"]
    }
  }
}
```

---

## Example Queries

Once connected, just ask naturally:

### IEC 62443 Security Levels
- *"What are the IEC 62443 requirements for Security Level 2?"*
- *"Which security level should I target for a water treatment plant?"*
- *"Compare requirements between SL-2 and SL-3"*
- *"What is SR 1.1 (identification and authentication) in IEC 62443?"*

### Network Segmentation & Zones
- *"How should I segment my OT network using the Purdue Model?"*
- *"What security controls belong at Level 3 of the Purdue Model?"*
- *"Design a zone and conduit architecture for a manufacturing facility"*
- *"What's the difference between a zone and a conduit in IEC 62443-3-2?"*

### Threat Intelligence
- *"What MITRE ATT&CK techniques target PLCs?"*
- *"How do attackers perform lateral movement in ICS environments?"*
- *"Show me MITRE ICS techniques for T0800 (Modify Control Logic)"*
- *"Which mitigations prevent Man-in-the-Middle attacks on Modbus?"*

### NIST Guidance
- *"What are NIST's recommendations for OT asset management?"*
- *"How does NIST 800-82 address incident response in control systems?"*
- *"Map NIST 800-82 guidance to NIST 800-53 controls"*

### Cross-Standard Mapping
- *"Map IEC 62443 SR 1.1 to equivalent NIST controls"*
- *"Which NIST 800-53 controls support IEC 62443 Security Level 3?"*
- *"Compare identification and authentication across IEC and NIST"*

### Industry-Specific
- *"What security requirements apply to a power generation facility?"*
- *"IEC 62443 requirements for pharmaceutical manufacturing"*
- *"Security controls for a water/wastewater utility"*

**More examples:** See [docs/use-cases.md](./docs/use-cases.md) for industry-specific scenarios

---

## What's Included

### Standards Coverage
- **IEC 62443-3-3** — 67 System Security Requirements (SRs) across 7 foundational requirements
- **IEC 62443-4-2** — 51 Component Requirements (CRs) for embedded devices, host devices, network devices, and applications
- **IEC 62443-3-2** — Security risk assessment, zones & conduits, Purdue Model
- **NIST SP 800-53 Rev 5** — 228 OT-relevant controls from 12 control families
- **NIST SP 800-82 Rev 3** — Guide to Operational Technology Security
- **MITRE ATT&CK for ICS** — 83 techniques, 52 mitigations, 331 relationships

### Features
- **Full-Text Search** — Find relevant requirements across all standards instantly
- **Security Level Mapping** — Query IEC 62443 requirements by SL-1 through SL-4
- **Zone/Conduit Guidance** — Network segmentation design with Purdue Model
- **Requirement Rationale** — Understand WHY requirements exist, not just what they say
- **Threat Intelligence** — MITRE ATT&CK techniques mapped to defensive controls
- **Cross-Standard Mappings** — IEC ↔ NIST control relationships
- **Component Type Filtering** — Requirements for embedded devices, hosts, networks, or applications

### Data Quality
- **238 Requirements** — IEC 62443 foundation + NIST 800-82 guidance
- **228 NIST 800-53 Controls** — Automated OSCAL ingestion from official source
- **83 MITRE ICS Techniques** — Complete ATT&CK for ICS matrix
- **16 Cross-Standard Mappings** — NIST 800-82 ↔ 800-53 validated mappings
- **Daily Updates** — Automatic freshness checks for NIST and MITRE sources

**Detailed coverage:** [docs/coverage.md](docs/coverage.md)
**Use cases by industry:** [docs/use-cases.md](docs/use-cases.md)
**Available tools:** [docs/tools.md](docs/tools.md)

---

## 🎬 See It In Action

### Why This Works

**Authoritative Source Data:**
- **IEC 62443**: User-supplied (licensed standards) — you provide your own licensed data
- **NIST 800-53**: Automated OSCAL ingestion from official NIST GitHub
- **NIST 800-82**: Curated guidance from official PDF publication
- **MITRE ATT&CK**: Automated STIX 2.0 ingestion from official MITRE repository
- All data stored in SQLite with full-text search (FTS5)

**Smart Architecture:**
- Security level filtering uses junction tables (many-to-many relationships)
- Zone/conduit guidance generates markdown with Purdue Model context
- Requirement rationale includes regulatory drivers and related standards
- Cross-standard mappings use confidence scores for quality assessment

**Technical Stack:**
```
Official Source → Parse → Validate → SQLite → MCP Tools → AI Response
     ↑                        ↑            ↑
  OSCAL/STIX          JSON Schema    FTS5 Search
```

### Example: Traditional vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Buy IEC 62443 PDFs ($500+) | Ingest your licensed IEC data once |
| Navigate 300+ page security level tables | *"What requirements apply to SL-2?"* → instant answer |
| Manual Purdue Model diagrams | `get_zone_conduit_guidance` → generated architecture |
| Cross-reference NIST ↔ IEC manually | `compare_ot_requirements` → mapped instantly |
| Search MITRE matrices by hand | *"Show me PLC attacks"* → filtered techniques |
| 6 different documentation sites | One unified query interface |

**Traditional example:** Open IEC 62443-3-3 PDF → Find security level table → Ctrl+F "SR 1" → Read 15 pages → Cross-reference to IEC 62443-4-2 → Repeat for NIST

**This MCP:** *"What are all IEC 62443 requirements for Security Level 2 targeting embedded devices?"* → Done.

---

## ⚠️ Important Disclaimers

### IEC 62443 Licensing

> **📄 IEC 62443 CONTENT NOT INCLUDED**
>
> IEC 62443 is a **copyrighted standard** published by the International Society of Automation (ISA) and International Electrotechnical Commission (IEC).
>
> **This MCP server provides:**
> - Database schema and ingestion tools for IEC 62443 data
> - JSON templates showing the expected data structure
> - Sample data (2 requirements) demonstrating the format
>
> **You must provide:**
> - Your own licensed copies of IEC 62443 standards
> - Your own JSON files created from your licensed standards
>
> **How to obtain IEC 62443 standards:**
> - Purchase from [ISA](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) or [IEC](https://webstore.iec.ch/)
> - Prices: ~$150-200 per part (3-3, 4-2, 3-2)
>
> **Ingestion guide:** See [docs/ingestion/iec62443-guide.md](./docs/ingestion/iec62443-guide.md)

### Legal Advice

> **🚨 THIS TOOL IS NOT SECURITY CONSULTING OR LEGAL ADVICE 🚨**
>
> Security requirements are sourced from official public standards (NIST, MITRE) and user-supplied licensed standards (IEC 62443). However:
> - **Security level targeting** is risk-based and requires proper threat modeling
> - **Zone/conduit architectures** are design aids, not prescriptive solutions
> - **Cross-standard mappings** are interpretive aids, not official guidance
> - **MITRE techniques** are threat intelligence, not vulnerability assessments
>
> **Always:**
> - Conduct proper risk assessments for your specific environment
> - Engage qualified OT security professionals for implementation guidance
> - Verify against official standard publications
> - Follow your organization's security policies and procedures

### NIST & MITRE Data

**Public domain content** — NIST 800-53, NIST 800-82, and MITRE ATT&CK for ICS data are sourced from official U.S. government repositories and are in the public domain. No restrictions on use or distribution.

---

## About Ansvar Systems

We build AI-accelerated threat modeling and compliance tools for automotive OEMs, Tier 1 suppliers, industrial manufacturers, and critical infrastructure operators. This MCP server started as our internal IEC 62443 reference tool — turns out everyone securing OT environments has the same "6 documentation sites, 12 PDFs" problem.

So we're open-sourcing it. Navigating IEC 62443 security levels shouldn't require a spreadsheet and a law degree.

**[ansvar.eu](https://ansvar.eu)** — Stockholm, Sweden

**Industries we serve:**
- Automotive (ISO 21434, UN R155)
- Industrial Manufacturing (IEC 62443)
- Energy & Utilities (NERC CIP, IEC 62443)
- Medical Devices (IEC 81001-5-1, IEC 62443-4-2)

---

## Documentation

### Getting Started
- **[Quick Start Guide](docs/quickstart.md)** — Installation and first queries
- **[IEC 62443 Ingestion Guide](docs/ingestion/iec62443-guide.md)** — How to ingest your licensed standards
- **[NIST Ingestion Guide](docs/ingestion/nist-guide.md)** — Automated NIST data setup

### Tools & Features
- **[Available Tools](docs/tools.md)** — All 7 MCP tools with examples
- **[Tool Reference: Security Level Mapping](docs/tools/map-security-level-requirements.md)**
- **[Tool Reference: Zone/Conduit Guidance](docs/tools/get-zone-conduit-guidance.md)**
- **[Tool Reference: Requirement Rationale](docs/tools/get-requirement-rationale.md)**

### Use Cases
- **[Industry Use Cases](docs/use-cases.md)** — Automotive, energy, manufacturing, water/wastewater
- **[Coverage Details](docs/coverage.md)** — Complete standard coverage breakdown

### Development
- **[Development Guide](docs/development.md)** — Contributing, adding standards
- **[Architecture](docs/architecture.md)** — Database schema, tool design
- **[Troubleshooting](docs/troubleshooting.md)** — Common issues and fixes

### Project Planning
- **[Stage 2 Design](docs/plans/2026-01-29-ot-security-mcp-design.md)** — Complete architectural design
- **[Stage 2 Implementation](docs/plans/2026-01-29-stage2-implementation.md)** — Task breakdown
- **[Release Notes v0.2.0](RELEASE_NOTES_v0.2.0.md)** — What's new in Stage 2

---

## Roadmap

### Stage 3 (Planned Q2 2026)
- **IEC 62443-2-4** — Supplier security requirements (DORA/NIS2 relevance)
- **Rich Cross-Standard Mappings** — IEC ↔ NIST ↔ MITRE with confidence scores
- **Automated Mapping Suggestions** — ML-based requirement similarity
- **Compare Requirements Tool** — Side-by-side multi-standard comparison

### Stage 4 (Planned Q3 2026)
- **NERC CIP** — North American energy sector requirements
- **Sector Applicability Engine** — "Which standards apply to my facility?"
- **EU Regulatory Crosswalk** — NIS2, DORA, CRA mappings to IEC 62443

**See:** [ROADMAP.md](./ROADMAP.md) for full feature timeline

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Adding new standards
- Improving cross-standard mappings
- Enhancing tool capabilities
- Fixing bugs or improving documentation

---

## License

**Code:** Apache License 2.0 (see [LICENSE](./LICENSE))

**Data:**
- **IEC 62443:** User-supplied (requires license from ISA/IEC)
- **NIST 800-53, 800-82:** Public domain (U.S. government work)
- **MITRE ATT&CK for ICS:** Apache 2.0 (MITRE Corporation)

---

## Support

### Community Support
- **GitHub Issues:** [Report bugs or request features](https://github.com/Ansvar-Systems/ot-security-mcp/issues)
- **GitHub Discussions:** [Ask questions or share use cases](https://github.com/Ansvar-Systems/ot-security-mcp/discussions)

### Commercial Support
Need help with:
- IEC 62443 security level targeting for your facility?
- Custom zone/conduit architectures for complex OT networks?
- Threat modeling using MITRE ATT&CK for ICS?
- NIS2 or DORA compliance mapping to IEC 62443?

**Contact:** [info@ansvar.eu](mailto:info@ansvar.eu)

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
