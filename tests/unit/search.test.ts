/**
 * Unit tests for search_ot_requirements tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../src/database/client.js';
import { searchRequirements } from '../../src/tools/search.js';
import { createTestDbPath, cleanupTestDb } from '../helpers/test-db.js';

describe('searchRequirements', () => {
  let db: DatabaseClient;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = createTestDbPath('search');
    // Create database client
    db = new DatabaseClient(testDbPath);
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      db.close();
    }
    // Clean up test database
    await cleanupTestDb(testDbPath);
  });

  describe('Empty Database', () => {
    it('should return empty array when no requirements exist', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      expect(result).toEqual([]);
    });

    it('should return empty array when query is empty string', async () => {
      const result = await searchRequirements(db, { query: '' });
      expect(result).toEqual([]);
    });

    it('should handle special SQL characters safely', async () => {
      // SQL injection attempt should be handled safely
      const result = await searchRequirements(db, {
        query: "'; DROP TABLE ot_requirements; --",
      });
      expect(result).toEqual([]);

      // Table should still exist
      const tables = db.query<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='ot_requirements'`
      );
      expect(tables).toHaveLength(1);
    });
  });

  describe('Search with Data', () => {
    beforeEach(() => {
      // Insert test standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      // Insert test requirements
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'Human user identification',
          'The control system shall provide the capability to identify and authenticate all human users.',
          'Authentication is essential to ensure only authorized users can access the control system.',
          'host',
          3,
        ]
      );

      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.2',
          'Software process identification',
          'The control system shall provide the capability to identify and authenticate all software processes.',
          'Process authentication prevents unauthorized software execution.',
          'application',
          2,
        ]
      );

      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 2.1',
          'Network segmentation',
          'The control system shall implement network segmentation between security zones.',
          'Segmentation limits the impact of security incidents.',
          'network',
          1,
        ]
      );
    });

    it('should return matching requirements when query matches title', async () => {
      const result = await searchRequirements(db, { query: 'identification' });
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.requirement_id === 'SR 1.1')).toBe(true);
      expect(result.some((r) => r.requirement_id === 'SR 1.2')).toBe(true);
    });

    it('should return matching requirements when query matches description', async () => {
      const result = await searchRequirements(db, { query: 'software processes' });
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.requirement_id === 'SR 1.2')).toBe(true);
    });

    it('should return matching requirements when query matches rationale', async () => {
      const result = await searchRequirements(db, { query: 'authorized users' });
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.requirement_id === 'SR 1.1')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const result = await searchRequirements(db, { query: 'AUTHENTICATION' });
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.requirement_id === 'SR 1.1')).toBe(true);
    });

    it('should filter by component_type', async () => {
      const result = await searchRequirements(db, {
        query: 'identification',
        options: { component_type: 'host' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.requirement_id).toBe('SR 1.1');
      expect(result[0]?.component_type).toBe('host');
    });

    it('should filter by standards array', async () => {
      // Insert another standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['nist-800-82', 'NIST SP 800-82', 'r3', 'current']
      );

      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'nist-800-82',
          'AC-1',
          'Access Control Policy',
          'Develop and document access control policies.',
          'host',
        ]
      );

      const result = await searchRequirements(db, {
        query: 'access',
        options: { standards: ['nist-800-82'] },
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((r) => r.standard_id === 'nist-800-82')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await searchRequirements(db, {
        query: 'control system',
        options: { limit: 1 },
      });
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should use default limit when not specified', async () => {
      const result = await searchRequirements(db, { query: 'control' });
      // Default limit should be 10 as per design doc
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should return all OTRequirement fields', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      expect(result.length).toBeGreaterThan(0);

      const req = result[0]!;
      expect(req).toHaveProperty('id');
      expect(req).toHaveProperty('standard_id');
      expect(req).toHaveProperty('requirement_id');
      expect(req).toHaveProperty('parent_requirement_id');
      expect(req).toHaveProperty('title');
      expect(req).toHaveProperty('description');
      expect(req).toHaveProperty('rationale');
      expect(req).toHaveProperty('component_type');
      expect(req).toHaveProperty('purdue_level');
    });
  });

  describe('Security Level Filtering', () => {
    beforeEach(() => {
      // Insert test standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      // Insert requirements with different security levels
      const req1Result = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.1', 'Authentication', 'User authentication requirement', 'host']
      );

      const req2Result = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        ['iec62443-3-3', 'SR 1.2', 'Authorization', 'User authorization requirement', 'host']
      );

      // Add security levels
      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
         VALUES (?, ?, ?)`,
        [req1Result.lastInsertRowid, 2, 'SL-T']
      );

      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
         VALUES (?, ?, ?)`,
        [req2Result.lastInsertRowid, 3, 'SL-T']
      );
    });

    it('should filter by security_level', async () => {
      const result = await searchRequirements(db, {
        query: 'authentication',
        options: { security_level: 2 },
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.requirement_id === 'SR 1.1')).toBe(true);
      expect(result.some((r) => r.requirement_id === 'SR 1.2')).toBe(false);
    });

    it('should return multiple requirements with same security level', async () => {
      // Add another SL-2 requirement
      const req3Result = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 2.1',
          'Network authentication',
          'Network device authentication requirement',
          'network',
        ]
      );

      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
         VALUES (?, ?, ?)`,
        [req3Result.lastInsertRowid, 2, 'SL-T']
      );

      const result = await searchRequirements(db, {
        query: 'authentication',
        options: { security_level: 2 },
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(
        result.every((r) => {
          // Verify each result has a security level of 2
          const sl = db.queryOne<{ security_level: number }>(
            `SELECT sl.security_level
           FROM security_levels sl
           WHERE sl.requirement_db_id = ?`,
            [r.id]
          );
          return sl?.security_level === 2;
        })
      ).toBe(true);
    });
  });

  describe('Combined Filters', () => {
    beforeEach(() => {
      // Insert test standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      const req1Result = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'Host authentication',
          'Host-based authentication requirement',
          'host',
        ]
      );

      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
         VALUES (?, ?, ?)`,
        [req1Result.lastInsertRowid, 2, 'SL-T']
      );

      const req2Result = db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, component_type)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.2',
          'Network authentication',
          'Network-based authentication requirement',
          'network',
        ]
      );

      db.run(
        `INSERT INTO security_levels (requirement_db_id, security_level, sl_type)
         VALUES (?, ?, ?)`,
        [req2Result.lastInsertRowid, 2, 'SL-T']
      );
    });

    it('should apply multiple filters together', async () => {
      const result = await searchRequirements(db, {
        query: 'authentication',
        options: {
          standards: ['iec62443-3-3'],
          security_level: 2,
          component_type: 'host',
          limit: 5,
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.requirement_id).toBe('SR 1.1');
      expect(result[0]?.component_type).toBe('host');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid component_type gracefully', async () => {
      const result = await searchRequirements(db, {
        query: 'authentication',
        options: { component_type: 'invalid' as any },
      });

      // Should return empty array since no requirements match
      expect(result).toEqual([]);
    });

    it('should handle invalid security_level gracefully', async () => {
      const result = await searchRequirements(db, {
        query: 'authentication',
        options: { security_level: 99 as any },
      });

      // Should return empty array since no requirements match
      expect(result).toEqual([]);
    });

    it('should handle empty standards array', async () => {
      const result = await searchRequirements(db, {
        query: 'authentication',
        options: { standards: [] },
      });

      // Empty standards array should match all standards
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('RequirementSearchResult Interface', () => {
    beforeEach(() => {
      // Insert test standard
      db.run(
        `INSERT INTO ot_standards (id, name, version, status)
         VALUES (?, ?, ?, ?)`,
        ['iec62443-3-3', 'IEC 62443-3-3', 'v2.0', 'current']
      );

      // Insert test requirements with various match locations
      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.1',
          'Human user authentication',
          'The control system shall provide the capability to identify and authenticate all human users.',
          'Authentication is essential to ensure only authorized users can access the control system.',
          'host',
          3,
        ]
      );

      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 1.2',
          'Software process identification',
          'The control system shall provide authentication for all software processes and services running on the system.',
          'Process authentication prevents unauthorized software execution.',
          'application',
          2,
        ]
      );

      db.run(
        `INSERT INTO ot_requirements (standard_id, requirement_id, title, description, rationale, component_type, purdue_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'iec62443-3-3',
          'SR 2.1',
          'Network segmentation',
          'The control system shall implement network segmentation between security zones.',
          'Segmentation limits the impact of security incidents. Strong authentication mechanisms must be used between zones.',
          'network',
          1,
        ]
      );
    });

    it('should return RequirementSearchResult with snippet field', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('snippet');
      expect(typeof result[0]?.snippet).toBe('string');
      expect(result[0]?.snippet.length).toBeGreaterThan(0);
    });

    it('should return RequirementSearchResult with relevance field', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('relevance');
      expect(typeof result[0]?.relevance).toBe('number');
      expect(result[0]?.relevance).toBeGreaterThanOrEqual(0.0);
      expect(result[0]?.relevance).toBeLessThanOrEqual(1.0);
    });

    it('should return RequirementSearchResult with standard_name field', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('standard_name');
      expect(typeof result[0]?.standard_name).toBe('string');
      expect(result[0]?.standard_name).toBe('IEC 62443-3-3');
    });

    it('should extract snippet from title when match occurs in title', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      const titleMatch = result.find((r) => r.requirement_id === 'SR 1.1');
      expect(titleMatch).toBeDefined();
      expect(titleMatch?.snippet).toBe('Human user authentication');
    });

    it('should extract snippet from description with context around match', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      const descMatch = result.find((r) => r.requirement_id === 'SR 1.2');
      expect(descMatch).toBeDefined();
      expect(descMatch?.snippet).toContain('authentication');
      // Should have context around the match
      expect(descMatch?.snippet.length).toBeGreaterThan('authentication'.length);
    });

    it('should extract snippet from rationale with context around match', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      const rationaleMatch = result.find((r) => r.requirement_id === 'SR 2.1');
      expect(rationaleMatch).toBeDefined();
      expect(rationaleMatch?.snippet).toContain('authentication');
      // Should have context around the match
      expect(rationaleMatch?.snippet.length).toBeGreaterThan('authentication'.length);
    });

    it('should assign relevance score 1.0 for title match', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      const titleMatch = result.find((r) => r.requirement_id === 'SR 1.1');
      expect(titleMatch).toBeDefined();
      expect(titleMatch?.relevance).toBe(1.0);
    });

    it('should assign relevance score 0.7 for description match', async () => {
      const result = await searchRequirements(db, { query: 'processes and services' });
      const descMatch = result.find((r) => r.requirement_id === 'SR 1.2');
      expect(descMatch).toBeDefined();
      expect(descMatch?.relevance).toBe(0.7);
    });

    it('should assign relevance score 0.5 for rationale match', async () => {
      const result = await searchRequirements(db, { query: 'security incidents' });
      const rationaleMatch = result.find((r) => r.requirement_id === 'SR 2.1');
      expect(rationaleMatch).toBeDefined();
      expect(rationaleMatch?.relevance).toBe(0.5);
    });

    it('should return results ordered by relevance (descending)', async () => {
      const result = await searchRequirements(db, { query: 'authentication' });
      expect(result.length).toBeGreaterThanOrEqual(3);

      // Check that results are sorted by relevance descending
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i]!.relevance).toBeGreaterThanOrEqual(result[i + 1]!.relevance);
      }

      // First result should be the title match (SR 1.1) with relevance 1.0
      expect(result[0]?.requirement_id).toBe('SR 1.1');
      expect(result[0]?.relevance).toBe(1.0);
    });
  });
});
