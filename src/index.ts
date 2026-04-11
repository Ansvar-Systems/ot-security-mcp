#!/usr/bin/env node

/**
 * OT Security MCP Server
 * Entry point for the MCP server implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { DatabaseClient } from './database/client.js';
import { registerTools } from './tools/index.js';

// Resolve package root relative to this module (works from dist/ or src/)
const __ownFilename = fileURLToPath(import.meta.url);
const __ownDirname = dirname(__ownFilename);
const packageRoot = join(__ownDirname, '..');
import { searchRequirements } from './tools/search.js';
import { getRequirement } from './tools/get-requirement.js';
import { listStandards } from './tools/list-standards.js';
import { getMitreTechnique } from './tools/get-mitre-technique.js';
import { mapSecurityLevelRequirements } from './tools/map-security-level-requirements.js';
import { getZoneConduitGuidance } from './tools/get-zone-conduit-guidance.js';
import { getRequirementRationale } from './tools/get-requirement-rationale.js';

const SERVER_VERSION = '0.4.0';
const SERVER_NAME = 'ot-security-mcp';

/**
 * MCP Server class for OT Security standards and frameworks
 */
export class McpServer {
  private server: Server;
  private db: DatabaseClient;

  /**
   * Creates a new MCP server instance
   * @param dbPath - Optional custom database path (defaults to OT_MCP_DB_PATH env var or 'data/ot-security.db')
   */
  constructor(dbPath?: string) {
    // Initialize database client with custom path or environment variable
    const finalDbPath =
      dbPath || process.env.OT_MCP_DB_PATH || join(packageRoot, 'data', 'ot-security.db');
    this.db = new DatabaseClient(finalDbPath);

    // Create MCP server
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register handlers
    this.registerHandlers();
  }

  /**
   * Build standard _meta block for all tool responses
   */
  private responseMeta(toolName: string): Record<string, unknown> {
    return {
      server: SERVER_NAME,
      version: SERVER_VERSION,
      timestamp: new Date().toISOString(),
      tool: toolName,
    };
  }

  /**
   * Build a _citation block for a single requirement
   */
  private buildCitation(
    requirementId: string,
    standard: string,
    title?: string
  ): Record<string, unknown> {
    const displayParts = [standard.toUpperCase(), requirementId];
    if (title) displayParts.push(`- ${title}`);
    return {
      canonical_ref: `${standard}:${requirementId}`,
      display_text: displayParts.join(' '),
      lookup: {
        tool: 'get_ot_requirement',
        params: { requirement_id: requirementId, standard },
      },
    };
  }

  /**
   * Register MCP server handlers
   */
  private registerHandlers(): void {
    // ListTools handler - returns available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = registerTools();
      return { tools };
    });

    // CallTool handler - dispatches to tool implementations
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_ot_requirements':
            return this.handleSearchRequirements(args);

          case 'get_ot_requirement':
            return this.handleGetRequirement(args);

          case 'list_ot_standards':
            return this.handleListStandards();

          case 'get_mitre_ics_technique':
            return this.handleGetMitreTechnique(args);

          case 'map_security_level_requirements':
            return this.handleMapSecurityLevelRequirements(args);

          case 'get_zone_conduit_guidance':
            return this.handleGetZoneConduitGuidance(args);

          case 'get_requirement_rationale':
            return this.handleGetRequirementRationale(args);

          case 'about':
            return this.handleAbout();

          case 'list_sources':
            return this.handleListSources();

          case 'check_data_freshness':
            return this.handleCheckDataFreshness();

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        // Handle errors gracefully
        if (error instanceof McpError) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${errorMessage}`
        );
      }
    });
  }

  /**
   * Handle search_ot_requirements tool
   * @param args - Tool arguments containing query and options
   */
  private async handleSearchRequirements(args: unknown) {
    const { query, ...options } = args as any;

    const requirements = await searchRequirements(this.db, {
      query,
      options,
    });

    // Enrich each result with a _citation block
    const enriched = Array.isArray(requirements)
      ? requirements.map((item: any) => ({
          ...item,
          _citation: this.buildCitation(item.requirement_id, item.standard, item.title),
        }))
      : requirements;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              results: enriched,
              _meta: this.responseMeta('search_ot_requirements'),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle get_ot_requirement tool
   * @param args - Tool arguments containing requirement_id, standard, and optional filters
   */
  private async handleGetRequirement(args: unknown) {
    const { requirement_id, standard, version, include_mappings } = args as any;

    const result = await getRequirement(this.db, {
      requirement_id,
      standard,
      options: {
        version,
        include_mappings: include_mappings ?? true,
      },
    });

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Requirement not found',
                _error_type: 'not_found',
                requirement_id,
                standard,
                _meta: this.responseMeta('get_ot_requirement'),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const anyResult = result as any;
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...anyResult,
              _citation: this.buildCitation(
                anyResult.requirement_id ?? requirement_id,
                anyResult.standard ?? standard,
                anyResult.title
              ),
              _meta: this.responseMeta('get_ot_requirement'),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle list_ot_standards tool
   */
  private async handleListStandards() {
    const result = await listStandards(this.db);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              standards: result,
              _meta: this.responseMeta('list_ot_standards'),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle get_mitre_ics_technique tool
   * @param args - Tool arguments containing technique_id and optional parameters
   */
  private async handleGetMitreTechnique(args: unknown) {
    // Validate and extract parameters
    if (typeof args !== 'object' || args === null) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid arguments - expected an object',
                _error_type: 'invalid_argument',
                _meta: this.responseMeta('get_mitre_ics_technique'),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const { technique_id, include_mitigations, map_to_standards } = args as {
      technique_id?: string;
      include_mitigations?: boolean;
      map_to_standards?: string[];
    };

    if (!technique_id) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'technique_id parameter is required',
                _error_type: 'invalid_argument',
                _meta: this.responseMeta('get_mitre_ics_technique'),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const result = await getMitreTechnique(this.db, {
      technique_id,
      options: {
        include_mitigations,
        map_to_standards,
      },
    });

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Technique not found',
                _error_type: 'not_found',
                technique_id,
                _meta: this.responseMeta('get_mitre_ics_technique'),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const anyResult = result as any;
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...anyResult,
              _citation: {
                canonical_ref: `mitre-ics:${technique_id}`,
                display_text: `MITRE ATT&CK for ICS ${technique_id}${anyResult.name ? ` - ${anyResult.name}` : ''}`,
                lookup: {
                  tool: 'get_mitre_ics_technique',
                  params: { technique_id },
                },
              },
              _meta: this.responseMeta('get_mitre_ics_technique'),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle map_security_level_requirements tool
   * @param args - Tool arguments containing security_level and optional filters
   */
  private async handleMapSecurityLevelRequirements(args: unknown) {
    const { security_level, component_type, include_enhancements } = args as any;

    const requirements = await mapSecurityLevelRequirements(this.db, {
      security_level,
      component_type,
      include_enhancements,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              requirements,
              _meta: this.responseMeta('map_security_level_requirements'),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle get_zone_conduit_guidance tool
   * @param args - Tool arguments containing optional filters
   */
  private async handleGetZoneConduitGuidance(args: unknown) {
    const { purdue_level, security_level_target, reference_architecture } = args as any;

    const result = await getZoneConduitGuidance(this.db, {
      purdue_level,
      security_level_target,
      reference_architecture,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...((result as any) ?? {}),
              _meta: this.responseMeta('get_zone_conduit_guidance'),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle get_requirement_rationale tool
   * @param args - Tool arguments containing requirement_id and standard
   */
  private async handleGetRequirementRationale(args: unknown) {
    // Validate arguments
    if (typeof args !== 'object' || args === null) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid arguments - expected an object',
                _error_type: 'invalid_argument',
                _meta: this.responseMeta('get_requirement_rationale'),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const { requirement_id, standard } = args as {
      requirement_id?: string;
      standard?: string;
    };

    if (!requirement_id) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'requirement_id parameter is required',
                _error_type: 'invalid_argument',
                _meta: this.responseMeta('get_requirement_rationale'),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (!standard) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'standard parameter is required',
                _error_type: 'invalid_argument',
                _meta: this.responseMeta('get_requirement_rationale'),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const result = await getRequirementRationale(this.db, {
      requirement_id,
      standard,
    });

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Requirement not found',
                _error_type: 'not_found',
                requirement_id,
                standard,
                _meta: this.responseMeta('get_requirement_rationale'),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const anyResult = result as any;
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...anyResult,
              _citation: this.buildCitation(
                anyResult.requirement_id ?? requirement_id,
                anyResult.standard ?? standard,
                anyResult.title
              ),
              _meta: this.responseMeta('get_requirement_rationale'),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle about tool - returns server identity and capabilities
   */
  private async handleAbout() {
    const aboutData = {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      description:
        'OT Security MCP Server providing access to IEC 62443, NIST 800-53, NIST 800-82, and MITRE ATT&CK for ICS standards and frameworks.',
      publisher: 'Ansvar Systems',
      license: 'Apache-2.0',
      homepage: 'https://github.com/Ansvar-Systems/ot-security-mcp',
      standards: [
        {
          id: 'iec62443-3-3',
          name: 'IEC 62443-3-3',
          description: 'System Security Requirements and Security Levels',
          license: 'user-supplied',
        },
        {
          id: 'iec62443-4-2',
          name: 'IEC 62443-4-2',
          description: 'Technical Security Requirements for IACS Components',
          license: 'user-supplied',
        },
        {
          id: 'iec62443-3-2',
          name: 'IEC 62443-3-2',
          description: 'Security Risk Assessment for System Design (Zones/Conduits)',
          license: 'user-supplied',
        },
        {
          id: 'nist-800-53',
          name: 'NIST SP 800-53 Rev 5',
          description: 'Security and Privacy Controls for Information Systems',
          license: 'public-domain',
        },
        {
          id: 'nist-800-82',
          name: 'NIST SP 800-82 Rev 3',
          description: 'Guide to Operational Technology Security',
          license: 'public-domain',
        },
        {
          id: 'mitre-ics',
          name: 'MITRE ATT&CK for ICS',
          description: 'Adversary tactics and techniques for industrial control systems',
          license: 'Apache-2.0',
        },
      ],
      tools: [
        'about',
        'list_sources',
        'check_data_freshness',
        'list_ot_standards',
        'search_ot_requirements',
        'get_ot_requirement',
        'get_mitre_ics_technique',
        'map_security_level_requirements',
        'get_zone_conduit_guidance',
        'get_requirement_rationale',
      ],
      _meta: this.responseMeta('about'),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(aboutData, null, 2),
        },
      ],
    };
  }

  /**
   * Handle list_sources tool - returns data source provenance information
   */
  private async handleListSources() {
    const sourcesData = {
      sources: [
        {
          id: 'iec62443',
          name: 'IEC 62443 Series',
          publisher: 'ISA / IEC',
          license: 'Proprietary — user-supplied licensed data required',
          parts: ['IEC 62443-3-3', 'IEC 62443-4-2', 'IEC 62443-3-2'],
          update_mechanism: 'manual',
          update_instructions:
            'Purchase from ISA (isa.org) or IEC (webstore.iec.ch), extract to JSON, run npm run ingest:iec62443',
          canonical_url:
            'https://www.isa.org/standards-and-publications/isa-iec-62443-series-of-standards',
        },
        {
          id: 'nist-800-53',
          name: 'NIST SP 800-53 Rev 5',
          publisher: 'National Institute of Standards and Technology (NIST)',
          license: 'Public domain (US Government work)',
          update_mechanism: 'automated',
          update_schedule: 'daily GitHub Actions check',
          data_format: 'OSCAL JSON',
          canonical_url: 'https://github.com/usnistgov/oscal-content',
        },
        {
          id: 'nist-800-82',
          name: 'NIST SP 800-82 Rev 3',
          publisher: 'National Institute of Standards and Technology (NIST)',
          license: 'Public domain (US Government work)',
          update_mechanism: 'manual',
          update_schedule: 'curated — checked when new revision published',
          canonical_url: 'https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final',
        },
        {
          id: 'mitre-ics',
          name: 'MITRE ATT&CK for ICS',
          publisher: 'The MITRE Corporation',
          license: 'Apache-2.0',
          update_mechanism: 'automated',
          update_schedule: 'daily GitHub Actions check',
          data_format: 'STIX 2.0 JSON',
          canonical_url: 'https://github.com/mitre-attack/attack-stix-data',
        },
      ],
      _meta: this.responseMeta('list_sources'),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(sourcesData, null, 2),
        },
      ],
    };
  }

  /**
   * Handle check_data_freshness tool - returns freshness status of each data source
   */
  private async handleCheckDataFreshness() {
    // Query the database for standard metadata including last ingested timestamps
    let standards: any[] = [];
    try {
      standards = await this.db.query<any>(
        `SELECT id, name, version, last_updated, status FROM ot_standards ORDER BY name`
      );
    } catch {
      // If query fails, return static freshness info
    }

    const now = new Date().toISOString();

    const freshnessData = {
      checked_at: now,
      sources:
        standards.length > 0
          ? standards.map((s: any) => ({
              id: s.id,
              name: s.name,
              version: s.version,
              last_updated: s.last_updated,
              status: s.status,
            }))
          : [
              {
                id: 'nist-800-53',
                name: 'NIST SP 800-53 Rev 5',
                update_mechanism: 'automated',
                note: 'Check GitHub Actions for latest ingestion date',
              },
              {
                id: 'mitre-ics',
                name: 'MITRE ATT&CK for ICS',
                update_mechanism: 'automated',
                note: 'Check GitHub Actions for latest ingestion date',
              },
              {
                id: 'nist-800-82',
                name: 'NIST SP 800-82 Rev 3',
                update_mechanism: 'manual',
                note: 'Manually curated — check docs/coverage.md for last update',
              },
              {
                id: 'iec62443',
                name: 'IEC 62443 Series',
                update_mechanism: 'user-supplied',
                note: 'User-supplied licensed data — check your ingestion logs',
              },
            ],
      _meta: this.responseMeta('check_data_freshness'),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(freshnessData, null, 2),
        },
      ],
    };
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  /**
   * Close the server and clean up resources
   */
  close(): void {
    this.db.close();
    // Note: Server.close() is not available in the current SDK version
    // The server will clean up when the process exits
  }

  /**
   * Get the database client (for testing purposes)
   */
  getDatabase(): DatabaseClient {
    return this.db;
  }

  /**
   * Get the MCP server instance (for testing purposes)
   */
  getServer(): Server {
    return this.server;
  }
}

// If this file is executed directly (not imported), start the server
// Use argv check with realpath fallback for npx/symlink compatibility
import { realpathSync } from 'fs';

const isDirectExecution = (() => {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    const scriptPath = realpathSync(argv1);
    const modulePath = fileURLToPath(import.meta.url);
    return scriptPath === modulePath || import.meta.url === `file://${argv1}`;
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  const server = new McpServer();

  server.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
  });
}
