/**
 * Database client wrapper for @ansvar/mcp-sqlite
 * Provides a clean interface for database operations with automatic schema initialization
 */

import Database, { type RunResult } from '@ansvar/mcp-sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseClient {
  private db: InstanceType<typeof Database>;

  /**
   * Creates a new database client
   * @param dbPath - Path to the SQLite database file (default: 'data/ot-security.db')
   */
  constructor(dbPath: string = 'data/ot-security.db') {
    // Create data directory if it doesn't exist
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Initialize @ansvar/mcp-sqlite
    this.db = new Database(dbPath);

    // Enable foreign key constraints
    this.db.pragma('foreign_keys = ON');

    // Initialize schema
    this.initializeSchema();
  }

  /**
   * Initialize the database schema by reading and executing schema.sql
   */
  private initializeSchema(): void {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute the schema SQL
    this.db.exec(schema);
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   * @param sql - SQL statement
   * @param params - Parameters for the SQL statement
   * @returns RunResult containing lastInsertRowid and changes
   */
  run(sql: string, params?: unknown[]): RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(...(params || []));
  }

  /**
   * Query the database and return multiple rows
   * @param sql - SQL query
   * @param params - Parameters for the SQL query
   * @returns Array of rows
   */
  query<T = unknown>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...(params || [])) as T[];
  }

  /**
   * Query the database and return a single row
   * @param sql - SQL query
   * @param params - Parameters for the SQL query
   * @returns Single row or undefined
   */
  queryOne<T = unknown>(sql: string, params?: unknown[]): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...(params || [])) as T | undefined;
  }

  /**
   * Execute a function within a transaction
   * @param fn - Function to execute within the transaction
   * @returns The return value of the function
   */
  transaction<T>(fn: () => T): T {
    const txn = this.db.transaction(fn);
    return txn();
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get the raw @ansvar/mcp-sqlite database instance for advanced operations
   */
  get database(): InstanceType<typeof Database> {
    return this.db;
  }
}
