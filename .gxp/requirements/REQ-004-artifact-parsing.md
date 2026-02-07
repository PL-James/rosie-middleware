---
gxp_id: REQ-004
title: "Artifact Parsing"
gxp_risk_rating: HIGH
description: |
  The system shall parse YAML frontmatter from markdown artifacts and extract
  JWS signatures from evidence files. Parsing must handle malformed content
  gracefully and extract all required metadata fields for traceability validation.
acceptance_criteria:
  - Parse YAML frontmatter from markdown files using gray-matter library
  - Extract required fields: gxp_id, title, parent_id, gxp_risk_rating, verification_tier
  - Parse JWS (JSON Web Signature) files and extract payload/header/signature
  - Handle missing frontmatter gracefully (log warning, continue scan)
  - Handle malformed YAML gracefully (log error, continue scan)
  - Support both snake_case and camelCase field names
validation_status: DRAFT
assurance_status: DRAFT
---

## Rationale

**Risk Rating: HIGH**

Parsing errors directly corrupt the compliance database:

- **Missing gxp_id**: Cannot establish traceability links, orphan artifacts
- **Incorrect parent_id extraction**: Broken traceability chains, false negatives
- **Failed YAML parsing**: Artifact excluded from validation, incomplete compliance picture
- **Malformed JWS parsing**: Cannot verify cryptographic evidence, compliance status unknown

These errors cascade through traceability validation and compliance reporting, making parsing a HIGH risk operation.

## Evidence Requirements (FDA CSA 2026)

**Risk Level: HIGH** — Scripted testing with system-generated logs required. Evidence MUST be captured as JWS-signed artifacts in `.gxp/evidence/`. Multi-party authorization (MPA) SHOULD be used for evidence signing.

## Regulatory Context

Supports 21 CFR Part 11 § 11.10(a) - Validation of systems to ensure accuracy and reliability. Accurate parsing ensures metadata used for traceability matches what's documented in source files.

## Acceptance Criteria Details

### AC-1: Parse YAML Frontmatter
- Use gray-matter v4.x library for YAML extraction
- Extract frontmatter delimited by `---` markers
- Return structured object: `{ data: {...}, content: string }`
- Preserve original markdown content separate from metadata

### AC-2: Extract Required Fields
- **All artifacts**: gxp_id, title, validation_status
- **Requirements**: gxp_risk_rating, description, acceptance_criteria
- **User Stories**: parent_id, as_a, i_want, so_that
- **Specs**: parent_id, verification_tier, design_approach, source_files
- **Evidence**: parent_id, test_results, signature

### AC-3: Parse JWS Files
- Use node-jose library for JWS parsing
- Extract components: header (algorithm, type), payload (test data), signature
- Decode base64url-encoded sections
- Return structured object for database storage

### AC-4: Handle Missing Frontmatter
- Return empty data object if no frontmatter detected
- Log warning: "Missing frontmatter in {file_path}"
- Continue scan (do not fail)
- Mark artifact as incomplete in database

### AC-5: Handle Malformed YAML
- Catch YAML parsing exceptions
- Log error: "Malformed YAML in {file_path}: {error_message}"
- Continue scan (do not fail)
- Mark artifact as parse_error in database

### AC-6: Field Name Normalization
- Accept snake_case: gxp_id, parent_id, gxp_risk_rating
- Accept camelCase: gxpId, parentId, gxpRiskRating
- Normalize to snake_case for database storage
- Log warning if mixed case detected in single file

## Error Handling Strategy

**Fatal Errors (stop scan):**
- GitHub API authentication failure
- Database connection lost

**Recoverable Errors (log and continue):**
- Malformed YAML frontmatter
- Missing required fields
- Invalid JWS structure

**Warnings (log only):**
- Missing optional fields
- Unexpected field names
- Empty markdown content

## Child User Stories

- US-004-001: Parse YAML Frontmatter
- US-004-002: Parse JWS Evidence Files
- US-004-003: Handle Malformed Content

## Implementing Specifications

- SPEC-004-001: YAML Frontmatter Parser Implementation
- SPEC-004-002: JWS Evidence Parser Implementation

## Verification Method

**Operational Qualification (OQ):**
- Unit tests for valid YAML parsing
- Unit tests for malformed YAML handling
- Unit tests for JWS parsing
- Integration tests with test artifacts (valid, missing frontmatter, malformed)

**Performance Qualification (PQ):**
- Parse 1000 artifacts and verify <10 second completion
- Verify error handling doesn't crash scan pipeline
