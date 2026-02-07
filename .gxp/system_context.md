---
id: 3c4e7f9a-1b2d-4a5c-8e9f-0a1b2c3d4e5f
project_name: "ROSIE Middleware Platform"
version: "0.2.0"
gxp_risk_rating: HIGH
validation_status: DRAFT
assurance_status: DRAFT
intended_use: |
  Middleware platform for scanning, indexing, and exposing GxP artifacts from
  ROSIE-compliant GitHub repositories. Provides centralized compliance validation
  and traceability analysis across multiple regulated software systems.
regulatory_context: |
  Supports 21 CFR Part 11 compliance by validating that software repositories
  maintain proper GxP documentation, traceability chains, and cryptographic evidence.
  Ensures regulated pharmaceutical software systems maintain complete audit trails
  and verifiable documentation chains from requirements through implementation.
  Aligned with FDA Computer Software Assurance (CSA) guidance (February 2026),
  supporting risk-proportionate evidence (JWS for HIGH risk, ROT for non-HIGH),
  vendor assurance leverage, and Release Manifest e-signatures.
system_owner: "PharmaLedger Association"
technical_contact: "compliance@pharmaledger.org"
deployment_environment: "Railway (PostgreSQL 18, NestJS 11, React 18)"
repository: "https://github.com/pharmaledger/rosie-middleware"
---

# ROSIE Middleware Platform - System Context

## Purpose

This system validates ROSIE RFC-001 compliance for pharmaceutical software repositories by scanning GitHub repositories, extracting GxP artifacts, building traceability chains, and providing compliance reporting capabilities.

## Scope

The ROSIE Middleware Platform encompasses:

- **GitHub Integration**: Secure authentication and repository content fetching
- **Artifact Discovery**: Detection and parsing of `.gxp/` directory structures
- **Artifact Parsing**: YAML frontmatter extraction and JWS signature validation
- **Data Persistence**: PostgreSQL storage with full traceability metadata
- **Scan Orchestration**: 6-phase scanning pipeline (Discovery → Fetch → Parse → Validate → Persist → Notify)
- **REST API**: 15+ endpoints for artifact querying and compliance reporting
- **User Interface**: React-based dashboard for repository management and visualization

## System Boundary

**In Scope:**
- Scanning public and private GitHub repositories
- Parsing ROSIE RFC-001 compliant artifacts (system_context.md, requirements, user_stories, specs, evidence)
- Building and validating traceability chains (REQ → US → SPEC)
- Storing artifact metadata and traceability links
- Exposing compliance data via REST API
- Providing web UI for repository management

**Out of Scope:**
- Direct modification of scanned repositories
- Automated artifact generation or remediation
- Real-time code quality analysis
- Version control operations beyond read-only access
- Blockchain or distributed ledger integration

## Intended Use

The system is intended for use by:

1. **Quality Assurance Teams**: Verify that regulated software repositories maintain complete GxP documentation
2. **Compliance Officers**: Generate audit-ready compliance reports for regulatory submissions
3. **Software Architects**: Visualize traceability chains and identify documentation gaps
4. **DevOps Teams**: Integrate compliance validation into CI/CD pipelines

## Regulatory Context

This system supports compliance with:

- **21 CFR Part 11**: Electronic records and electronic signatures
  - § 11.10(e): Generate complete, accurate, and tamper-evident copies of records
  - § 11.10(c): Sequentially numbered audit trails
  - § 11.50: Non-repudiation through cryptographic signatures (JWS evidence)

- **EMA ePI Guidelines**: Electronic Product Information requirements
  - Traceability from regulatory requirements to implementation
  - Versioned documentation with change history

- **ISO 13485**: Medical devices quality management
  - Design control documentation and traceability

## Architecture Overview

### Technology Stack

- **Backend**: NestJS 11 (TypeScript)
- **Frontend**: React 18 with Vite
- **Database**: PostgreSQL 18 (Drizzle ORM)
- **External Integration**: GitHub REST API v3 (Octokit SDK)
- **Deployment**: Railway PaaS

### Core Modules

1. **GitHub Module**: API client with rate limiting and batching
2. **Artifacts Module**: Parser for YAML frontmatter and JWS signatures
3. **Repositories Module**: Repository registration and management
4. **Scanner Module**: Orchestration of 6-phase scanning pipeline
5. **Health Module**: System health checks and diagnostics

### Data Model

The system maintains 9 core tables:

- `repositories`: Registered GitHub repositories
- `scans`: Scan job history and status
- `system_contexts`: Apex documents from `.gxp/system_context.md`
- `requirements`: High-level requirements (REQ artifacts)
- `user_stories`: User stories (US artifacts) linked to requirements
- `specs`: Specifications (SPEC artifacts) linked to user stories
- `evidence`: JWS evidence artifacts with signature verification
- `traceability_links`: Materialized parent-child relationships
- `audit_log`: Immutable audit trail of all system operations

### Scanning Pipeline

1. **Discovery Phase**: Detect `.gxp/` directory and artifact types
2. **Fetch Phase**: Retrieve file contents from GitHub API
3. **Parse Phase**: Extract YAML frontmatter and metadata
4. **Validate Phase**: Verify traceability links and required fields
5. **Persist Phase**: Atomic database transaction for all artifacts
6. **Notify Phase**: Log results and update scan status

## Risk Assessment

**GxP Risk Rating: HIGH**

**Rationale:**
- The system validates compliance for other regulated software systems
- False positives could certify non-compliant systems as validated
- False negatives could reject valid systems, blocking development
- Direct impact on pharmaceutical software validation lifecycle
- Incorrect traceability validation could lead to regulatory findings

**Risk Mitigation:**
- Comprehensive test coverage for parsing and validation logic
- Immutable audit trail of all scanning operations
- Cryptographic signature verification for evidence artifacts
- Manual review capability for disputed compliance findings
- Version control for all configuration and code changes

## Validation Status

**Current Status**: DRAFT

**Validation Activities Completed:**
- System requirements documented (8 requirements)
- User stories mapped to requirements (18 user stories)
- Specifications linked to implementation (16 specs)
- Traceability chain validated (REQ → US → SPEC)

**Pending Validation Activities:**
- Unit test implementation (0% coverage)
- Integration test suite
- Performance qualification testing
- User acceptance testing
- Evidence artifact generation (JWS signatures)

**Target Validation Status**: VALIDATED (requires all evidence artifacts and formal QA review)

## Deployment Environment

**Production Environment:**
- **Platform**: Railway PaaS
- **Database**: PostgreSQL 18 (Railway managed instance)
- **Backend**: NestJS 11 container (Node.js 20 LTS)
- **Frontend**: React 18 static build served via Nginx
- **Environment Variables**: DATABASE_URL, GITHUB_TOKEN, NODE_ENV

**Development Environment:**
- Local PostgreSQL 18 instance
- Node.js 20 LTS
- npm workspace for monorepo management

## System Owner

**Organization**: PharmaLedger Association
**Primary Contact**: compliance@pharmaledger.org
**Technical Contact**: james@pharmaledger.org
**Repository**: https://github.com/pharmaledger/rosie-middleware

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-03 | James Gannon | Initial draft - ROSIE RFC-001 compliance artifacts |
| 0.2.0 | 2026-02-07 | James Gannon | FDA CSA 2026 alignment — assurance_status, risk-proportionate evidence, vendor assessments |

## References

- ROSIE RFC-001: GxP Artifact Specification
- 21 CFR Part 11: Electronic Records; Electronic Signatures
- EMA ePI Guidelines: Electronic Product Information
- ISO 13485: Medical devices - Quality management systems
- GitHub REST API Documentation v3
