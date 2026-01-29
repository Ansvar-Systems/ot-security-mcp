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
import { DatabaseClient } from './database/client.js';
import { registerTools } from './tools/index.js';
import { searchRequirements } from './tools/search.js';
import { getRequirement } from './tools/get-requirement.js';
import { listStandards } from './tools/list-standards.js';
import { getMitreTechnique } from './tools/get-mitre-technique.js';
import { mapSecurityLevelRequirements } from './tools/map-security-level-requirements.js';
import { getZoneConduitGuidance } from './tools/get-zone-conduit-guidance.js';

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
    const finalDbPath = dbPath || process.env.OT_MCP_DB_PATH || 'data/ot-security.db';
    this.db = new DatabaseClient(finalDbPath);

    // Create MCP server
    this.server = new Server(
      {
        name: 'ot-security-mcp',
        version: '0.1.0',
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

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
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
      options
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(requirements, null, 2),
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
        include_mappings: include_mappings ?? true
      }
    });

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Requirement not found',
              requirement_id,
              standard
            }, null, 2)
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
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
          text: JSON.stringify(result, null, 2)
        }
      ]
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
            text: JSON.stringify({
              error: 'Invalid arguments - expected an object'
            }, null, 2)
          }
        ]
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
            text: JSON.stringify({
              error: 'technique_id parameter is required'
            }, null, 2)
          }
        ]
      };
    }

    const result = await getMitreTechnique(this.db, {
      technique_id,
      options: {
        include_mitigations,
        map_to_standards
      }
    });

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Technique not found',
              technique_id
            }, null, 2)
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
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
      include_enhancements
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(requirements, null, 2)
        }
      ]
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
      reference_architecture
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
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
if (import.meta.url === `file://${process.argv[1]}`) {
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
