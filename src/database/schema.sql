-- OT Security MCP Database Schema
-- SQLite schema for storing OT security standards, requirements, and mappings
-- Designed for Stages 1-4 extensibility

-- =============================================================================
-- Core Tables
-- =============================================================================

-- Standards registry with version tracking
CREATE TABLE IF NOT EXISTS ot_standards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  published_date TEXT,
  url TEXT,
  status TEXT,
  notes TEXT
);

-- Requirements/controls with granular metadata
CREATE TABLE IF NOT EXISTS ot_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  standard_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  parent_requirement_id TEXT,
  title TEXT,
  description TEXT,
  rationale TEXT,
  component_type TEXT,
  purdue_level INTEGER CHECK (purdue_level IS NULL OR (purdue_level >= 0 AND purdue_level <= 5)),
  FOREIGN KEY (standard_id) REFERENCES ot_standards(id) ON DELETE CASCADE,
  UNIQUE (standard_id, requirement_id)
);

-- IEC 62443 security level mappings
CREATE TABLE IF NOT EXISTS security_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requirement_db_id INTEGER NOT NULL,
  security_level INTEGER NOT NULL CHECK (security_level >= 1 AND security_level <= 4),
  sl_type TEXT,
  capability_level INTEGER,
  notes TEXT,
  FOREIGN KEY (requirement_db_id) REFERENCES ot_requirements(id) ON DELETE CASCADE
);

-- Cross-standard mappings (the moat)
CREATE TABLE IF NOT EXISTS ot_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_standard TEXT NOT NULL,
  source_requirement TEXT NOT NULL,
  target_standard TEXT NOT NULL,
  target_requirement TEXT NOT NULL,
  mapping_type TEXT NOT NULL,
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)),
  notes TEXT,
  created_date TEXT DEFAULT (datetime('now'))
);

-- =============================================================================
-- Zones & Conduits
-- =============================================================================

-- Network segmentation guidance
CREATE TABLE IF NOT EXISTS zones_conduits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_name TEXT,
  purdue_level INTEGER CHECK (purdue_level IS NULL OR (purdue_level >= 0 AND purdue_level <= 5)),
  security_level_target INTEGER CHECK (security_level_target IS NULL OR (security_level_target >= 1 AND security_level_target <= 4)),
  conduit_type TEXT,
  guidance_text TEXT,
  iec_reference TEXT,
  reference_architecture TEXT
);

-- =============================================================================
-- MITRE ATT&CK for ICS
-- =============================================================================

-- MITRE ICS techniques
CREATE TABLE IF NOT EXISTS mitre_ics_techniques (
  technique_id TEXT PRIMARY KEY,
  tactic TEXT,
  name TEXT,
  description TEXT,
  platforms TEXT,
  data_sources TEXT
);

-- MITRE ICS mitigations
CREATE TABLE IF NOT EXISTS mitre_ics_mitigations (
  mitigation_id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT
);

-- Junction table for technique-mitigation relationships with OT requirement mapping
CREATE TABLE IF NOT EXISTS mitre_technique_mitigations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  technique_id TEXT NOT NULL,
  mitigation_id TEXT NOT NULL,
  ot_requirement_id TEXT,
  FOREIGN KEY (technique_id) REFERENCES mitre_ics_techniques(technique_id) ON DELETE CASCADE,
  FOREIGN KEY (mitigation_id) REFERENCES mitre_ics_mitigations(mitigation_id) ON DELETE CASCADE,
  UNIQUE(technique_id, mitigation_id)
);

-- =============================================================================
-- Sector Applicability
-- =============================================================================

-- Regulatory requirements and sector-specific applicability
CREATE TABLE IF NOT EXISTS sector_applicability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sector TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  standard TEXT NOT NULL,
  applicability TEXT NOT NULL,
  threshold TEXT,
  regulatory_driver TEXT,
  effective_date TEXT,
  notes TEXT
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Indexes for requirement searches
CREATE INDEX IF NOT EXISTS idx_requirements_standard
  ON ot_requirements(standard_id);

CREATE INDEX IF NOT EXISTS idx_requirements_id
  ON ot_requirements(requirement_id);

CREATE INDEX IF NOT EXISTS idx_requirements_component
  ON ot_requirements(component_type);

CREATE INDEX IF NOT EXISTS idx_requirements_purdue
  ON ot_requirements(purdue_level);

-- Indexes for security level queries
CREATE INDEX IF NOT EXISTS idx_security_levels_requirement
  ON security_levels(requirement_db_id);

CREATE INDEX IF NOT EXISTS idx_security_levels_level
  ON security_levels(security_level);

-- Indexes for cross-standard mappings
CREATE INDEX IF NOT EXISTS idx_mappings_source
  ON ot_mappings(source_standard, source_requirement);

CREATE INDEX IF NOT EXISTS idx_mappings_target
  ON ot_mappings(target_standard, target_requirement);

CREATE INDEX IF NOT EXISTS idx_mappings_type
  ON ot_mappings(mapping_type);

-- Ensure unique mappings (no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mappings_unique
  ON ot_mappings(source_standard, source_requirement, target_standard, target_requirement);

-- Indexes for MITRE ATT&CK queries
CREATE INDEX IF NOT EXISTS idx_mitre_techniques_tactic
  ON mitre_ics_techniques(tactic);

CREATE INDEX IF NOT EXISTS idx_mitre_technique_mitigations_technique
  ON mitre_technique_mitigations(technique_id);

CREATE INDEX IF NOT EXISTS idx_mitre_technique_mitigations_mitigation
  ON mitre_technique_mitigations(mitigation_id);

-- Indexes for sector applicability
CREATE INDEX IF NOT EXISTS idx_sector_applicability_sector
  ON sector_applicability(sector);

CREATE INDEX IF NOT EXISTS idx_sector_applicability_jurisdiction
  ON sector_applicability(jurisdiction);

CREATE INDEX IF NOT EXISTS idx_sector_applicability_standard
  ON sector_applicability(standard);

-- Indexes for zones and conduits
CREATE INDEX IF NOT EXISTS idx_zones_conduits_purdue
  ON zones_conduits(purdue_level);

CREATE INDEX IF NOT EXISTS idx_zones_conduits_security_level
  ON zones_conduits(security_level_target);
