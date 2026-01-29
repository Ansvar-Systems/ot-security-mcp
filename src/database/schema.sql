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

-- Full-text search index for requirements (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS ot_requirements_fts USING fts5(
  requirement_id,
  title,
  description,
  content='ot_requirements',
  content_rowid='id'
);

-- Triggers to keep FTS index synchronized with ot_requirements
CREATE TRIGGER IF NOT EXISTS ot_requirements_fts_insert AFTER INSERT ON ot_requirements BEGIN
  INSERT INTO ot_requirements_fts(rowid, requirement_id, title, description)
  VALUES (new.id, new.requirement_id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS ot_requirements_fts_delete AFTER DELETE ON ot_requirements BEGIN
  INSERT INTO ot_requirements_fts(ot_requirements_fts, rowid, requirement_id, title, description)
  VALUES ('delete', old.id, old.requirement_id, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS ot_requirements_fts_update AFTER UPDATE ON ot_requirements BEGIN
  INSERT INTO ot_requirements_fts(ot_requirements_fts, rowid, requirement_id, title, description)
  VALUES ('delete', old.id, old.requirement_id, old.title, old.description);
  INSERT INTO ot_requirements_fts(rowid, requirement_id, title, description)
  VALUES (new.id, new.requirement_id, new.title, new.description);
END;

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
-- Zones and Conduits (IEC 62443-3-2)
-- =============================================================================

-- Zone definitions (Purdue model levels 0-5)
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  purdue_level INTEGER CHECK (purdue_level >= 0 AND purdue_level <= 5),
  security_level_target INTEGER CHECK (security_level_target IN (1, 2, 3, 4)),
  description TEXT,
  iec_reference TEXT,
  typical_assets TEXT,
  UNIQUE(name, purdue_level)
);

-- Conduit types (network connections between zones)
CREATE TABLE IF NOT EXISTS conduits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  conduit_type TEXT NOT NULL,
  security_requirements TEXT,
  description TEXT,
  iec_reference TEXT,
  minimum_security_level INTEGER CHECK (minimum_security_level IN (1, 2, 3, 4)),
  UNIQUE(name, conduit_type)
);

-- Zone-to-zone flows via conduits
CREATE TABLE IF NOT EXISTS zone_conduit_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_zone_id INTEGER NOT NULL,
  target_zone_id INTEGER NOT NULL,
  conduit_id INTEGER NOT NULL,
  data_flow_description TEXT,
  security_level_requirement INTEGER CHECK (security_level_requirement IN (1, 2, 3, 4)),
  bidirectional BOOLEAN DEFAULT 0,
  FOREIGN KEY (source_zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (target_zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (conduit_id) REFERENCES conduits(id) ON DELETE CASCADE
);

-- Reference architectures
CREATE TABLE IF NOT EXISTS reference_architectures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  diagram_url TEXT,
  applicable_zones TEXT,
  iec_reference TEXT,
  industry_applicability TEXT
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
-- System Metadata and Audit Trail
-- =============================================================================

-- Database metadata (schema version, last updated, etc.)
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Ingestion audit log (tracks data ingestion operations)
CREATE TABLE IF NOT EXISTS ingestion_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,           -- 'ingest:mitre', 'ingest:nist-80053', etc.
  status TEXT NOT NULL,              -- 'success', 'failed', 'partial'
  record_count INTEGER,              -- Number of records ingested
  timestamp TEXT DEFAULT (datetime('now')),
  duration_ms INTEGER,               -- Time taken in milliseconds
  notes TEXT,                        -- Error messages or additional info
  data_version TEXT                  -- Version of source data (e.g., 'MITRE v16.0')
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

-- Indexes for zone/conduit queries
CREATE INDEX IF NOT EXISTS idx_zones_purdue ON zones(purdue_level);
CREATE INDEX IF NOT EXISTS idx_zones_sl_target ON zones(security_level_target);
CREATE INDEX IF NOT EXISTS idx_flows_source ON zone_conduit_flows(source_zone_id);
CREATE INDEX IF NOT EXISTS idx_flows_target ON zone_conduit_flows(target_zone_id);

-- Indexes for ingestion log (most recent operations first)
CREATE INDEX IF NOT EXISTS idx_ingestion_log_timestamp
  ON ingestion_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_log_operation
  ON ingestion_log(operation);
