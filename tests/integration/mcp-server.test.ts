/**
 * Integration tests for MCP server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '../../src/index.js';
import { registerTools } from '../../src/tools/index.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('McpServer', () => {
  let server: McpServer;
  const testDbPath = join(process.cwd(), 'tests/data/mcp-test-db.sqlite');

  beforeEach(async () => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
    // Create server instance with test database
    server = new McpServer(testDbPath);
  });

  afterEach(async () => {
    // Close server and clean up
    if (server) {
      server.close();
    }
    // Clean up test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
  });

  describe('Server Initialization', () => {
    it('should initialize with correct capabilities', () => {
      const mcpServer = server.getServer();
      expect(mcpServer).toBeDefined();
    });

    it('should initialize database client', () => {
      const db = server.getDatabase();
      expect(db).toBeDefined();

      // Verify database has required tables
      const tables = db.query<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
      );
      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('ot_standards');
      expect(tableNames).toContain('ot_requirements');
      expect(tableNames).toContain('mitre_ics_techniques');
    });

    it('should respect OT_MCP_DB_PATH environment variable', async () => {
      const customPath = 'tests/data/custom-db.sqlite';
      process.env.OT_MCP_DB_PATH = customPath;

      const customServer = new McpServer();
      const db = customServer.getDatabase();

      expect(db).toBeDefined();

      // Clean up
      customServer.close();
      delete process.env.OT_MCP_DB_PATH;
      if (existsSync(customPath)) {
        await unlink(customPath);
      }
    });

    it('should be instantiable and closeable', () => {
      expect(server).toBeDefined();
      expect(() => server.close()).not.toThrow();
    });
  });

  describe('Tool Registry', () => {
    it('should return 6 tools (Stage 1 + Stage 2)', () => {
      const tools = registerTools();

      expect(tools).toBeDefined();
      expect(tools).toHaveLength(6);

      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('search_ot_requirements');
      expect(toolNames).toContain('get_ot_requirement');
      expect(toolNames).toContain('list_ot_standards');
      expect(toolNames).toContain('get_mitre_ics_technique');
      expect(toolNames).toContain('map_security_level_requirements');
      expect(toolNames).toContain('get_zone_conduit_guidance');
    });

    it('should have valid JSON schemas for all tools', () => {
      const tools = registerTools();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(tool.inputSchema.required).toBeDefined();
      });
    });

    it('should have correct required parameters for search_ot_requirements', () => {
      const tools = registerTools();
      const searchTool = tools.find(t => t.name === 'search_ot_requirements');

      expect(searchTool).toBeDefined();
      expect(searchTool?.inputSchema.required).toContain('query');
      expect(searchTool?.inputSchema.properties?.query).toBeDefined();
      expect(searchTool?.inputSchema.properties?.standards).toBeDefined();
      expect(searchTool?.inputSchema.properties?.security_level).toBeDefined();
      expect(searchTool?.inputSchema.properties?.component_type).toBeDefined();
      expect(searchTool?.inputSchema.properties?.limit).toBeDefined();
    });

    it('should have correct required parameters for get_ot_requirement', () => {
      const tools = registerTools();
      const getTool = tools.find(t => t.name === 'get_ot_requirement');

      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain('requirement_id');
      expect(getTool?.inputSchema.required).toContain('standard');
      expect(getTool?.inputSchema.properties?.requirement_id).toBeDefined();
      expect(getTool?.inputSchema.properties?.standard).toBeDefined();
      expect(getTool?.inputSchema.properties?.version).toBeDefined();
      expect(getTool?.inputSchema.properties?.include_mappings).toBeDefined();
    });

    it('should have no required parameters for list_ot_standards', () => {
      const tools = registerTools();
      const listTool = tools.find(t => t.name === 'list_ot_standards');

      expect(listTool).toBeDefined();
      expect(listTool?.inputSchema.required).toHaveLength(0);
    });

    it('should have correct required parameters for get_mitre_ics_technique', () => {
      const tools = registerTools();
      const mitreTool = tools.find(t => t.name === 'get_mitre_ics_technique');

      expect(mitreTool).toBeDefined();
      expect(mitreTool?.inputSchema.required).toContain('technique_id');
      expect(mitreTool?.inputSchema.properties?.technique_id).toBeDefined();
      expect(mitreTool?.inputSchema.properties?.include_mitigations).toBeDefined();
      expect(mitreTool?.inputSchema.properties?.map_to_standards).toBeDefined();
    });

    it('should have valid descriptions for all tools', () => {
      const tools = registerTools();

      expect(tools[0]?.description).toContain('Search for OT security requirements');
      expect(tools[1]?.description).toContain('Get detailed information about a specific OT requirement');
      expect(tools[2]?.description).toContain('List all available OT security standards');
      expect(tools[3]?.description).toContain('Get detailed information about a MITRE ATT&CK for ICS technique');
    });

    it('should have correct schema types for security_level parameter', () => {
      const tools = registerTools();
      const searchTool = tools.find(t => t.name === 'search_ot_requirements');

      const securityLevelProp = searchTool?.inputSchema.properties?.security_level as any;
      expect(securityLevelProp?.type).toBe('number');
      expect(securityLevelProp?.minimum).toBe(1);
      expect(securityLevelProp?.maximum).toBe(4);
    });

    it('should have correct schema types for component_type parameter', () => {
      const tools = registerTools();
      const searchTool = tools.find(t => t.name === 'search_ot_requirements');

      const componentTypeProp = searchTool?.inputSchema.properties?.component_type as any;
      expect(componentTypeProp?.type).toBe('string');
      expect(componentTypeProp?.enum).toEqual(['host', 'network', 'embedded', 'application']);
    });
  });
});
