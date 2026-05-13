#!/usr/bin/env node
/**
 * ot-security-mcp — HTTP transport for Docker deployment.
 *
 * Re-uses the McpServer class but connects via StreamableHTTPServerTransport
 * instead of StdioServerTransport.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

const SERVER_NAME = 'ot-security-mcp';
const SERVER_VERSION = '0.4.0';
const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_PATH = process.env.OT_MCP_DB_PATH || join(packageRoot, 'data', 'ot-security.db');

async function main() {
  // Create a "template" McpServer instance for health checks / DB validation
  const templateInstance = new McpServer(DB_PATH);
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  function createSessionServer(): Server {
    // Each session gets its own McpServer (which registers tools + handlers)
    const instance = new McpServer(DB_PATH);
    return instance.getServer();
  }

  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (url.pathname === '/health' && req.method === 'GET') {
        let dbOk = false;
        try {
          templateInstance.getDatabase().query('SELECT 1');
          dbOk = true;
        } catch {}
        res.writeHead(dbOk ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: dbOk ? 'ok' : 'degraded',
            server: SERVER_NAME,
            version: SERVER_VERSION,
          })
        );
        return;
      }

      if (url.pathname === '/mcp') {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (sessionId && sessions.has(sessionId)) {
          await sessions.get(sessionId)!.handleRequest(req, res);
          return;
        }
        if (req.method === 'POST') {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
          });
          const server = createSessionServer();
          await server.connect(transport);
          transport.onclose = () => {
            if (transport.sessionId) sessions.delete(transport.sessionId);
          };
          await transport.handleRequest(req, res);
          if (transport.sessionId) sessions.set(transport.sessionId, transport);
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      console.error('[HTTP] Unhandled error:', error);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`${SERVER_NAME} v${SERVER_VERSION} HTTP server on port ${PORT}`);
  });

  const shutdown = () => {
    for (const [, t] of sessions) t.close().catch(() => {});
    sessions.clear();
    try {
      templateInstance.close();
    } catch {}
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
