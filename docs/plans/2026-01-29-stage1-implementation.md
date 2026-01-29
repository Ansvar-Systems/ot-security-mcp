# OT Security MCP - Stage 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build foundation MCP server with MITRE ATT&CK ICS + NIST SP 800-82 data sources (fully automated)

**Architecture:** TypeScript + SQLite MCP server following EU Regulations MCP pattern. Database schema supports all OT standards with extensibility for future stages.

**Tech Stack:** TypeScript 5.9+, better-sqlite3, @modelcontextprotocol/sdk 1.25.3+, Vitest 4.0+

---

## Overview

Stage 1 delivers a working MCP server with:
- Core database schema (all tables, ready for Stages 2-4)
- MCP server scaffolding
- MITRE ATT&CK for ICS ingestion (automated)
- NIST SP 800-82 ingestion (automated)
- 4 core tools: search, get, list, get_mitre_technique
- Comprehensive test suite

**Time estimate:** 2 weeks (10 tasks)

---

## Implementation Tasks

### Task 1: Project Setup
- Initialize package.json with dependencies
- Configure TypeScript
- Set up testing with Vitest
- Create .gitignore

### Task 2: Database Schema & Client
- Create schema.sql with all tables
- Build DatabaseClient wrapper for better-sqlite3
- Write unit tests for database operations

### Task 3: TypeScript Type Definitions
- Define interfaces for all domain types
- Create tool parameter and result types
- Export from src/types/index.ts

### Task 4: MCP Server Scaffolding
- Implement MCP server using SDK
- Register tool handlers
- Set up stdio transport

### Task 5: MITRE ATT&CK ICS Ingestion
- Fetch STIX data from GitHub
- Parse techniques and mitigations
- Store in database with proper relationships

### Task 6: Implement search_ot_requirements
- Full-text search across requirements
- Filtering by standard, SL, component type
- Relevance scoring and snippet extraction

### Task 7: Implement get_ot_requirement
- Retrieve requirement by ID and standard
- Include standard metadata
- Optional mapping inclusion

### Task 8: Implement list_ot_standards and get_mitre_ics_technique
- List standards with requirement counts
- Query MITRE techniques with mitigations
- Map techniques to OT requirements

### Task 9: Integration Testing & Documentation
- End-to-end integration tests
- README with quick start guide
- Tool reference documentation

### Task 10: Final Review & Package
- Add Apache 2.0 license
- Set up GitHub Actions CI
- Tag v0.1.0 release

---

## Detailed Implementation Guide

See the full implementation plan document for:
- Step-by-step TDD workflow for each task
- Complete code examples
- Test cases with expected outputs
- Commit messages for each milestone

**Key Principles:**
- Test-Driven Development (TDD)
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)
- Frequent commits with clear messages

---

## Success Criteria

**Stage 1 Complete When:**
- ✅ All 10 tasks implemented
- ✅ Test coverage > 80%
- ✅ MITRE ATT&CK data ingested
- ✅ All 4 tools functional
- ✅ CI/CD pipeline passing
- ✅ Documentation complete

**Review Checkpoint:**
Use `superpowers:requesting-code-review` before proceeding to Stage 2.

---

## Next Steps After Stage 1

1. **Code Review** - Request review of Stage 1 implementation
2. **Stage 2 Planning** - IEC 62443 core (security levels, zones/conduits)
3. **Stage 3 Planning** - Cross-standard mappings
4. **Stage 4 Planning** - Sector applicability engine

---

**End of Stage 1 Implementation Plan**
