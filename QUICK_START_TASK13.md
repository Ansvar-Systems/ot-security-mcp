# Quick Start: get_mitre_ics_technique with Standard Mapping

## Overview

The `get_mitre_ics_technique` tool now supports mapping MITRE ATT&CK for ICS techniques to OT security requirements from IEC 62443 and NIST standards.

## Basic Usage

### 1. Get Technique Without Mapping

```json
{
  "tool": "get_mitre_ics_technique",
  "technique_id": "T0800"
}
```

**Returns:**
```json
{
  "technique_id": "T0800",
  "tactic": "initial-access",
  "name": "Exploit Public-Facing Application",
  "description": "Adversaries may exploit vulnerabilities...",
  "platforms": ["Windows", "Linux", "Control Server"],
  "data_sources": ["Network Traffic", "Application Logs"],
  "mitigations": [
    {
      "mitigation_id": "M0800",
      "name": "Application Whitelisting",
      "description": "Use application whitelisting..."
    }
  ],
  "mapped_requirements": []
}
```

### 2. Map to IEC 62443

```json
{
  "tool": "get_mitre_ics_technique",
  "technique_id": "T0800",
  "map_to_standards": ["iec62443-3-3"]
}
```

**Returns:**
```json
{
  "technique_id": "T0800",
  "name": "Exploit Public-Facing Application",
  ...
  "mapped_requirements": [
    {
      "standard_id": "iec62443-3-3",
      "requirement_id": "SR 1.1",
      "title": "Human user identification",
      "description": "Identify all human users...",
      "component_type": "host"
    }
  ]
}
```

### 3. Map to Multiple Standards

```json
{
  "tool": "get_mitre_ics_technique",
  "technique_id": "T0800",
  "map_to_standards": ["iec62443-3-3", "nist-800-53"]
}
```

**Returns:**
```json
{
  "technique_id": "T0800",
  "name": "Exploit Public-Facing Application",
  ...
  "mapped_requirements": [
    {
      "standard_id": "iec62443-3-3",
      "requirement_id": "SR 1.1",
      "title": "Human user identification",
      ...
    },
    {
      "standard_id": "iec62443-3-3",
      "requirement_id": "SR 2.1",
      "title": "Authorization enforcement",
      ...
    },
    {
      "standard_id": "nist-800-53",
      "requirement_id": "AC-2",
      "title": "Account Management",
      ...
    }
  ]
}
```

### 4. Exclude Mitigations (Optional)

```json
{
  "tool": "get_mitre_ics_technique",
  "technique_id": "T0800",
  "include_mitigations": false,
  "map_to_standards": ["iec62443-3-3"]
}
```

**Returns:**
```json
{
  "technique_id": "T0800",
  "name": "Exploit Public-Facing Application",
  ...
  "mitigations": [],
  "mapped_requirements": [...]
}
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `technique_id` | string | Yes | - | MITRE technique ID (e.g., "T0800") |
| `include_mitigations` | boolean | No | true | Include mitigation recommendations |
| `map_to_standards` | string[] | No | [] | Array of standard IDs to map to |

## Available Standards for Mapping

- `iec62443-3-3` - IEC 62443-3-3 System Security Requirements
- `iec62443-4-2` - IEC 62443-4-2 Component Security Requirements
- `nist-800-53` - NIST 800-53 Rev 5 Security Controls
- `nist-800-82` - NIST 800-82 Rev 3 ICS Security

## Use Cases

### 1. Threat-Based Security Assessment

**Scenario:** You detected potential threat activity matching T0800.

**Query:**
```json
{
  "technique_id": "T0800",
  "map_to_standards": ["iec62443-3-3"]
}
```

**Result:** Get specific IEC 62443 requirements to implement as countermeasures.

### 2. Compliance Mapping

**Scenario:** Show how MITRE techniques map to regulatory requirements.

**Query:**
```json
{
  "technique_id": "T0800",
  "map_to_standards": ["iec62443-3-3", "nist-800-53"]
}
```

**Result:** Cross-reference MITRE threats with compliance requirements.

### 3. Gap Analysis

**Scenario:** Identify which requirements address a specific threat.

**Workflow:**
1. Get MITRE technique with mappings
2. Use `get_ot_requirement` for each mapped requirement
3. Compare with implemented controls

### 4. Threat Intelligence Integration

**Scenario:** Enrich threat intel with OT-specific requirements.

**Workflow:**
1. Query MITRE technique
2. Get mapped requirements
3. Use `get_requirement_rationale` for implementation guidance

## Integration Examples

### With search_ot_requirements

```typescript
// 1. Find technique
const technique = await getMitreTechnique(db, {
  technique_id: 'T0800',
  map_to_standards: ['iec62443-3-3']
});

// 2. Search for related requirements
const related = await searchRequirements(db, {
  query: technique.name,
  standards: ['iec62443-3-3']
});
```

### With get_requirement_rationale

```typescript
// 1. Get technique with mappings
const technique = await getMitreTechnique(db, {
  technique_id: 'T0800',
  map_to_standards: ['iec62443-3-3']
});

// 2. Get detailed rationale for each requirement
for (const req of technique.mapped_requirements) {
  const rationale = await getRequirementRationale(db, {
    requirement_id: req.requirement_id,
    standard: req.standard_id
  });
  console.log(rationale);
}
```

### With map_security_level_requirements

```typescript
// 1. Get technique with IEC 62443 mappings
const technique = await getMitreTechnique(db, {
  technique_id: 'T0800',
  map_to_standards: ['iec62443-3-3']
});

// 2. Check which security level is needed
const securityLevels = [1, 2, 3, 4];
for (const sl of securityLevels) {
  const requirements = await mapSecurityLevelRequirements(db, {
    security_level: sl
  });

  // Check if any mapped requirements are in this SL
  const overlap = requirements.filter(r =>
    technique.mapped_requirements.some(mr =>
      mr.requirement_id === r.requirement_id
    )
  );

  if (overlap.length > 0) {
    console.log(`SL ${sl} includes ${overlap.length} requirements for T0800`);
  }
}
```

## Response Fields

### MitreTechniqueDetail

```typescript
{
  technique_id: string;           // MITRE technique ID
  tactic: string | null;          // MITRE tactic category
  name: string | null;            // Technique name
  description: string | null;     // Full description
  platforms: string[] | null;     // Affected platforms
  data_sources: string[] | null;  // Detection data sources
  mitigations: MitreMitigation[]; // Mitigation strategies
  mapped_requirements: OTRequirement[]; // Mapped OT requirements
}
```

### OTRequirement

```typescript
{
  id: number;                     // Database ID
  standard_id: string;            // Standard identifier
  requirement_id: string;         // Requirement identifier
  parent_requirement_id: string | null; // Parent (for enhancements)
  title: string | null;           // Short title
  description: string | null;     // Full description
  rationale: string | null;       // Why it exists
  component_type: string | null;  // Component type
  purdue_level: number | null;    // Purdue model level
}
```

## Testing

Run the test suite:

```bash
npm test -- get-mitre-technique.test.ts
```

Expected output:
```
✓ get_mitre_ics_technique (24 tests)
  ✓ Empty Database (2)
  ✓ Basic Technique Retrieval (6)
  ✓ Mitigations (6)
  ✓ Standard Mapping (7)
  ✓ Error Handling (3)
```

## Common Patterns

### Pattern 1: Threat-Driven Requirements

```typescript
async function getThreatRequirements(techniqueId: string) {
  // Get technique with all available mappings
  const technique = await getMitreTechnique(db, {
    technique_id: techniqueId,
    map_to_standards: ['iec62443-3-3', 'nist-800-53']
  });

  // Group by standard
  const byStandard = technique.mapped_requirements.reduce((acc, req) => {
    if (!acc[req.standard_id]) acc[req.standard_id] = [];
    acc[req.standard_id].push(req);
    return acc;
  }, {});

  return byStandard;
}
```

### Pattern 2: Coverage Analysis

```typescript
async function analyzeCoverage(techniqueIds: string[]) {
  const coverage = {
    total: 0,
    mapped: 0,
    unmapped: 0,
    by_standard: {}
  };

  for (const id of techniqueIds) {
    const technique = await getMitreTechnique(db, {
      technique_id: id,
      map_to_standards: ['iec62443-3-3']
    });

    coverage.total++;
    if (technique.mapped_requirements.length > 0) {
      coverage.mapped++;
    } else {
      coverage.unmapped++;
    }
  }

  return coverage;
}
```

## Troubleshooting

### No Mappings Returned

**Problem:** `mapped_requirements` is empty when `map_to_standards` is provided.

**Solutions:**
1. Check if the technique has mitigations with OT requirement mappings
2. Verify standard ID is correct (e.g., "iec62443-3-3", not "IEC 62443-3-3")
3. Check database has the required data ingested

### Duplicate Requirements

**Problem:** Same requirement appears multiple times.

**Solution:** This is expected if multiple mitigations map to the same requirement. The query uses DISTINCT to minimize duplicates, but some may remain if joining through different paths.

### Performance Issues

**Problem:** Slow queries when mapping to multiple standards.

**Solutions:**
1. Limit the number of standards in `map_to_standards`
2. Ensure database indexes are present (run schema.sql)
3. Check database file size and consider optimization

## Next Steps

1. **Explore Related Tools:**
   - `get_ot_requirement` - Get full requirement details
   - `get_requirement_rationale` - Understand why requirements exist
   - `search_ot_requirements` - Find requirements by keyword

2. **Try Other Techniques:**
   - Browse available techniques with a database browser
   - Test with different MITRE tactics
   - Explore multiple technique comparisons

3. **Build Workflows:**
   - Threat intelligence integration
   - Compliance mapping automation
   - Security control gap analysis

---

**Tool Version:** Stage 2 Complete
**Tests:** 24/24 passing
**Documentation:** Task 13 Complete
