/**
 * Tool Registry for OT Security MCP Server
 * Defines all available tools and their schemas
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Export tool implementations
export { searchRequirements } from './search.js';
export { getRequirement } from './get-requirement.js';
export { listStandards } from './list-standards.js';
export { getMitreTechnique } from './get-mitre-technique.js';
export { mapSecurityLevelRequirements } from './map-security-level-requirements.js';
export { getZoneConduitGuidance } from './get-zone-conduit-guidance.js';

/**
 * Register all Stage 1 tools for the MCP server
 * @returns Array of tool definitions with JSON Schema validation
 */
export function registerTools(): Tool[] {
  return [
    {
      name: 'search_ot_requirements',
      description: 'Search for OT security requirements across all standards by keyword',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for finding requirements (searches in title, description, and rationale)',
          },
          standards: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Optional: Filter by specific standards (e.g., ["iec62443-3-3", "nist-800-82"])',
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
      description: 'Get detailed information about a specific OT requirement',
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
            description: 'Optional: Include cross-standard mappings in the response (default: true)',
          },
        },
        required: ['requirement_id', 'standard'],
      },
    },
    {
      name: 'list_ot_standards',
      description: 'List all available OT security standards with coverage statistics',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_mitre_ics_technique',
      description: 'Get detailed information about a MITRE ATT&CK for ICS technique',
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
      description: 'Map IEC 62443 requirements to a specific security level (1-4). Returns all requirements that apply to the specified security level, optionally filtered by component type.',
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
      description: 'Get IEC 62443 zone and conduit guidance for network segmentation. Query zones by Purdue level (0-5), security level target (1-4), and reference architecture. Returns comprehensive network segmentation guidance including zones, conduits, and data flows for OT environments.',
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
            description: 'Optional: Filter by reference architecture (e.g., "Purdue Model", "IEC 62443-3-2", "ISA-95")',
          },
        },
        required: [],
      },
    },
  ];
}
