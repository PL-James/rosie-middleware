---
gxp_id: REQ-006
title: "Scan Orchestration"
gxp_risk_rating: MEDIUM
description: |
  The system shall orchestrate the 6-phase scanning pipeline (Discovery → Fetch →
  Parse → Validate → Persist → Notify) with proper error handling and status tracking.
  Each scan shall record metrics for audit and performance monitoring.
acceptance_criteria:
  - Execute scanning phases in correct sequential order
  - Track scan status (pending, in_progress, completed, failed)
  - Record scan duration and artifact counts
  - Handle phase failures without crashing system
  - Support manual scan triggering via REST API
  - Log scan progress to console and audit trail
validation_status: DRAFT
---

## Rationale

**Risk Rating: MEDIUM**

Scan orchestration coordinates all compliance validation workflows. Orchestration errors can:

- **Incorrect phase ordering**: Skip validation, produce invalid results
- **Missing error handling**: Crash system, lose scan progress
- **No status tracking**: Cannot debug failed scans or monitor progress
- **Missing metrics**: Cannot identify performance bottlenecks

However, orchestration errors are typically detectable (scan fails visibly) and do not corrupt existing data. Users can re-trigger scans. This makes orchestration less critical than parsing or persistence, but still significant.

## Regulatory Context

Supports 21 CFR Part 11 § 11.10(c) - Document sequencing to ensure scanning operations are performed in prescribed sequence. The 6-phase pipeline ensures consistent, repeatable validation workflows.

## Acceptance Criteria Details

### AC-1: Sequential Phase Execution
1. **Discovery Phase**: Detect .gxp/ directory and artifact types
2. **Fetch Phase**: Download file contents from GitHub
3. **Parse Phase**: Extract YAML frontmatter and metadata
4. **Validate Phase**: Verify traceability links and required fields
5. **Persist Phase**: Atomic database transaction
6. **Notify Phase**: Log results, update scan status

### AC-2: Scan Status Tracking
- **pending**: Scan queued but not started
- **in_progress**: Scan currently executing
- **completed**: All phases succeeded
- **failed**: One or more phases failed

### AC-3: Scan Metrics
- **started_at**: Timestamp when scan began
- **completed_at**: Timestamp when scan finished
- **duration_ms**: Total scan time in milliseconds
- **artifacts_found**: Count by type (requirements, user_stories, specs, evidence)
- **commit_sha**: GitHub commit scanned

### AC-4: Phase Failure Handling
- Catch exceptions in each phase
- Log error details (phase name, error message, stack trace)
- Update scan status to "failed"
- Record partial results (artifacts discovered before failure)
- Do not corrupt database (rollback transaction)

### AC-5: Manual Scan Triggering
- REST endpoint: POST /api/v1/repositories/{id}/scan
- Accept optional parameter: commit_sha (default: latest)
- Return scan_id for status polling
- Prevent concurrent scans of same repository

### AC-6: Progress Logging
- Log each phase start/completion to console
- Log artifact counts after discovery
- Log parsing errors (malformed YAML, missing fields)
- Log scan summary (duration, status, artifacts found)
- Write all logs to audit_log table

## Scanning Pipeline Details

```typescript
async scanRepository(repositoryId: string, commitSha?: string): Promise<string> {
  // Create scan record
  const scan = await this.createScan(repositoryId);
  const scanId = scan.id;

  try {
    // Phase 1: Discovery
    const artifacts = await this.discoveryPhase(repositoryId);

    // Phase 2: Fetch
    const contents = await this.fetchPhase(repositoryId, artifacts, commitSha);

    // Phase 3: Parse
    const parsed = await this.parsePhase(contents);

    // Phase 4: Validate
    const validated = await this.validatePhase(parsed);

    // Phase 5: Persist
    const persistedScan = await this.persistPhase(repositoryId, scanId, validated);

    // Phase 6: Notify
    await this.notifyPhase(repositoryId, scanId);

    return scanId;
  } catch (error) {
    await this.markScanFailed(scanId, error);
    throw error;
  }
}
```

## Error Recovery

- **GitHub API failure**: Retry with exponential backoff (3 attempts)
- **Rate limit exceeded**: Pause scan, resume when limit resets
- **Database connection lost**: Rollback transaction, retry once
- **Invalid repository**: Mark repository as error state, notify user

## Child User Stories

- US-006-001: Trigger Manual Scan
- US-006-002: Record Scan Metrics

## Implementing Specifications

- SPEC-006-001: Scan Orchestration Service

## Verification Method

**Operational Qualification (OQ):**
- Unit tests for phase execution order
- Integration tests for complete scan workflow
- Error handling tests (simulate GitHub API failure, database connection loss)

**Performance Qualification (PQ):**
- Scan 100-artifact repository and verify sub-60 second completion
- Verify scan metrics recorded accurately
- User acceptance: Trigger scan via UI and monitor progress
