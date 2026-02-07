---
gxp_id: REQ-001
title: "Repository Management"
gxp_risk_rating: MEDIUM
description: |
  The system shall provide capabilities to register, configure, and manage GitHub
  repositories for compliance scanning. Users shall be able to add repositories,
  configure scan settings, and remove repositories when no longer needed.
acceptance_criteria:
  - Register GitHub repositories via REST API with name and URL
  - Validate GitHub URLs before accepting registration
  - Store repository metadata including owner, name, and default branch
  - Support repository deletion with cascading removal of artifacts
  - Prevent duplicate repository registration
  - Track repository status (active, archived, error)
validation_status: DRAFT
assurance_status: DRAFT
---

## Rationale

**Risk Rating: MEDIUM**

Repository management is the entry point for all compliance validation workflows. Incorrect registration could lead to scanning wrong repositories or missing repositories entirely. However, the risk is mitigated because:

- Registration errors are easily detectable (scan fails immediately)
- No direct impact on artifact validation logic
- User can re-register repository if errors occur

The risk is elevated above LOW because:
- Incorrect repository deletion could remove compliance evidence
- Database cascading deletes could impact audit trail integrity

## Evidence Requirements (FDA CSA 2026)

**Risk Level: MEDIUM** — Unscripted or ad-hoc testing acceptable. Evidence MAY be captured as a Record of Testing (ROT) markdown file in `.gxp/evidence/`. Single-agent validation is acceptable.

## Regulatory Context

Supports 21 CFR Part 11 § 11.10(a) - Validation of systems to ensure accuracy, reliability, and consistent intended performance. Proper repository management ensures the system scans the correct, authoritative source repositories.

## Acceptance Criteria Details

### AC-1: Register GitHub Repositories
- Accept POST requests with repository name and GitHub URL
- Return unique repository ID on successful registration
- Store creation timestamp and initial status

### AC-2: Validate GitHub URLs
- Parse URLs to extract owner and repository name
- Support multiple URL formats:
  - `https://github.com/owner/repo`
  - `https://github.com/owner/repo.git`
  - `git@github.com:owner/repo.git`
- Reject invalid URLs with descriptive error messages

### AC-3: Store Repository Metadata
- Persist: id, name, git_url, owner, repo, default_branch
- Track: created_at, updated_at, last_scanned_at
- Default branch: "main" (override via API)

### AC-4: Repository Deletion
- Support soft delete (set is_active = false) for audit trail preservation
- Support hard delete with cascading removal of:
  - Scans
  - System contexts
  - Requirements, user stories, specs, evidence
  - Traceability links
- Require confirmation for hard delete operations

### AC-5: Prevent Duplicate Registration
- Enforce unique constraint on git_url
- Return 409 Conflict if repository already registered
- Provide option to re-scan existing repository

### AC-6: Track Repository Status
- **active**: Ready for scanning
- **archived**: Retained for audit but no longer scanned
- **error**: Last scan failed (retryable)

## Child User Stories

- US-001-001: Register GitHub Repository
- US-001-002: Delete Repository with Cascade

## Implementing Specifications

- SPEC-001-001: Repository Service Implementation
- SPEC-007-001: Repository Controller REST API

## Verification Method

**Operational Qualification (OQ):**
- Unit tests for URL parsing logic
- Integration tests for repository CRUD operations
- Database constraint validation tests

**Performance Qualification (PQ):**
- User acceptance: Register repository via UI and trigger scan
