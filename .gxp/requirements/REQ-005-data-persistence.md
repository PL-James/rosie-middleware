---
gxp_id: REQ-005
title: "Data Persistence"
gxp_risk_rating: HIGH
description: |
  The system shall persist all artifacts and traceability metadata in PostgreSQL
  with full ACID compliance. All scan operations must be atomic (all-or-nothing)
  to prevent partial data corruption.
acceptance_criteria:
  - Use atomic database transactions for all artifact inserts
  - Enforce foreign key constraints for traceability links
  - Maintain immutable audit log for all write operations
  - Support rollback on scan failure
  - Prevent duplicate artifact insertion
  - Index traceability fields for query performance
validation_status: DRAFT
---

## Rationale

**Risk Rating: HIGH**

Data persistence is the final step in the scanning pipeline. Persistence errors corrupt the compliance database:

- **Partial transactions**: Incomplete artifact sets, broken traceability chains
- **Missing foreign keys**: Orphan artifacts, invalid parent_id references
- **No audit trail**: Cannot trace when/why artifacts were modified
- **Duplicate artifacts**: Confusion over canonical version, validation errors
- **Slow queries**: Unusable system for large repositories

Database integrity directly impacts all downstream compliance reporting and validation workflows.

## Regulatory Context

Supports 21 CFR Part 11:
- § 11.10(c): Document sequencing to ensure compliance operations performed in correct order (audit log)
- § 11.10(e): Ability to generate accurate and complete copies of records (atomic transactions)
- § 11.50: Non-repudiation through immutable audit trail

## Acceptance Criteria Details

### AC-1: Atomic Database Transactions
- Wrap all artifact inserts in single database transaction
- If any insert fails, rollback entire scan
- Update scan status only after successful commit
- Log transaction success/failure to audit trail

### AC-2: Foreign Key Constraints
- **user_stories.parent_id** → requirements.gxp_id
- **specs.parent_id** → user_stories.gxp_id
- **evidence.parent_id** → specs.gxp_id
- Enforce ON DELETE CASCADE for repository deletion
- Reject inserts with invalid parent_id

### AC-3: Immutable Audit Log
- Log all write operations: INSERT, UPDATE, DELETE
- Include: timestamp, user, action, resource_type, resource_id, payload_hash
- Append-only table (no UPDATE or DELETE allowed)
- Index on timestamp and resource_id for audit queries

### AC-4: Rollback on Failure
- If GitHub API fails mid-scan: rollback transaction
- If parsing error prevents critical artifact extraction: rollback
- If database constraint violated: rollback
- Update scan status to "failed" with error message

### AC-5: Prevent Duplicate Artifacts
- Unique constraint: (repository_id, gxp_id)
- On conflict: UPDATE existing artifact (replace content)
- Track updated_at timestamp for change tracking
- Log conflict resolution to audit trail

### AC-6: Performance Indexes
- Index: repositories.git_url (UNIQUE)
- Index: requirements.gxp_id, user_stories.gxp_id, specs.gxp_id
- Index: user_stories.parent_id, specs.parent_id, evidence.parent_id
- Index: traceability_links (source_id, target_id)
- Full-text search: GIN index on tsvector(title || description)

## Database Schema Design

**Tables:**
- repositories (id, name, git_url, owner, repo, created_at)
- scans (id, repository_id, status, commit_sha, artifacts_found, created_at)
- system_contexts (id, repository_id, project_name, version, gxp_risk_rating)
- requirements (id, repository_id, gxp_id, title, gxp_risk_rating, description)
- user_stories (id, repository_id, gxp_id, title, parent_id, as_a, i_want, so_that)
- specs (id, repository_id, gxp_id, title, parent_id, verification_tier, design_approach)
- evidence (id, repository_id, gxp_id, title, parent_id, jws_payload, jws_signature)
- traceability_links (id, repository_id, source_id, target_id, is_valid)
- audit_log (id, timestamp, action, resource_type, resource_id, payload_hash)

## Child User Stories

- US-005-001: Atomic Transaction Management
- US-005-002: Foreign Key Enforcement
- US-005-003: Audit Log Recording

## Implementing Specifications

- SPEC-005-001: Atomic Transaction Service
- SPEC-INF-001: Database Schema Definition

## Verification Method

**Installation Qualification (IQ):**
- Verify database schema matches specification
- Verify all indexes created
- Verify foreign key constraints enforced

**Operational Qualification (OQ):**
- Unit tests for transaction rollback
- Integration tests for foreign key violations
- Audit log completeness tests

**Performance Qualification (PQ):**
- Insert 1000 artifacts and verify <5 second completion
- Query traceability chains and verify <1 second response
