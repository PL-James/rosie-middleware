---
gxp_id: REQ-002
title: "GitHub Integration"
gxp_risk_rating: HIGH
description: |
  The system shall securely authenticate with GitHub API and fetch repository
  contents with integrity verification. All GitHub operations must maintain
  commit SHA verification to ensure tamper-evident record retrieval.
acceptance_criteria:
  - Authenticate using GitHub PAT or GitHub App credentials
  - Fetch repository tree recursively with commit SHA verification
  - Download and decode file contents (base64 → UTF-8)
  - Handle GitHub API rate limits with exponential backoff
  - Batch file requests to minimize API calls (10 files per batch)
  - Verify commit SHA matches expected value after fetching
validation_status: DRAFT
assurance_status: DRAFT
---

## Rationale

**Risk Rating: HIGH**

GitHub integration is the foundation of artifact retrieval. Incorrect fetching could lead to:

- **Scanning wrong commit SHA**: Validating different code than intended
- **Missing artifacts**: Incomplete compliance picture leading to false negatives
- **Using manipulated content**: If commit SHA not verified, tampered files could be scanned
- **Rate limit exhaustion**: Blocking all scanning operations

These errors directly impact validation accuracy and could lead to false compliance reports, making this a HIGH risk requirement.

## Evidence Requirements (FDA CSA 2026)

**Risk Level: HIGH** — Scripted testing with system-generated logs required. Evidence MUST be captured as JWS-signed artifacts in `.gxp/evidence/`. Multi-party authorization (MPA) SHOULD be used for evidence signing.

## Regulatory Context

Supports 21 CFR Part 11 § 11.10(e) - Generate complete, accurate, and tamper-evident copies of records. Commit SHA verification ensures:

- **Completeness**: All files at specific commit retrieved
- **Accuracy**: Content matches what's stored in git
- **Tamper-evidence**: SHA-1 hash verifies content integrity

## Acceptance Criteria Details

### AC-1: GitHub Authentication
- Support GitHub Personal Access Token (PAT)
- Support GitHub App installation credentials (future)
- Validate credentials on startup
- Log authentication failures with actionable error messages

### AC-2: Fetch Repository Tree
- Use GitHub Tree API with `recursive=1` parameter
- Verify returned tree SHA matches commit SHA
- Filter tree to `.gxp/` directory only
- Return structured tree with file paths and types

### AC-3: Download File Contents
- Use GitHub Contents API for base64-encoded file retrieval
- Decode base64 → UTF-8 for markdown and text files
- Preserve binary content for JWS files
- Include commit SHA in all requests for consistency

### AC-4: Rate Limit Handling
- Check `X-RateLimit-Remaining` header before requests
- Implement exponential backoff when remaining < 100
- Log rate limit warnings
- Future: Pause scanning and resume when limits reset

### AC-5: Batch File Requests
- Group file retrievals into batches of 10
- Use parallel Promise.all() for batch requests
- Reduce total API calls from N (files) to N/10 (batches)
- Maintain request ordering for error tracing

### AC-6: Commit SHA Verification
- Accept target commit SHA as parameter
- Verify tree API response matches expected SHA
- Include commit SHA in audit log for traceability
- Reject scan if SHA mismatch detected

## Security Considerations

- GitHub tokens stored in environment variables (never in database)
- Tokens never logged or exposed in API responses
- Use HTTPS for all GitHub API requests
- Validate token scopes include `repo` (private repos) or `public_repo` (public only)

## Child User Stories

- US-002-001: GitHub Authentication
- US-002-002: Fetch Repository Tree
- US-002-003: Batch File Content Requests

## Implementing Specifications

- SPEC-002-001: GitHub API Client Implementation
- SPEC-002-002: Rate Limiting and Batching Logic

## Verification Method

**Operational Qualification (OQ):**
- Unit tests for URL parsing, base64 decoding, batching logic
- Integration tests with real public repository
- Rate limit simulation tests

**Performance Qualification (PQ):**
- Scan 100-file repository and verify sub-60 second completion
- Verify commit SHA logged in audit trail
