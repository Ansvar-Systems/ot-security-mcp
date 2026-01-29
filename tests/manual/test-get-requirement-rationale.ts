/**
 * Manual test for get_requirement_rationale tool
 * Tests the tool with real database data
 */

import { DatabaseClient } from '../../src/database/client.js';
import { getRequirementRationale } from '../../src/tools/get-requirement-rationale.js';

async function testGetRequirementRationale() {
  console.log('Testing get_requirement_rationale tool...\n');

  // Use the main database
  const db = new DatabaseClient('data/ot-security.db');

  try {
    // Test 1: Get rationale for IEC 62443 SR 1.1
    console.log('Test 1: Get rationale for IEC 62443-3-3 SR 1.1');
    console.log('='.repeat(60));
    const result1 = await getRequirementRationale(db, {
      requirement_id: 'SR 1.1',
      standard: 'iec62443-3-3',
    });

    if (result1) {
      console.log(`Requirement: ${result1.requirement.requirement_id}`);
      console.log(`Title: ${result1.requirement.title}`);
      console.log(`Standard: ${result1.standard.name} ${result1.standard.version}`);
      console.log(`\nRationale:`);
      console.log(result1.rationale || '(No rationale available)');
      console.log(`\nSecurity Levels: ${result1.security_levels.length}`);
      result1.security_levels.forEach((sl) => {
        console.log(`  - SL-${sl.security_level} (${sl.sl_type})`);
      });
      console.log(`\nRegulatory Context: ${result1.regulatory_context.length} sectors`);
      result1.regulatory_context.forEach((rc) => {
        console.log(`  - ${rc.sector} (${rc.jurisdiction}): ${rc.applicability}`);
        if (rc.regulatory_driver) {
          console.log(`    Driver: ${rc.regulatory_driver}`);
        }
      });
      console.log(`\nRelated Standards: ${result1.related_standards.length}`);
      result1.related_standards.forEach((rs) => {
        console.log(
          `  - ${rs.standard}:${rs.requirement_id} (${rs.mapping_type}, confidence: ${rs.confidence})`
        );
      });
    } else {
      console.log('Requirement not found');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Get rationale for NIST 800-53 AC-2
    console.log('Test 2: Get rationale for NIST 800-53 AC-2');
    console.log('='.repeat(60));
    const result2 = await getRequirementRationale(db, {
      requirement_id: 'AC-2',
      standard: 'nist-800-53',
    });

    if (result2) {
      console.log(`Requirement: ${result2.requirement.requirement_id}`);
      console.log(`Title: ${result2.requirement.title}`);
      console.log(`Standard: ${result2.standard.name} ${result2.standard.version}`);
      console.log(`\nRationale:`);
      console.log(result2.rationale || '(No rationale available)');
      console.log(`\nSecurity Levels: ${result2.security_levels.length}`);
      console.log(`Regulatory Context: ${result2.regulatory_context.length} sectors`);
      result2.regulatory_context.forEach((rc) => {
        console.log(`  - ${rc.sector} (${rc.jurisdiction}): ${rc.applicability}`);
      });
      console.log(`\nRelated Standards: ${result2.related_standards.length}`);
      result2.related_standards.slice(0, 5).forEach((rs) => {
        console.log(`  - ${rs.standard}:${rs.requirement_id} (${rs.mapping_type})`);
      });
      if (result2.related_standards.length > 5) {
        console.log(`  ... and ${result2.related_standards.length - 5} more`);
      }
    } else {
      console.log('Requirement not found');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Test not found case
    console.log('Test 3: Get rationale for non-existent requirement');
    console.log('='.repeat(60));
    const result3 = await getRequirementRationale(db, {
      requirement_id: 'NONEXISTENT',
      standard: 'fake-standard',
    });

    if (result3) {
      console.log('Unexpected: Found requirement');
    } else {
      console.log('Correctly returned null for non-existent requirement');
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    db.close();
  }
}

// Run the tests
testGetRequirementRationale();
