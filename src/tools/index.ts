/**
 * Tool Registry for OT Security MCP Server
 * Defines all available tools and their schemas
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
} as const;

function toTitle(name: string): string {
  return name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function annotateTools(tools: Tool[]): Tool[] {
  return tools.map((tool) => ({
    ...tool,
    annotations: {
      title: tool.annotations?.title ?? toTitle(tool.name),
      readOnlyHint: tool.annotations?.readOnlyHint ?? READ_ONLY_ANNOTATIONS.readOnlyHint,
      destructiveHint: tool.annotations?.destructiveHint ?? READ_ONLY_ANNOTATIONS.destructiveHint,
    },
  }));
}

// Export tool implementations
export { searchRequirements } from './search.js';
export { getRequirement } from './get-requirement.js';
export { listStandards } from './list-standards.js';
export { getMitreTechnique } from './get-mitre-technique.js';
export { mapSecurityLevelRequirements } from './map-security-level-requirements.js';
export { getZoneConduitGuidance } from './get-zone-conduit-guidance.js';
export { getRequirementRationale } from './get-requirement-rationale.js';

/**
 * Register all Stage 1 tools for the MCP server
 * @returns Array of tool definitions with JSON Schema validation
 */
export function registerTools(): Tool[] {
  const tools: Tool[] = [
    {
      name: 'search_ot_requirements',
      description:
        'Full-text search across all OT security standards (IEC 62443, NIST 800-53, NIST 800-82, MITRE ATT&CK for ICS). Returns ranked results with snippet and relevance score (0-1). Use this as an entry point for discovery when you do not know the exact requirement ID. Chain results into get_ot_requirement for full details. Returns empty array (not error) when no matches found. NOT for retrieving a specific known requirement by ID - use get_ot_requirement instead.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search query for finding requirements (searches in title, description, and rationale)',
          },
          standards: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Optional: Filter by specific standards (e.g., ["iec62443-3-3", "nist-800-82"])',
          },
          security_level: {
            type: 'number',
            minimum: 1,
            maximum: 4,
            description: 'Optional: Filter by IEC 62443 security level (1-4)',
          },
          component_type: {
            type: 'string',
            enum: ['host', 'network', 'embedded', 'application'],
            description: 'Optional: Filter by component type',
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 10,
            description: 'Optional: Maximum number of results to return (default: 10)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_ot_requirement',
      description:
        'Get detailed information about a specific OT security requirement by ID and standard. Returns null (not error) when requirement not found. Includes cross-standard mappings by default (e.g., NIST 800-53 AC-2 mapped to IEC 62443 SR 1.1). Use after search_ot_requirements to get full details, or directly when you know the exact requirement_id and standard. Output includes mappings to other frameworks - chain into get_ot_requirement for mapped requirements. Available standards: "iec62443-3-3", "iec62443-4-2", "iec62443-3-2", "nist-800-53", "nist-800-82".',
      inputSchema: {
        type: 'object',
        properties: {
          requirement_id: {
            type: 'string',
            description: 'Requirement identifier (e.g., "SR 1.1", "SR 1.1 RE 1")',
          },
          standard: {
            type: 'string',
            description: 'Standard identifier (e.g., "iec62443-3-3", "nist-800-82")',
          },
          version: {
            type: 'string',
            description: 'Optional: Specific version of the standard',
          },
          include_mappings: {
            type: 'boolean',
            default: true,
            description:
              'Optional: Include cross-standard mappings in the response (default: true)',
          },
        },
        required: ['requirement_id', 'standard'],
      },
    },
    {
      name: 'list_ot_standards',
      description:
        'List all available OT security standards with requirement counts and metadata. Use this first to discover available standards and their IDs before calling other tools. Returns standard ID, name, version, and requirement count. Note: IEC 62443 data is user-supplied and may not be present in all installations - check the returned list to see what is available.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_mitre_ics_technique',
      description:
        'Get detailed MITRE ATT&CK for ICS technique information including description, tactic, platforms, and data sources. Returns null when technique not found. Includes mitigations by default. Use map_to_standards to see which OT requirements address this technique. Typical workflow: search_ot_requirements to find a threat area, then get_mitre_ics_technique for attack details, then get_ot_requirement for mitigation controls. Technique IDs follow the pattern T0800-T0899.',
      inputSchema: {
        type: 'object',
        properties: {
          technique_id: {
            type: 'string',
            description: 'MITRE technique ID (e.g., "T0800", "T0801")',
          },
          include_mitigations: {
            type: 'boolean',
            default: true,
            description: 'Optional: Include mitigations in the response (default: true)',
          },
          map_to_standards: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Optional: Map technique to specific standards (e.g., ["iec62443-3-3"])',
          },
        },
        required: ['technique_id'],
      },
    },
    {
      name: 'map_security_level_requirements',
      description:
        'Get all IEC 62443 requirements applicable to a specific security level. SL-1 (casual/accidental violation) through SL-4 (nation-state). Higher levels include all lower-level requirements. Returns an array of requirements with security level metadata. Returns empty array if no IEC 62443 data is loaded - check list_ot_standards first. NOT useful without IEC 62443 data. Use after identifying your target security level to build a requirements checklist.',
      inputSchema: {
        type: 'object',
        properties: {
          security_level: {
            type: 'number',
            description: 'Target security level (1-4)',
            minimum: 1,
            maximum: 4,
          },
          component_type: {
            type: 'string',
            description: 'Optional component type filter (host, network, embedded, app)',
            enum: ['host', 'network', 'embedded', 'app'],
          },
          include_enhancements: {
            type: 'boolean',
            description: 'Include requirement enhancements (REs). Default: true',
            default: true,
          },
        },
        required: ['security_level'],
      },
    },
    {
      name: 'get_zone_conduit_guidance',
      description:
        'Get Purdue Model network segmentation guidance for OT environments based on IEC 62443-3-2. All parameters are optional - omit all for complete guidance across all levels. Returns zones (with typical assets and security level targets), conduits (network connection types with security requirements), data flows between zones, and a markdown guidance summary. Use after identifying security level requirements to understand network architecture implications. Purdue levels: 0=Physical Process, 1=Basic Control, 2=Area Supervisory, 3=Site Operations, 4=Site Business, 5=Enterprise.',
      inputSchema: {
        type: 'object',
        properties: {
          purdue_level: {
            type: 'number',
            description: 'Optional: Filter zones by Purdue level (0-5)',
            minimum: 0,
            maximum: 5,
          },
          security_level_target: {
            type: 'number',
            description: 'Optional: Filter zones by target security level (1-4)',
            minimum: 1,
            maximum: 4,
          },
          reference_architecture: {
            type: 'string',
            description:
              'Optional: Filter by reference architecture (e.g., "Purdue Model", "IEC 62443-3-2", "ISA-95")',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_requirement_rationale',
      description:
        'Get comprehensive rationale for why a specific OT security requirement exists. Returns: threats it addresses, regulatory drivers (NIS2, IEC 62443 certification), sector applicability (energy, manufacturing, water), and related requirements from other standards. Requires both requirement_id and standard. Returns null when not found. Use after get_ot_requirement when you need to explain or justify a requirement to stakeholders. NOT a substitute for get_ot_requirement - this provides the "why", not the "what".',
      inputSchema: {
        type: 'object',
        properties: {
          requirement_id: {
            type: 'string',
            description: 'Requirement identifier (e.g., "SR 1.1", "AC-2")',
          },
          standard: {
            type: 'string',
            description: 'Standard identifier (e.g., "iec62443-3-3", "nist-800-53")',
          },
        },
        required: ['requirement_id', 'standard'],
      },
    },
  ];

  return annotateTools(tools);
}
