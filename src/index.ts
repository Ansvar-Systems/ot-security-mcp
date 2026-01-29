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
            return this.handleListStandards(args);

          case 'get_mitre_ics_technique':
            return this.handleGetMitreTechnique(args);

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
   * @param _args - Tool arguments (unused in stub)
   */
  private async handleSearchRequirements(_args: unknown) {
    // Stub implementation - will be implemented in Task 6
    return {
      content: [
        {
          type: 'text',
          text: 'Not implemented yet - search_ot_requirements will be implemented in Task 6',
        },
      ],
    };
  }

  /**
   * Handle get_ot_requirement tool
   * @param _args - Tool arguments (unused in stub)
   */
  private async handleGetRequirement(_args: unknown) {
    // Stub implementation - will be implemented in Task 7
    return {
      content: [
        {
          type: 'text',
          text: 'Not implemented yet - get_ot_requirement will be implemented in Task 7',
        },
      ],
    };
  }

  /**
   * Handle list_ot_standards tool
   * @param _args - Tool arguments (unused in stub)
   */
  private async handleListStandards(_args: unknown) {
    // Stub implementation - will be implemented in Task 8
    return {
      content: [
        {
          type: 'text',
          text: 'Not implemented yet - list_ot_standards will be implemented in Task 8',
        },
      ],
    };
  }

  /**
   * Handle get_mitre_ics_technique tool
   * @param _args - Tool arguments (unused in stub)
   */
  private async handleGetMitreTechnique(_args: unknown) {
    // Stub implementation - will be implemented in Task 8
    return {
      content: [
        {
          type: 'text',
          text: 'Not implemented yet - get_mitre_ics_technique will be implemented in Task 8',
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
