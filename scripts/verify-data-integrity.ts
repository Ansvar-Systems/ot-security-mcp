#!/usr/bin/env tsx
/**
 * Data Integrity Verification Script
 *
 * Verifies database consistency and data quality:
 * - Foreign key relationships are valid
 * - No orphaned records in junction tables
 * - All mappings reference valid requirements
 * - Requirement counts match expectations
 * - Security levels are in valid range (1-4)
 * - Purdue levels are in valid range (0-5)
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Integrity issues found
 */

import { DatabaseClient } from '../src/database/client.js';
import { join } from 'path';
import { existsSync } from 'fs';

interface IntegrityIssue {
  category: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  details?: any;
}

class DataIntegrityVerifier {
  private db: DatabaseClient;
  private issues: IntegrityIssue[] = [];

  constructor(dbPath: string) {
    if (!existsSync(dbPath)) {
      throw new Error(`Database not found at ${dbPath}`);
    }
    this.db = new DatabaseClient(dbPath);
  }

  /**
   * Add an integrity issue
   */
  private addIssue(
    category: string,
    severity: 'ERROR' | 'WARNING',
    message: string,
    details?: any
  ): void {
    this.issues.push({ category, severity, message, details });
  }

  /**
   * Check 1: Verify security_levels table has valid foreign keys
   */
  private checkSecurityLevelsForeignKeys(): void {
    console.log('Checking security_levels foreign keys...');

    // Find security_levels with invalid requirement_db_id
    const orphaned = this.db.query<{ id: number; requirement_db_id: number }>(
      `SELECT sl.id, sl.requirement_db_id
       FROM security_levels sl
       LEFT JOIN ot_requirements r ON sl.requirement_db_id = r.id
       WHERE r.id IS NULL`
    );

    if (orphaned.length > 0) {
      this.addIssue(
        'security_levels',
        'ERROR',
        `Found ${orphaned.length} orphaned security_levels records with invalid requirement_db_id`,
        orphaned.slice(0, 5)
      );
    } else {
      console.log('  ✓ All security_levels have valid requirement_db_id');
    }
  }

  /**
   * Check 2: Verify security levels are in valid range (1-4)
   */
  private checkSecurityLevelRange(): void {
    console.log('Checking security_level values are in range 1-4...');

    const invalid = this.db.query<{
      id: number;
      security_level: number;
      requirement_db_id: number;
    }>(
      `SELECT id, security_level, requirement_db_id
       FROM security_levels
       WHERE security_level < 1 OR security_level > 4`
    );

    if (invalid.length > 0) {
      this.addIssue(
        'security_levels',
        'ERROR',
        `Found ${invalid.length} security_levels with invalid security_level values`,
        invalid
      );
    } else {
      console.log('  ✓ All security_levels are in valid range (1-4)');
    }
  }

  /**
   * Check 3: Verify zone_conduit_flows have valid foreign keys
   */
  private checkZoneConduitFlowsForeignKeys(): void {
    console.log('Checking zone_conduit_flows foreign keys...');

    // Check source_zone_id
    const invalidSource = this.db.query<{ id: number; source_zone_id: number }>(
      `SELECT f.id, f.source_zone_id
       FROM zone_conduit_flows f
       LEFT JOIN zones z ON f.source_zone_id = z.id
       WHERE f.source_zone_id IS NOT NULL AND z.id IS NULL`
    );

    if (invalidSource.length > 0) {
      this.addIssue(
        'zone_conduit_flows',
        'ERROR',
        `Found ${invalidSource.length} flows with invalid source_zone_id`,
        invalidSource
      );
    } else {
      console.log('  ✓ All flows have valid source_zone_id');
    }

    // Check target_zone_id
    const invalidTarget = this.db.query<{ id: number; target_zone_id: number }>(
      `SELECT f.id, f.target_zone_id
       FROM zone_conduit_flows f
       LEFT JOIN zones z ON f.target_zone_id = z.id
       WHERE f.target_zone_id IS NOT NULL AND z.id IS NULL`
    );

    if (invalidTarget.length > 0) {
      this.addIssue(
        'zone_conduit_flows',
        'ERROR',
        `Found ${invalidTarget.length} flows with invalid target_zone_id`,
        invalidTarget
      );
    } else {
      console.log('  ✓ All flows have valid target_zone_id');
    }

    // Check conduit_id
    const invalidConduit = this.db.query<{ id: number; conduit_id: number }>(
      `SELECT f.id, f.conduit_id
       FROM zone_conduit_flows f
       LEFT JOIN conduits c ON f.conduit_id = c.id
       WHERE f.conduit_id IS NOT NULL AND c.id IS NULL`
    );

    if (invalidConduit.length > 0) {
      this.addIssue(
        'zone_conduit_flows',
        'ERROR',
        `Found ${invalidConduit.length} flows with invalid conduit_id`,
        invalidConduit
      );
    } else {
      console.log('  ✓ All flows have valid conduit_id');
    }
  }

  /**
   * Check 4: Verify zones have valid Purdue levels (0-5)
   */
  private checkZonePurdueLevels(): void {
    console.log('Checking zone Purdue levels are in range 0-5...');

    const invalid = this.db.query<{ id: number; name: string; purdue_level: number }>(
      `SELECT id, name, purdue_level
       FROM zones
       WHERE purdue_level < 0 OR purdue_level > 5`
    );

    if (invalid.length > 0) {
      this.addIssue(
        'zones',
        'ERROR',
        `Found ${invalid.length} zones with invalid Purdue levels`,
        invalid
      );
    } else {
      console.log('  ✓ All zones have valid Purdue levels (0-5)');
    }
  }

  /**
   * Check 5: Verify zones have valid security level targets (1-4 or NULL)
   */
  private checkZoneSecurityLevelTargets(): void {
    console.log('Checking zone security_level_target values...');

    const invalid = this.db.query<{
      id: number;
      name: string;
      security_level_target: number;
    }>(
      `SELECT id, name, security_level_target
       FROM zones
       WHERE security_level_target IS NOT NULL
         AND (security_level_target < 1 OR security_level_target > 4)`
    );

    if (invalid.length > 0) {
      this.addIssue(
        'zones',
        'ERROR',
        `Found ${invalid.length} zones with invalid security_level_target`,
        invalid
      );
    } else {
      console.log('  ✓ All zones have valid security_level_target (1-4 or NULL)');
    }
  }

  /**
   * Check 6: Verify ot_mappings have valid source and target requirements
   *
   * Special handling for cross-standard mappings:
   * - IEC 62443 sources: requirements are user-supplied (licensed data), reported as INFO
   * - MITRE ICS sources: mitigations live in mitre_ics_mitigations, not ot_requirements
   */
  private checkMappingsForeignKeys(): void {
    console.log('Checking ot_mappings foreign keys...');

    // Check source requirements (excluding IEC and MITRE which use different tables/data)
    const invalidSource = this.db.query<{
      id: number;
      source_standard: string;
      source_requirement: string;
    }>(
      `SELECT m.id, m.source_standard, m.source_requirement
       FROM ot_mappings m
       LEFT JOIN ot_requirements r
         ON m.source_requirement = r.requirement_id
         AND m.source_standard = r.standard_id
       WHERE r.id IS NULL
         AND m.source_standard NOT LIKE 'iec62443%'
         AND m.source_standard != 'mitre-ics'`
    );

    if (invalidSource.length > 0) {
      this.addIssue(
        'ot_mappings',
        'ERROR',
        `Found ${invalidSource.length} mappings with invalid source requirements`,
        invalidSource.slice(0, 5)
      );
    } else {
      console.log('  ✓ All mappings have valid source requirements');
    }

    // Report IEC sources as informational (awaiting user data)
    const iecSources = this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ot_mappings
       WHERE source_standard LIKE 'iec62443%'`
    );
    if (iecSources && iecSources.count > 0) {
      console.log(
        `  ℹ ${iecSources.count} IEC 62443 source mappings (awaiting user-supplied data)`
      );
    }

    // Verify MITRE sources reference valid mitigations
    const invalidMitreSources = this.db.query<{
      source_requirement: string;
    }>(
      `SELECT DISTINCT m.source_requirement
       FROM ot_mappings m
       LEFT JOIN mitre_ics_mitigations mit ON m.source_requirement = mit.mitigation_id
       WHERE m.source_standard = 'mitre-ics' AND mit.mitigation_id IS NULL`
    );

    if (invalidMitreSources.length > 0) {
      this.addIssue(
        'ot_mappings',
        'ERROR',
        `Found ${invalidMitreSources.length} MITRE mappings with invalid mitigation references`,
        invalidMitreSources
      );
    } else {
      const mitreMappingCount = this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ot_mappings WHERE source_standard = 'mitre-ics'`
      );
      if (mitreMappingCount && mitreMappingCount.count > 0) {
        console.log(
          `  ✓ All ${mitreMappingCount.count} MITRE source mappings reference valid mitigations`
        );
      }
    }

    // Check target requirements
    const invalidTarget = this.db.query<{
      id: number;
      target_standard: string;
      target_requirement: string;
    }>(
      `SELECT m.id, m.target_standard, m.target_requirement
       FROM ot_mappings m
       LEFT JOIN ot_requirements r
         ON m.target_requirement = r.requirement_id
         AND m.target_standard = r.standard_id
       WHERE r.id IS NULL`
    );

    if (invalidTarget.length > 0) {
      this.addIssue(
        'ot_mappings',
        'ERROR',
        `Found ${invalidTarget.length} mappings with invalid target requirements`,
        invalidTarget.slice(0, 5)
      );
    } else {
      console.log('  ✓ All mappings have valid target requirements');
    }
  }

  /**
   * Check 7: Verify MITRE technique-mitigation relationships
   */
  private checkMitreTechniqueMitigations(): void {
    console.log('Checking MITRE technique-mitigation relationships...');

    // Check technique_id
    const invalidTechnique = this.db.query<{
      technique_id: string;
      mitigation_id: string;
    }>(
      `SELECT tm.technique_id, tm.mitigation_id
       FROM mitre_technique_mitigations tm
       LEFT JOIN mitre_ics_techniques t ON tm.technique_id = t.technique_id
       WHERE t.technique_id IS NULL`
    );

    if (invalidTechnique.length > 0) {
      this.addIssue(
        'mitre_technique_mitigations',
        'ERROR',
        `Found ${invalidTechnique.length} relationships with invalid technique_id`,
        invalidTechnique.slice(0, 5)
      );
    } else {
      console.log('  ✓ All technique-mitigation relationships have valid technique_id');
    }

    // Check mitigation_id
    const invalidMitigation = this.db.query<{
      technique_id: string;
      mitigation_id: string;
    }>(
      `SELECT tm.technique_id, tm.mitigation_id
       FROM mitre_technique_mitigations tm
       LEFT JOIN mitre_ics_mitigations m ON tm.mitigation_id = m.mitigation_id
       WHERE m.mitigation_id IS NULL`
    );

    if (invalidMitigation.length > 0) {
      this.addIssue(
        'mitre_technique_mitigations',
        'ERROR',
        `Found ${invalidMitigation.length} relationships with invalid mitigation_id`,
        invalidMitigation.slice(0, 5)
      );
    } else {
      console.log('  ✓ All technique-mitigation relationships have valid mitigation_id');
    }
  }

  /**
   * Check 8: Verify requirement counts per standard
   */
  private checkRequirementCounts(): void {
    console.log('Checking requirement counts per standard...');

    const standards = this.db.query<{ id: string; name: string }>(
      'SELECT id, name FROM ot_standards ORDER BY id'
    );

    const expectedCounts: Record<string, number> = {
      'iec62443-3-3': 2, // SR 1.1, SR 1.1 RE 1
      'iec62443-4-2': 2, // Component requirements
      'iec62443-3-2': 0, // Zones/conduits, not requirements
      'nist-800-53': 260, // Full OSCAL catalog (15 OT-relevant families)
      'nist-800-82': 16, // 800-82 Rev 3 guidance sections
      'mitre-ics': 83, // Techniques (not in ot_requirements)
    };

    for (const standard of standards) {
      if (standard.id === 'mitre-ics') {
        // MITRE ICS uses techniques table
        const techniqueCount = this.db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM mitre_ics_techniques'
        );
        if (!techniqueCount) {
          this.addIssue('requirement_counts', 'ERROR', 'Failed to query MITRE ICS technique count');
          continue;
        }
        const actualCount = techniqueCount.count;
        const expectedCount = expectedCounts[standard.id];

        if (actualCount !== expectedCount) {
          this.addIssue(
            'requirement_counts',
            'WARNING',
            `${standard.name} has ${actualCount} techniques, expected ${expectedCount}`
          );
        } else {
          console.log(`  ✓ ${standard.name}: ${actualCount} techniques`);
        }
      } else {
        const count = this.db.queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM ot_requirements WHERE standard_id = ?',
          [standard.id]
        );
        if (!count) {
          this.addIssue(
            'requirement_counts',
            'ERROR',
            `Failed to query requirement count for ${standard.name}`
          );
          continue;
        }
        const actualCount = count.count;
        const expectedCount = expectedCounts[standard.id];

        if (expectedCount !== undefined && actualCount !== expectedCount) {
          this.addIssue(
            'requirement_counts',
            'WARNING',
            `${standard.name} has ${actualCount} requirements, expected ${expectedCount}`
          );
        } else {
          console.log(`  ✓ ${standard.name}: ${actualCount} requirements`);
        }
      }
    }
  }

  /**
   * Check 9: Verify no duplicate requirements
   */
  private checkDuplicateRequirements(): void {
    console.log('Checking for duplicate requirements...');

    const duplicates = this.db.query<{
      requirement_id: string;
      standard_id: string;
      count: number;
    }>(
      `SELECT requirement_id, standard_id, COUNT(*) as count
       FROM ot_requirements
       GROUP BY requirement_id, standard_id
       HAVING count > 1`
    );

    if (duplicates.length > 0) {
      this.addIssue(
        'ot_requirements',
        'ERROR',
        `Found ${duplicates.length} duplicate requirements`,
        duplicates
      );
    } else {
      console.log('  ✓ No duplicate requirements found');
    }
  }

  /**
   * Check 10: Verify IEC 62443 requirements have security levels
   */
  private checkIecRequirementsHaveSecurityLevels(): void {
    console.log('Checking IEC 62443 requirements have security levels...');

    const missingSecurityLevels = this.db.query<{
      requirement_id: string;
      standard_id: string;
    }>(
      `SELECT r.requirement_id, r.standard_id
       FROM ot_requirements r
       LEFT JOIN security_levels sl ON r.id = sl.requirement_db_id
       WHERE r.standard_id LIKE 'iec62443%'
       GROUP BY r.id
       HAVING COUNT(sl.id) = 0`
    );

    if (missingSecurityLevels.length > 0) {
      this.addIssue(
        'security_levels',
        'WARNING',
        `Found ${missingSecurityLevels.length} IEC 62443 requirements without security levels`,
        missingSecurityLevels
      );
    } else {
      console.log('  ✓ All IEC 62443 requirements have security levels');
    }
  }

  /**
   * Run all integrity checks
   */
  public async verify(): Promise<boolean> {
    console.log('=== OT Security MCP Data Integrity Verification ===\n');

    try {
      // Run all checks
      this.checkSecurityLevelsForeignKeys();
      this.checkSecurityLevelRange();
      this.checkZoneConduitFlowsForeignKeys();
      this.checkZonePurdueLevels();
      this.checkZoneSecurityLevelTargets();
      this.checkMappingsForeignKeys();
      this.checkMitreTechniqueMitigations();
      this.checkRequirementCounts();
      this.checkDuplicateRequirements();
      this.checkIecRequirementsHaveSecurityLevels();

      // Report results
      console.log('\n=== Verification Results ===');

      const errors = this.issues.filter((i) => i.severity === 'ERROR');
      const warnings = this.issues.filter((i) => i.severity === 'WARNING');

      if (errors.length === 0 && warnings.length === 0) {
        console.log('\n✓ All integrity checks passed!');
        return true;
      }

      if (errors.length > 0) {
        console.error(`\n❌ Found ${errors.length} ERROR(S):`);
        errors.forEach((issue) => {
          console.error(`  [${issue.category}] ${issue.message}`);
          if (issue.details) {
            console.error(`    Details:`, JSON.stringify(issue.details, null, 2));
          }
        });
      }

      if (warnings.length > 0) {
        console.warn(`\n⚠️  Found ${warnings.length} WARNING(S):`);
        warnings.forEach((issue) => {
          console.warn(`  [${issue.category}] ${issue.message}`);
          if (issue.details) {
            console.warn(`    Details:`, JSON.stringify(issue.details, null, 2));
          }
        });
      }

      return errors.length === 0;
    } finally {
      this.db.close();
    }
  }
}

// Main execution
async function main() {
  const dbPath = join(process.cwd(), 'data/ot-security.db');

  try {
    const verifier = new DataIntegrityVerifier(dbPath);
    const passed = await verifier.verify();

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  }
}

main();
