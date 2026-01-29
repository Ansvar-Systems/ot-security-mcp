/**
 * Get zone and conduit guidance for IEC 62443 network segmentation
 */

import { DatabaseClient } from '../database/client.js';

export interface GetZoneConduitGuidanceOptions {
  purdue_level?: number;
  security_level_target?: number;
  reference_architecture?: string;
}

export interface Zone {
  id: number;
  name: string;
  purdue_level: number;
  security_level_target: number;
  description: string;
  iec_reference: string;
  typical_assets: string;
}

export interface Conduit {
  id: number;
  name: string;
  conduit_type: string;
  security_requirements: string;
  description: string;
  iec_reference: string;
  minimum_security_level: number;
}

export interface ZoneConduitFlow {
  id: number;
  source_zone_id: number;
  source_zone_name: string;
  target_zone_id: number;
  target_zone_name: string;
  conduit_id: number;
  conduit_name: string;
  data_flow_description: string;
  security_level_requirement: number;
  bidirectional: boolean;
}

export interface ZoneConduitGuidance {
  zones: Zone[];
  conduits: Conduit[];
  flows: ZoneConduitFlow[];
  reference_architecture?: string;
  guidance: string;
}

/**
 * Get zone and conduit guidance for network segmentation
 * @param db - Database client instance
 * @param options - Query options for filtering zones and conduits
 * @returns Zone and conduit guidance with network segmentation information
 */
export async function getZoneConduitGuidance(
  db: DatabaseClient,
  options: GetZoneConduitGuidanceOptions = {}
): Promise<ZoneConduitGuidance> {
  const { purdue_level, security_level_target, reference_architecture } = options;

  // Build zone query with optional filters
  let zoneQuery = `SELECT * FROM zones WHERE 1=1`;
  const zoneParams: any[] = [];

  if (purdue_level !== undefined) {
    zoneQuery += ` AND purdue_level = ?`;
    zoneParams.push(purdue_level);
  }

  if (security_level_target !== undefined) {
    zoneQuery += ` AND security_level_target = ?`;
    zoneParams.push(security_level_target);
  }

  if (reference_architecture) {
    zoneQuery += ` AND iec_reference LIKE ?`;
    zoneParams.push(`%${reference_architecture}%`);
  }

  zoneQuery += ` ORDER BY purdue_level, name`;

  const zones = db.query<Zone>(zoneQuery, zoneParams);

  // Get all conduits (no filtering needed for conduits themselves)
  const conduits = db.query<Conduit>(
    `SELECT * FROM conduits ORDER BY minimum_security_level, name`,
    []
  );

  // Get flows - optionally filtered by zones if we have zone filters
  let flows: ZoneConduitFlow[] = [];

  // Only query flows if we have zones to show
  if (zones.length > 0 || zoneParams.length === 0) {
    let flowQuery = `
      SELECT
        f.id,
        f.source_zone_id,
        sz.name as source_zone_name,
        f.target_zone_id,
        tz.name as target_zone_name,
        f.conduit_id,
        c.name as conduit_name,
        f.data_flow_description,
        f.security_level_requirement,
        f.bidirectional
      FROM zone_conduit_flows f
      JOIN zones sz ON f.source_zone_id = sz.id
      JOIN zones tz ON f.target_zone_id = tz.id
      JOIN conduits c ON f.conduit_id = c.id
    `;

    const flowParams: any[] = [];

    // If we're filtering zones, only show flows between those zones
    if (zoneParams.length > 0 && zones.length > 0) {
      const zoneIds = zones.map(z => z.id);
      const placeholders = zoneIds.map(() => '?').join(',');
      flowQuery += ` WHERE f.source_zone_id IN (${placeholders}) OR f.target_zone_id IN (${placeholders})`;
      flowParams.push(...zoneIds, ...zoneIds);
    }

    flowQuery += ` ORDER BY f.source_zone_id, f.target_zone_id`;

    flows = db.query<ZoneConduitFlow>(flowQuery, flowParams);
  }

  // Generate practical guidance
  const guidance = generateGuidance(zones, conduits, flows, options);

  return {
    zones,
    conduits,
    flows,
    reference_architecture: reference_architecture || 'IEC 62443-3-2 Purdue Model',
    guidance
  };
}

/**
 * Generate practical guidance text based on the query results
 */
function generateGuidance(
  zones: Zone[],
  conduits: Conduit[],
  flows: ZoneConduitFlow[],
  options: GetZoneConduitGuidanceOptions
): string {
  const parts: string[] = [];

  // Overall summary
  parts.push(`# IEC 62443 Network Segmentation Guidance\n`);

  if (options.purdue_level !== undefined) {
    parts.push(`## Purdue Level ${options.purdue_level} Zones`);
  } else if (options.security_level_target !== undefined) {
    parts.push(`## Security Level ${options.security_level_target} Target Zones`);
  } else {
    parts.push(`## All Network Zones`);
  }

  parts.push(`\nFound ${zones.length} zone(s), ${conduits.length} conduit type(s), and ${flows.length} flow(s).\n`);

  // Zone-specific guidance
  if (zones.length > 0) {
    parts.push(`### Zone Security Considerations:`);
    for (const zone of zones) {
      parts.push(`\n**${zone.name}** (Purdue Level ${zone.purdue_level}, Target SL-${zone.security_level_target}):`);
      parts.push(`- ${zone.description}`);
      parts.push(`- Typical assets: ${zone.typical_assets}`);
    }
    parts.push('');
  }

  // Conduit guidance
  if (conduits.length > 0) {
    parts.push(`### Conduit Types and Requirements:`);
    for (const conduit of conduits) {
      parts.push(`\n**${conduit.name}** (Min SL-${conduit.minimum_security_level}):`);
      parts.push(`- Type: ${conduit.conduit_type}`);
      parts.push(`- ${conduit.description}`);
      if (conduit.security_requirements) {
        parts.push(`- Security requirements: ${conduit.security_requirements}`);
      }
    }
    parts.push('');
  }

  // Flow guidance
  if (flows.length > 0) {
    parts.push(`### Data Flows:`);
    for (const flow of flows) {
      const direction = flow.bidirectional ? '<->' : '->';
      parts.push(`\n**${flow.source_zone_name} ${direction} ${flow.target_zone_name}** via ${flow.conduit_name}:`);
      parts.push(`- ${flow.data_flow_description}`);
      parts.push(`- Required SL-${flow.security_level_requirement}`);
    }
    parts.push('');
  }

  // Best practices
  parts.push(`### Best Practices:`);
  parts.push(`- Implement defense-in-depth with multiple security layers`);
  parts.push(`- Use firewalls and access controls at zone boundaries`);
  parts.push(`- Monitor all cross-zone traffic for anomalies`);
  parts.push(`- Apply least privilege principle for all communications`);
  parts.push(`- Consider unidirectional data flows for critical protection`);

  return parts.join('\n');
}
