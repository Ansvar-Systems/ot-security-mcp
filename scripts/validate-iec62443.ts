#!/usr/bin/env node

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export class Iec62443Validator {
  private ajv: any;
  private schema: any;

  constructor() {
    this.ajv = new (Ajv as any)({ allErrors: true, strict: true });
    (addFormats as any)(this.ajv);

    // Load schema
    const schemaPath = resolve('schemas/iec62443-schema.json');
    this.schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    this.ajv.compile(this.schema);
  }

  /**
   * Validate IEC 62443 JSON data against schema
   */
  validate(data: any): void {
    const validate = this.ajv.compile(this.schema);
    const valid = validate(data);

    if (!valid) {
      const errors = validate.errors || [];
      const errorMsg = errors.map((err: any) => `${err.instancePath}: ${err.message}`).join('; ');
      throw new Error(`Validation failed: ${errorMsg}`);
    }
  }

  /**
   * Validate a file
   */
  validateFile(filePath: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    this.validate(data);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: validate-iec62443 <json-file>');
    process.exit(1);
  }

  try {
    const validator = new Iec62443Validator();
    validator.validateFile(filePath);
    console.log(`✅ Validation successful: ${filePath}`);
    process.exit(0);
  } catch (error: any) {
    console.error(`❌ Validation failed: ${error}`);
    process.exit(1);
  }
}
