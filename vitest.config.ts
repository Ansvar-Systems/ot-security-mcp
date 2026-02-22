import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // node-sqlite3-wasm needs process isolation between test files to avoid
    // WASM VFS lock state leaking via the singleton DB pattern.
    pool: 'forks',
    maxForks: 1,
    minForks: 1,
    // Ensure test files run sequentially (not in parallel) to prevent
    // SQLite "database is locked" errors from concurrent file access.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        'scripts/',
      ],
    },
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules/', 'dist/'],
  },
});
