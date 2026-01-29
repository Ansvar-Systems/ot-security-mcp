/**
 * Database client wrapper for better-sqlite3
 * Provides a clean interface for database operations with automatic schema initialization
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseClient {
  private db: Database.Database;

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

    // Initialize better-sqlite3
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

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
   * @returns Database.RunResult containing lastInsertRowid and changes
   */
  run(sql: string, params?: unknown[]): Database.RunResult {
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
   * Get the raw better-sqlite3 database instance for advanced operations
   */
  get database(): Database.Database {
    return this.db;
  }
}
