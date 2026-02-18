import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';

/**
 * Creates a unique temporary database path for test isolation.
 * Each test file gets its own temp directory path to avoid WASM VFS lock conflicts.
 */
export function createTestDbPath(testName: string): string {
  const suffix = randomBytes(4).toString('hex');
  return join(tmpdir(), `ot-mcp-test-${testName}-${suffix}.sqlite`);
}

/**
 * Cleans up a test database file if it exists.
 */
export async function cleanupTestDb(dbPath: string): Promise<void> {
  for (const ext of ['', '-shm', '-wal', '-journal', '.lock']) {
    const file = dbPath + ext;
    if (existsSync(file)) {
      await unlink(file);
    }
  }
}
