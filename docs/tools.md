# Tool Reference Documentation

Comprehensive reference for all tools provided by the OT Security MCP Server.

## Table of Contents

- [search_ot_requirements](#search_ot_requirements)
- [get_ot_requirement](#get_ot_requirement)
- [list_ot_standards](#list_ot_standards)
- [get_mitre_ics_technique](#get_mitre_ics_technique)
- [Error Handling](#error-handling)
- [Common Use Cases](#common-use-cases)

---

## search_ot_requirements

Search across all OT security requirements using full-text search with optional filtering.

### Description

Performs a full-text search across requirement titles, descriptions, and rationale text. Results can be filtered by standard, security level, or component type. Returns relevant excerpts with relevance scores.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query text (searches title, description, and rationale) |
| `options` | object | No | Optional filtering and pagination options |
| `options.standards` | string[] | No | Filter by specific standard IDs (e.g., `["iec62443-3-3", "nist-800-82"]`) |
| `options.security_level` | number | No | Filter by IEC 62443 security level (1-4) |
| `options.component_type` | string | No | Filter by component type: `"host"`, `"network"`, `"embedded"`, or `"application"` |
| `options.limit` | number | No | Maximum results to return (default: 10, max: 100) |

### Returns

Array of `RequirementSearchResult` objects:

```typescript
{
  requirement_id: string;        // e.g., "SR 1.1"
  standard: string;              // e.g., "iec62443-3-3"
  standard_name: string;         // e.g., "IEC 62443-3-3"
  title: string;                 // Requirement title
  description: string | null;    // Full description
  snippet: string;               // Relevant text excerpt
  relevance: number;             // Relevance score (0.0-1.0)
  security_level: number | null; // IEC 62443 security level (1-4)
  component_type: string | null; // Component type
}
```

### Example Request

```json
{
  "query": "user authentication",
  "options": {
    "standards": ["iec62443-3-3"],
    "security_level": 2,
    "limit": 5
  }
}
```

### Example Response

```json
[
  {
    "requirement_id": "SR 1.1",
    "standard": "iec62443-3-3",
    "standard_name": "IEC 62443-3-3",
    "title": "Human user identification and authentication",
    "description": "The control system shall provide the capability to identify and authenticate all human users...",
    "snippet": "...user identification and authentication for all human users accessing...",
    "relevance": 0.92,
    "security_level": 2,
    "component_type": "host"
  }
]
```

### Stage 1 Behavior

**Returns empty array** - No requirements have been ingested yet. The `ot_requirements` table is empty in Stage 1.

Tool will function normally in Stage 2 after IEC 62443 and NIST 800-82 requirements are ingested.

### Notes

- Empty query returns empty results
- Invalid `security_level` values are ignored
- Invalid `component_type` values are ignored
- Results are ordered by relevance score (highest first)

---

## get_ot_requirement

Get detailed information about a specific OT security requirement by ID and standard.

### Description

Retrieves comprehensive details for a single requirement, including full description, rationale, implementation guidance, and optionally cross-standard mappings.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requirement_id` | string | Yes | Requirement identifier (e.g., `"SR 1.1"`, `"SR 1.1 RE 1"`, `"AC-1"`) |
| `standard` | string | Yes | Standard identifier (e.g., `"iec62443-3-3"`, `"nist-800-82"`) |
| `version` | string | No | Specific standard version (uses latest if not specified) |
| `include_mappings` | boolean | No | Include cross-standard mappings (default: `true`) |

### Returns

`RequirementDetail` object or `null` if not found:

```typescript
{
  requirement_id: string;
  standard: string;
  version: string;
  title: string;
  description: string | null;
  rationale: string | null;
  security_level: number | null;
  component_type: string | null;
  implementation_guidance: string | null;
  mappings?: {                    // Only if include_mappings=true
    standard: string;
    requirement_id: string;
    mapping_type: string;
    notes: string | null;
  }[];
}
```

### Example Request

```json
{
  "requirement_id": "SR 1.1",
  "standard": "iec62443-3-3",
  "include_mappings": true
}
```

### Example Response

```json
{
  "requirement_id": "SR 1.1",
  "standard": "iec62443-3-3",
  "version": "2013",
  "title": "Human user identification and authentication",
  "description": "The control system shall provide the capability to identify and authenticate all human users...",
  "rationale": "Without identification and authentication, unauthorized users may gain access...",
  "security_level": 1,
  "component_type": "host",
  "implementation_guidance": "Implement multi-factor authentication for all user accounts...",
  "mappings": [
    {
      "standard": "nist-800-82",
      "requirement_id": "IA-2",
      "mapping_type": "equivalent",
      "notes": "Both require user identification and authentication"
    }
  ]
}
```

### Stage 1 Behavior

**Returns null** with error message - No requirements have been ingested yet.

Example Stage 1 response:
```json
{
  "error": "Requirement not found",
  "requirement_id": "SR 1.1",
  "standard": "iec62443-3-3"
}
```

Tool will function normally in Stage 2 after requirements are ingested.

### Notes

- Case-sensitive requirement IDs
- Returns `null` if requirement doesn't exist
- Mappings array is empty if no cross-standard mappings exist
- Version defaults to latest available version for the standard

---

## list_ot_standards

List all available OT security standards with metadata and coverage statistics.

### Description

Returns a comprehensive list of all standards available in the database, including version information, requirement counts, and last update timestamps.

### Parameters

None - This tool takes no parameters.

### Returns

Array of `OTStandard` objects:

```typescript
{
  standard: string;              // Standard ID (e.g., "iec62443-3-3")
  name: string;                  // Full name
  version: string;               // Version number
  description: string | null;    // Description
  organization: string | null;   // Publishing organization
  requirement_count: number;     // Number of requirements
  last_updated: string;          // ISO 8601 timestamp
}
```

### Example Request

```json
{}
```

### Example Response

```json
[
  {
    "standard": "iec62443-3-3",
    "name": "IEC 62443-3-3",
    "version": "2013",
    "description": "Security for industrial automation and control systems - System security requirements and security levels",
    "organization": "International Electrotechnical Commission",
    "requirement_count": 89,
    "last_updated": "2024-01-15T10:30:00Z"
  },
  {
    "standard": "nist-800-82",
    "name": "NIST SP 800-82 Rev 3",
    "version": "3",
    "description": "Guide to Operational Technology (OT) Security",
    "organization": "National Institute of Standards and Technology",
    "requirement_count": 156,
    "last_updated": "2024-01-15T10:30:00Z"
  }
]
```

### Stage 1 Behavior

**Returns empty array** - No standards have been registered yet. The `ot_standards` table is empty in Stage 1.

```json
[]
```

Tool will return populated list in Stage 2 after standards metadata is ingested.

### Notes

- Results are ordered by standard ID alphabetically
- All standards include requirement counts
- Timestamps use ISO 8601 format (UTC)

---

## get_mitre_ics_technique

Get detailed information about a MITRE ATT&CK for ICS technique, including mitigations and mappings.

### Description

Retrieves comprehensive details about a specific MITRE ATT&CK for ICS technique, including description, tactics, platforms, data sources, and related mitigations. Optionally maps the technique to OT security standard requirements.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `technique_id` | string | Yes | MITRE technique ID (e.g., `"T0800"`, `"T0801"`) |
| `include_mitigations` | boolean | No | Include related mitigations (default: `true`) |
| `map_to_standards` | string[] | No | Map to specific standards (e.g., `["iec62443-3-3"]`) |

### Returns

`MitreTechniqueDetail` object or `null` if not found:

```typescript
{
  technique_id: string;          // e.g., "T0800"
  tactic: string | null;         // MITRE tactic
  name: string | null;           // Technique name
  description: string | null;    // Full description
  platforms: string[] | null;    // Target platforms
  data_sources: string[] | null; // Detection data sources
  mitigations?: {                // Only if include_mitigations=true
    mitigation_id: string;
    name: string;
    description: string | null;
  }[];
  mapped_requirements?: {        // Only if map_to_standards provided
    standard: string;
    requirement_id: string;
    title: string;
    mapping_rationale: string | null;
  }[];
}
```

### Example Request

```json
{
  "technique_id": "T0800",
  "include_mitigations": true,
  "map_to_standards": ["iec62443-3-3"]
}
```

### Example Response

```json
{
  "technique_id": "T0800",
  "tactic": "Inhibit Response Function",
  "name": "Activate Firmware Update Mode",
  "description": "Adversaries may activate firmware update mode on devices to prevent expected response functions from engaging in reaction to an emergency or process malfunction...",
  "platforms": [
    "Safety Instrumented System/Protection Relay",
    "Field Controller/RTU/PLC/IED"
  ],
  "data_sources": [
    "Application Log: Application Log Content",
    "Network Traffic: Network Traffic Content"
  ],
  "mitigations": [
    {
      "mitigation_id": "M0800",
      "name": "Disable Firmware Update Mode",
      "description": "Disable firmware update mode when not required..."
    },
    {
      "mitigation_id": "M0802",
      "name": "Communication Authenticity",
      "description": "Require authenticated communications..."
    }
  ],
  "mapped_requirements": []
}
```

### Stage 1 Behavior

**Fully functional** with 83 real MITRE ATT&CK for ICS techniques.

The `map_to_standards` parameter returns empty arrays in Stage 1 because no OT requirements have been ingested yet. This will be functional in Stage 3 when cross-standard mappings are implemented.

Example Stage 1 response (with `map_to_standards`):
```json
{
  "technique_id": "T0800",
  "tactic": "Inhibit Response Function",
  "name": "Activate Firmware Update Mode",
  "description": "...",
  "platforms": ["..."],
  "data_sources": ["..."],
  "mitigations": [
    // Real mitigations included
  ],
  "mapped_requirements": []  // Empty in Stage 1
}
```

### Available Techniques

Stage 1 includes 83 MITRE ATT&CK for ICS techniques. Common examples:

- **T0800** - Activate Firmware Update Mode
- **T0801** - Monitor Process State
- **T0802** - Automated Collection
- **T0803** - Block Command Message
- **T0804** - Block Reporting Message
- **T0805** - Block Serial COM
- **T0806** - Brute Force I/O
- **T0807** - Command-Line Interface
- **T0808** - Control Device Identification
- And 75 more...

### Notes

- Returns `null` if technique ID doesn't exist
- Mitigations are ordered by mitigation ID
- Platforms and data_sources are parsed from JSON
- Empty technique_id returns `null`
- Case-sensitive technique IDs

---

## Error Handling

All tools handle errors gracefully and return appropriate responses:

### Not Found Errors

When a resource doesn't exist:

```json
{
  "error": "Technique not found",
  "technique_id": "T9999"
}
```

or

```json
{
  "error": "Requirement not found",
  "requirement_id": "SR 99.99",
  "standard": "invalid-standard"
}
```

### Validation Errors

When parameters are invalid:

```json
{
  "error": "technique_id parameter is required"
}
```

### Empty Results

When no results are found (search operations):

```json
[]
```

### Database Errors

Database errors are caught and logged, returning empty results or `null` to prevent server crashes.

---

## Common Use Cases

### Use Case 1: Find Authentication Requirements

**Stage 2+ only** (returns empty in Stage 1)

```json
{
  "tool": "search_ot_requirements",
  "query": "authentication",
  "options": {
    "security_level": 2,
    "limit": 10
  }
}
```

### Use Case 2: Get Technique with Mitigations

**Works in Stage 1**

```json
{
  "tool": "get_mitre_ics_technique",
  "technique_id": "T0800",
  "include_mitigations": true
}
```

### Use Case 3: Compare Techniques

**Works in Stage 1**

Call `get_mitre_ics_technique` multiple times:
- T0800 (Activate Firmware Update Mode)
- T0803 (Block Command Message)
- T0881 (Service Stop)

Compare tactics, mitigations, and platforms.

### Use Case 4: List All Available Standards

**Stage 2+ only** (returns empty in Stage 1)

```json
{
  "tool": "list_ot_standards"
}
```

### Use Case 5: Get Requirement with Mappings

**Stage 2+ only** (returns null in Stage 1)

```json
{
  "tool": "get_ot_requirement",
  "requirement_id": "SR 1.1",
  "standard": "iec62443-3-3",
  "include_mappings": true
}
```

This will show equivalent requirements in other standards.

### Use Case 6: Search by Component Type

**Stage 2+ only** (returns empty in Stage 1)

```json
{
  "tool": "search_ot_requirements",
  "query": "network segmentation",
  "options": {
    "component_type": "network",
    "limit": 5
  }
}
```

### Use Case 7: Technique-to-Requirement Mapping

**Stage 3+ only** (mapped_requirements empty in Stage 1-2)

```json
{
  "tool": "get_mitre_ics_technique",
  "technique_id": "T0800",
  "map_to_standards": ["iec62443-3-3", "nist-800-82"]
}
```

Will show which requirements help mitigate this technique.

---

## Stage Implementation Summary

| Tool | Stage 1 | Stage 2 | Stage 3+ |
|------|---------|---------|----------|
| `search_ot_requirements` | Empty array | Functional | Functional |
| `get_ot_requirement` | Returns null | Functional | Functional with mappings |
| `list_ot_standards` | Empty array | Functional | Functional |
| `get_mitre_ics_technique` | Functional (no mappings) | Functional (no mappings) | Functional with mappings |

---

## Technical Details

### Database Tables Used

- **search_ot_requirements**: `ot_requirements`, `ot_standards`
- **get_ot_requirement**: `ot_requirements`, `cross_standard_mappings`
- **list_ot_standards**: `ot_standards`, `ot_requirements` (for counts)
- **get_mitre_ics_technique**: `mitre_ics_techniques`, `mitre_ics_mitigations`, `mitre_technique_mitigations`, `mitre_standard_mappings`

### Performance Considerations

- Full-text search uses SQLite FTS5 for performance
- Results are limited to prevent memory issues
- Database queries use proper indexes
- JSON fields (platforms, data_sources) are parsed on demand

### Type Safety

All tools use TypeScript interfaces for type safety:
- Input parameters are validated
- Return types are strictly defined
- Null safety is enforced throughout

---

## Support

For questions or issues with any tool:
1. Check this documentation
2. Review the [README.md](../README.md)
3. Open an issue on GitHub
4. Check the [implementation plans](plans/)

## Version

Documentation version: 0.1.0 (Stage 1)
Last updated: 2024-01-29
