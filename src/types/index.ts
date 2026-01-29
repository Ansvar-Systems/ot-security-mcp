/**
 * TypeScript Type Definitions for OT Security MCP Server
 *
 * This file contains comprehensive type definitions for:
 * - Domain types (database table rows)
 * - Tool parameter types (MCP tool options)
 * - Tool result types (MCP tool responses)
 *
 * All types match the database schema exactly (see src/database/schema.sql)
 */

// =============================================================================
// Domain Types (Database Tables)
// =============================================================================

/**
 * OT Standards registry with version tracking
 * Table: ot_standards
 */
export interface OTStandard {
  /** Primary key identifier (e.g., "iec62443-3-3", "nist80082") */
  id: string;
  /** Full name of the standard */
  name: string;
  /** Version string (e.g., "v2.0", "r3") */
  version: string | null;
  /** Publication date (ISO 8601 string) */
  published_date: string | null;
  /** Official URL for the standard */
  url: string | null;
  /** Standard status */
  status: 'current' | 'superseded' | null;
  /** Additional notes about the standard */
  notes: string | null;
}

/**
 * Requirements/controls with granular metadata
 * Table: ot_requirements
 */
export interface OTRequirement {
  /** Auto-incremented database ID */
  id: number;
  /** Foreign key to ot_standards.id */
  standard_id: string;
  /** Requirement identifier within the standard (e.g., "SR 1.1", "SR 1.1 RE 1") */
  requirement_id: string;
  /** Parent requirement ID for enhancements (REs linking to base SR) */
  parent_requirement_id: string | null;
  /** Short title of the requirement */
  title: string | null;
  /** Full description of the requirement */
  description: string | null;
  /** Rationale explaining why the requirement exists */
  rationale: string | null;
  /** Component type this requirement applies to */
  component_type: 'host' | 'network' | 'embedded' | 'application' | null;
  /** Purdue Model level (0-5, nullable) */
  purdue_level: number | null;
}

/**
 * IEC 62443 security level mappings
 * Table: security_levels
 */
export interface SecurityLevel {
  /** Auto-incremented database ID */
  id: number;
  /** Foreign key to ot_requirements.id */
  requirement_db_id: number;
  /** Security level (1-4) */
  security_level: 1 | 2 | 3 | 4;
  /** Security level type */
  sl_type: 'SL-T' | 'SL-C' | 'SL-A' | null;
  /** Capability level for the security level */
  capability_level: number | null;
  /** Additional notes about the security level mapping */
  notes: string | null;
}

/**
 * Cross-standard mappings (the moat)
 * Table: ot_mappings
 */
export interface OTMapping {
  /** Auto-incremented database ID */
  id: number;
  /** Source standard identifier */
  source_standard: string;
  /** Source requirement identifier */
  source_requirement: string;
  /** Target standard identifier */
  target_standard: string;
  /** Target requirement identifier */
  target_requirement: string;
  /** Type of mapping relationship */
  mapping_type: 'exact_match' | 'partial' | 'related' | 'supersedes' | 'broader' | 'narrower';
  /** Confidence score (0.0-1.0) */
  confidence: number | null;
  /** Additional notes about the mapping */
  notes: string | null;
  /** Creation timestamp (ISO 8601 string) */
  created_date: string;
}

/**
 * MITRE ATT&CK for ICS techniques
 * Table: mitre_ics_techniques
 *
 * Note: platforms and data_sources are stored as JSON strings in the database
 * but should be parsed as string arrays in TypeScript
 */
export interface MitreTechnique {
  /** MITRE technique ID (e.g., "T0800") */
  technique_id: string;
  /** MITRE tactic category */
  tactic: string | null;
  /** Technique name */
  name: string | null;
  /** Full description of the technique */
  description: string | null;
  /** Platforms this technique applies to (parsed from JSON) */
  platforms: string[] | null;
  /** Data sources for detection (parsed from JSON) */
  data_sources: string[] | null;
}

/**
 * MITRE ATT&CK for ICS mitigations
 * Table: mitre_ics_mitigations
 */
export interface MitreMitigation {
  /** MITRE mitigation ID (e.g., "M0800") */
  mitigation_id: string;
  /** Mitigation name */
  name: string | null;
  /** Full description of the mitigation */
  description: string | null;
}

/**
 * Junction table for MITRE technique-mitigation relationships
 * Table: mitre_technique_mitigations
 */
export interface MitreTechniqueMitigation {
  /** Auto-incremented database ID */
  id: number;
  /** Foreign key to mitre_ics_techniques.technique_id */
  technique_id: string;
  /** Foreign key to mitre_ics_mitigations.mitigation_id */
  mitigation_id: string;
  /** Optional mapping to OT requirement */
  ot_requirement_id: string | null;
}

/**
 * Network segmentation guidance (zones and conduits)
 * Table: zones_conduits
 */
export interface ZoneConduit {
  /** Auto-incremented database ID */
  id: number;
  /** Zone name/identifier */
  zone_name: string | null;
  /** Purdue Model level (0-5) */
  purdue_level: number | null;
  /** Target security level (1-4) */
  security_level_target: number | null;
  /** Type of conduit */
  conduit_type: string | null;
  /** Guidance text for implementation */
  guidance_text: string | null;
  /** Reference to IEC 62443 section */
  iec_reference: string | null;
  /** Reference architecture identifier */
  reference_architecture: string | null;
}

/**
 * Regulatory requirements and sector-specific applicability
 * Table: sector_applicability
 */
export interface SectorApplicability {
  /** Auto-incremented database ID */
  id: number;
  /** Industry sector (e.g., "energy", "water", "manufacturing") */
  sector: string;
  /** Jurisdiction (e.g., "US", "EU", "global") */
  jurisdiction: string;
  /** Standard identifier */
  standard: string;
  /** Applicability level */
  applicability: 'mandatory' | 'recommended' | 'optional' | 'not_applicable';
  /** Threshold for applicability (e.g., "critical infrastructure") */
  threshold: string | null;
  /** Regulatory driver (e.g., "NIS2", "NERC CIP") */
  regulatory_driver: string | null;
  /** Effective date (ISO 8601 string) */
  effective_date: string | null;
  /** Additional notes */
  notes: string | null;
}

// =============================================================================
// Tool Parameter Types
// =============================================================================

/**
 * Options for search_ot_requirements tool
 */
export interface SearchOptions {
  /** Filter by specific standards (e.g., ["iec62443-3-3", "nist-800-82"]) */
  standards?: string[];
  /** Filter by security level (1-4) */
  security_level?: number;
  /** Filter by component type */
  component_type?: 'host' | 'network' | 'embedded' | 'application';
  /** Filter by industry sector */
  sector?: string;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Options for get_ot_requirement tool
 */
export interface GetRequirementOptions {
  /** Specific version of the standard to query */
  version?: string;
  /** Include cross-standard mappings in the response */
  include_mappings?: boolean;
}

/**
 * Options for map_security_level_requirements tool
 */
export interface SecurityLevelOptions {
  /** Filter by component type */
  component_type?: 'host' | 'network' | 'embedded' | 'application';
  /** Include requirement enhancements (REs) */
  include_enhancements?: boolean;
}

/**
 * Options for get_zone_conduit_guidance tool
 */
export interface ZoneConduitOptions {
  /** Filter by Purdue level (0-5) */
  purdue_level?: number;
  /** Filter by target security level (1-4) */
  security_level?: number;
  /** Filter by reference architecture */
  reference_architecture?: string;
}

/**
 * Options for get_mitre_ics_technique tool
 */
export interface MitreTechniqueOptions {
  /** Include mitigations in the response */
  include_mitigations?: boolean;
  /** Map technique to specific standards */
  map_to_standards?: string[];
}

/**
 * Options for get_standard_requirements tool
 */
export interface GetStandardRequirementsOptions {
  /** Specific version of the standard */
  version?: string;
  /** Filter by security level */
  security_level?: number;
}

/**
 * Options for compare_ot_requirements tool
 */
export interface CompareRequirementsOptions {
  /** Include cross-standard mappings in comparison */
  show_mappings?: boolean;
}

/**
 * Options for get_nerc_cip_requirements tool
 */
export interface NercCipOptions {
  /** Filter by asset type */
  asset_type?: string;
  /** Filter by impact rating */
  impact_rating?: 'high' | 'medium' | 'low';
}

/**
 * Options for map_threats_to_requirements tool
 */
export interface ThreatMappingOptions {
  /** Threat framework to use */
  threat_framework?: 'mitre_ics' | 'stride';
  /** Target standard for mapping */
  target_standard?: string;
}

/**
 * Options for get_implementation_guidance tool
 */
export interface ImplementationGuidanceOptions {
  /** Additional context for guidance (e.g., "SCADA system", "PLC network") */
  context?: string;
}

// =============================================================================
// Tool Result Types
// =============================================================================

/**
 * Search result for requirements (extends OTRequirement with search metadata)
 */
export interface RequirementSearchResult extends OTRequirement {
  /** Relevant text snippet from the requirement */
  snippet: string;
  /** Relevance score (0.0-1.0) */
  relevance: number;
  /** Name of the standard (denormalized for convenience) */
  standard_name: string;
}

/**
 * Detailed requirement information with related data
 */
export interface RequirementDetail extends OTRequirement {
  /** Standard information */
  standard: OTStandard;
  /** Cross-standard mappings */
  mappings: OTMapping[];
  /** Security level mappings */
  security_levels: SecurityLevel[];
}

/**
 * Detailed MITRE technique with mitigations and mappings
 */
export interface MitreTechniqueDetail extends MitreTechnique {
  /** Related mitigations */
  mitigations: MitreMitigation[];
  /** Mapped OT requirements */
  mapped_requirements: OTRequirement[];
}

/**
 * Comparison result for multiple requirements
 */
export interface ComparisonResult {
  /** Requirements being compared */
  requirements: RequirementDetail[];
  /** Common themes across requirements */
  common_themes: string[];
  /** Differences between requirements */
  differences: string[];
  /** Cross-standard mappings between the requirements */
  mappings: OTMapping[];
}

/**
 * Threat to requirement mapping result
 */
export interface ThreatMapping {
  /** Threat identifier */
  threat_id: string;
  /** Threat name */
  threat_name: string;
  /** Framework the threat is from */
  threat_framework: string;
  /** Mapped requirements */
  requirements: OTRequirement[];
  /** Confidence score for the mapping (0.0-1.0) */
  confidence: number;
}

/**
 * Implementation guidance for a requirement
 */
export interface ImplementationGuidance {
  /** The requirement being implemented */
  requirement: OTRequirement;
  /** Implementation steps */
  steps: string[];
  /** Best practices */
  best_practices: string[];
  /** Common pitfalls to avoid */
  pitfalls: string[];
  /** Related requirements */
  related_requirements: OTRequirement[];
}

/**
 * Requirement rationale information
 */
export interface Rationale {
  /** The requirement */
  requirement: OTRequirement;
  /** Why the requirement exists */
  rationale: string;
  /** Risk addressed by the requirement */
  risk_addressed: string;
  /** Potential impact of not implementing */
  impact_of_non_compliance: string;
}

/**
 * Zone and conduit guidance response
 */
export interface ZoneGuidance {
  /** Matching zone/conduit configurations */
  configurations: ZoneConduit[];
  /** Architecture recommendations */
  recommendations: string[];
  /** IEC 62443 references */
  iec_references: string[];
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Database query result wrapper
 */
export interface QueryResult<T> {
  /** Result data */
  data: T[];
  /** Total count (may differ from data.length if limited) */
  total_count: number;
  /** Whether more results are available */
  has_more: boolean;
}

/**
 * Standard status type
 */
export type StandardStatus = 'current' | 'superseded';

/**
 * Component types in OT environments
 */
export type ComponentType = 'host' | 'network' | 'embedded' | 'application';

/**
 * Security level type (IEC 62443)
 */
export type SecurityLevelType = 'SL-T' | 'SL-C' | 'SL-A';

/**
 * Mapping relationship types
 */
export type MappingType = 'exact_match' | 'partial' | 'related' | 'supersedes' | 'broader' | 'narrower';

/**
 * Sector applicability levels
 */
export type ApplicabilityLevel = 'mandatory' | 'recommended' | 'optional' | 'not_applicable';

/**
 * Threat frameworks supported
 */
export type ThreatFramework = 'mitre_ics' | 'stride';

/**
 * Impact ratings for NERC CIP
 */
export type ImpactRating = 'high' | 'medium' | 'low';
