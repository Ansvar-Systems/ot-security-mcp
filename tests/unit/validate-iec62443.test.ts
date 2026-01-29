import { describe, it, expect } from 'vitest';
import { Iec62443Validator } from '../../scripts/validate-iec62443.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Iec62443Validator', () => {
  const validator = new Iec62443Validator();

  describe('Part 3-3 (System Security Levels)', () => {
    it('should validate correct 3-3 structure', () => {
      const valid33 = {
        meta: {
          part: '3-3',
          title: 'IEC 62443-3-3 Security Level Requirements',
          version: 'v2.0',
          published_date: '2023-10-01',
        },
        requirements: [
          {
            requirement_id: 'SR 1.1',
            parent_requirement_id: null,
            title: 'Human user identification and authentication',
            description: 'The control system shall provide capability...',
            rationale: 'Authentication is essential to ensure...',
            component_type: 'host',
            security_levels: [
              { security_level: 2, sl_type: 'SL-T', capability_level: 1 },
              { security_level: 3, sl_type: 'SL-C', capability_level: 2 },
            ],
          },
        ],
      };

      expect(() => validator.validate(valid33)).not.toThrow();
    });

    it('should reject 3-3 with missing required fields', () => {
      const invalid = {
        meta: { part: '3-3' }, // Missing title, version
        requirements: [
          { requirement_id: 'SR 1.1' }, // Missing description
        ],
      };

      expect(() => validator.validate(invalid)).toThrow(
        /missing required field|must have required property/i
      );
    });

    it('should validate requirement enhancements (REs)', () => {
      const validRE = {
        meta: { part: '3-3', title: 'Test', version: 'v2.0', published_date: '2023-10-01' },
        requirements: [
          {
            requirement_id: 'SR 1.1',
            parent_requirement_id: null,
            title: 'Base requirement',
            description: 'Base description',
            rationale: 'Base rationale',
            component_type: 'host',
            security_levels: [{ security_level: 1, sl_type: 'SL-T', capability_level: 1 }],
          },
          {
            requirement_id: 'SR 1.1 RE 1',
            parent_requirement_id: 'SR 1.1',
            title: 'Enhancement 1',
            description: 'Enhanced capability',
            rationale: 'Provides additional security',
            component_type: 'host',
            security_levels: [{ security_level: 3, sl_type: 'SL-T', capability_level: 2 }],
          },
        ],
      };

      expect(() => validator.validate(validRE)).not.toThrow();
    });
  });

  describe('Part 4-2 (Component Requirements)', () => {
    it('should validate correct 4-2 structure', () => {
      const valid42 = {
        meta: {
          part: '4-2',
          title: 'IEC 62443-4-2 Component Security Requirements',
          version: 'v2.0',
          published_date: '2023-10-01',
        },
        requirements: [
          {
            requirement_id: 'CR 1.1',
            parent_requirement_id: null,
            title: 'Human user identification and authentication',
            description: 'The control component shall provide...',
            rationale: 'Component-level authentication...',
            component_type: 'embedded',
            security_levels: [{ security_level: 1, sl_type: 'SL-C', capability_level: 1 }],
          },
        ],
      };

      expect(() => validator.validate(valid42)).not.toThrow();
    });
  });

  describe('Part 3-2 (Zones & Conduits)', () => {
    it('should validate correct 3-2 structure', () => {
      const valid32 = {
        meta: {
          part: '3-2',
          title: 'IEC 62443-3-2 Security Risk Assessment',
          version: 'v1.0',
          published_date: '2020-06-01',
        },
        zones: [
          {
            name: 'Level 3 - SCADA DMZ',
            purdue_level: 3,
            security_level_target: 2,
            description: 'Demilitarized zone for SCADA servers',
            typical_assets: 'HMI, Historian, Engineering Workstations',
          },
        ],
        conduits: [
          {
            name: 'Firewall - Level 2 to Level 3',
            conduit_type: 'filtered_bidirectional',
            description: 'Stateful firewall with DPI',
            minimum_security_level: 2,
          },
        ],
      };

      expect(() => validator.validate(valid32)).not.toThrow();
    });
  });

  describe('Template Validation', () => {
    it('should validate 3-3 template file', () => {
      const templatePath = resolve('data/templates/iec62443-3-3-template.json');
      const content = JSON.parse(readFileSync(templatePath, 'utf-8'));
      expect(() => validator.validate(content)).not.toThrow();
    });

    it('should validate 4-2 template file', () => {
      const templatePath = resolve('data/templates/iec62443-4-2-template.json');
      const content = JSON.parse(readFileSync(templatePath, 'utf-8'));
      expect(() => validator.validate(content)).not.toThrow();
    });

    it('should validate 3-2 template file', () => {
      const templatePath = resolve('data/templates/iec62443-3-2-template.json');
      const content = JSON.parse(readFileSync(templatePath, 'utf-8'));
      expect(() => validator.validate(content)).not.toThrow();
    });
  });
});
