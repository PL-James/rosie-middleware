---
gxp_id: REQ-003
title: "Artifact Discovery"
gxp_risk_rating: HIGH
description: |
  The system shall discover and categorize all ROSIE RFC-001 compliant artifacts
  within a repository's .gxp/ directory. Discovery must correctly identify
  artifact types to ensure proper parsing and traceability validation.
acceptance_criteria:
  - Detect presence of .gxp/ directory in repository root
  - Identify system_context.md as apex document
  - Categorize files in requirements/, user_stories/, specs/, evidence/ subdirectories
  - Detect artifact type from file path patterns
  - Report missing required directories
  - Count artifacts by type for scan summary
validation_status: DRAFT
---

## Rationale

**Risk Rating: HIGH**

Artifact discovery is the first phase of the scanning pipeline. Discovery errors cascade through all subsequent phases:

- **Missing system_context.md**: Cannot establish system boundary or risk rating
- **Misclassified artifact types**: Wrong parser applied, validation failures
- **Missed artifact files**: Incomplete traceability chains, false negatives
- **Incorrect directory detection**: Entire scan fails or produces empty results

These errors directly impact the completeness and accuracy of compliance validation, warranting HIGH risk classification.

## Regulatory Context

Supports 21 CFR Part 11 § 11.10(e) - Generate complete copies of records. Discovery phase must find ALL artifacts to ensure compliance reports reflect the complete state of documentation.

## Acceptance Criteria Details

### AC-1: Detect .gxp/ Directory
- Search repository tree for `.gxp/` path at root level
- Return scan error if directory not found
- Log warning if directory exists but is empty

### AC-2: Identify System Context
- Look for `.gxp/system_context.md` (exact filename)
- Mark as required artifact (scan fails if missing)
- Differentiate from other markdown files in .gxp/ root

### AC-3: Categorize Subdirectory Files
- **requirements/**: Files matching `REQ-*.md` pattern
- **user_stories/**: Files matching `US-*.md` pattern
- **specs/**: Files matching `SPEC-*.md` pattern
- **evidence/**: Files matching `*.jws` pattern

### AC-4: Artifact Type Detection
- Parse file path to extract artifact category
- Validate filename patterns (e.g., REQ-001-title.md)
- Ignore non-matching files (README.md, .gitkeep)
- Return structured list: `{ type, path, filename }`

### AC-5: Report Missing Directories
- Log warning if requirements/ directory missing
- Log warning if user_stories/ directory missing
- Log warning if specs/ directory missing
- Evidence directory optional (may be empty for draft systems)

### AC-6: Artifact Count Summary
- Count artifacts by type: system_context, requirements, user_stories, specs, evidence
- Include in scan results for validation reporting
- Log summary to console and audit trail

## Edge Cases

- **No .gxp/ directory**: Return error, do not attempt parsing
- **Empty .gxp/ directory**: Return warning, scan completes with zero artifacts
- **Unexpected file types**: Ignore .pdf, .png, etc. in .gxp/ directories
- **Nested subdirectories**: Only scan immediate children of .gxp/

## Child User Stories

- US-003-001: Validate .gxp/ Directory Structure
- US-003-002: Detect Artifact Types from Paths

## Implementing Specifications

- SPEC-003-001: Discovery Phase Implementation
- SPEC-004-003: Artifact Type Detection Logic

## Verification Method

**Operational Qualification (OQ):**
- Unit tests for path pattern matching
- Integration tests with test repositories (valid, missing .gxp, empty .gxp)
- Edge case handling tests

**Performance Qualification (PQ):**
- Scan repository with 1000+ files and verify .gxp/ detection completes in <5 seconds
