/**
 * Unit tests for list_ot_standards tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { listStandards } from '../../src/tools/list-standards.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('listStandards', () => {
  let db: DatabaseClient;
  const testDbPath = join(process.cwd(), 'tests/data/test-list-standards.sqlite');

  beforeEach(async () => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
    // Create database client
    db = new DatabaseClient(testDbPath);
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      db.close();
    }
    // Clean up test database
    if (existsSync(testDbPath)) {
      await unlink(testDbPath);
    }
  });

  describe('Empty Database', () => {
    it('should return empty array when no standards exist', async () => {
      const result = await listStandards(db);
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Single Standard', () => {
    beforeEach(() => {
      db.run(
        `INSERT INTO ot_standards (id, name, version, status, published_date, url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'IEC 62443-3-3',
          'v2.0',
          'current',
          '2023-01-01',
          'https://www.iec.ch/62443-3-3',
          'Security for industrial automation'
        ]
      );
    });

    it('should return single standard', async () => {
      const result = await listStandards(db);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('iec62443-3-3');
      expect(result[0].name).toBe('IEC 62443-3-3');
      expect(result[0].version).toBe('v2.0');
      expect(result[0].status).toBe('current');
    });

    it('should include all standard fields', async () => {
      const result = await listStandards(db);
      const standard = result[0];

      expect(standard).toHaveProperty('id');
      expect(standard).toHaveProperty('name');
      expect(standard).toHaveProperty('version');
      expect(standard).toHaveProperty('status');
      expect(standard).toHaveProperty('published_date');
      expect(standard).toHaveProperty('url');
      expect(standard).toHaveProperty('notes');
    });

    it('should handle null optional fields', async () => {
      // Insert standard with minimal fields
      db.run(
        `INSERT INTO ot_standards (id, name, status)
         VALUES (?, ?, ?)`,
        ['nist-csf', 'NIST CSF', 'current']
      );

      const result = await listStandards(db);
      const standard = result.find(s => s.id === 'nist-csf');

      expect(standard).toBeDefined();
      expect(standard?.id).toBe('nist-csf');
      expect(standard?.name).toBe('NIST CSF');
      expect(standard?.status).toBe('current');
      expect(standard?.version).toBeNull();
      expect(standard?.published_date).toBeNull();
      expect(standard?.url).toBeNull();
      expect(standard?.notes).toBeNull();
    });
  });

  describe('Multiple Standards', () => {
    beforeEach(() => {
      // Insert multiple standards
      db.run(
        `INSERT INTO ot_standards (id, name, version, status, published_date)
         VALUES (?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current', '2023-01-01']
      );
      db.run(
        `INSERT INTO ot_standards (id, name, version, status, published_date)
         VALUES (?, ?, ?, ?, ?)`,
        ['nist-csf', 'NIST CSF', 'v1.1', 'current', '2018-04-16']
      );
      db.run(
        `INSERT INTO ot_standards (id, name, version, status, published_date)
         VALUES (?, ?, ?, ?, ?)`,
        ['nerc-cip', 'NERC CIP', 'v6', 'superseded', '2016-01-01']
      );
      db.run(
        `INSERT INTO ot_standards (id, name, version, status, published_date)
         VALUES (?, ?, ?, ?, ?)`,
        ['api-1164', 'API 1164', 'v2021', 'current', '2021-06-01']
      );
    });

    it('should return all standards', async () => {
      const result = await listStandards(db);
      expect(result).toHaveLength(4);
    });

    it('should order standards alphabetically by name', async () => {
      const result = await listStandards(db);
      const names = result.map(s => s.name);

      expect(names).toEqual([
        'API 1164',
        'IEC 62443-3-3',
        'NERC CIP',
        'NIST CSF'
      ]);
    });

    it('should include standards with different statuses', async () => {
      const result = await listStandards(db);
      const statuses = result.map(s => s.status);

      expect(statuses).toContain('current');
      expect(statuses).toContain('superseded');
    });

    it('should return correct data types for each field', async () => {
      const result = await listStandards(db);
      const standard = result[0];

      expect(typeof standard.id).toBe('string');
      expect(typeof standard.name).toBe('string');
      expect(typeof standard.status).toBe('string');
      // Optional fields can be string or null
      expect(['string', 'object']).toContain(typeof standard.version);
      expect(['string', 'object']).toContain(typeof standard.published_date);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close the database to force an error
      db.close();

      // Should return empty array on error rather than throwing
      const result = await listStandards(db);
      expect(result).toEqual([]);
    });
  });

  describe('Status Values', () => {
    beforeEach(() => {
      db.run(
        `INSERT INTO ot_standards (id, name, status)
         VALUES (?, ?, ?)`,
        ['standard-1', 'Current Standard', 'current']
      );
      db.run(
        `INSERT INTO ot_standards (id, name, status)
         VALUES (?, ?, ?)`,
        ['standard-2', 'Draft Standard', 'draft']
      );
      db.run(
        `INSERT INTO ot_standards (id, name, status)
         VALUES (?, ?, ?)`,
        ['standard-3', 'Superseded Standard', 'superseded']
      );
    });

    it('should handle all valid status values', async () => {
      const result = await listStandards(db);
      const statuses = result.map(s => s.status);

      expect(statuses).toContain('current');
      expect(statuses).toContain('draft');
      expect(statuses).toContain('superseded');
    });
  });
});
