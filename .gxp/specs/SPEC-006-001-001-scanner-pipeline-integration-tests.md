---
gxp_id: SPEC-006-001-001
title: "Scanner Pipeline Integration Tests"
parent_id: SPEC-006-001
verification_tier: OQ
design_approach: |
  Integration tests that exercise the complete 6-phase scanning pipeline with
  real database operations. Tests verify schema alignment, upsert behavior,
  unique constraints, and artifact persistence.
source_files:
  - packages/backend/src/modules/scanner/scanner.service.ts
test_files:
  - packages/backend/src/modules/scanner/scanner-pipeline.integration.spec.ts
validation_status: DRAFT
---

## Operational Qualification (OQ)

Validates scanner pipeline integration with database persistence layer.

## Test Coverage

### SPEC-006-001-001-001: Complete Pipeline Execution
**Criticality:** HIGH
**Test Type:** Integration
**Requirement:** REQ-006

Verifies all 6 phases (Discovery → Fetch → Parse → Validate → Persist → Notify)
execute successfully and persist artifacts to database.

**Assertions:**
- Scan status transitions to 'completed'
- systemContexts persists with all schema fields
- requirements persist with correct foreign keys
- userStories link to parent requirements
- specs link to parent user stories
- fileChecksums track scanned files

### SPEC-006-001-001-002: Upsert Behavior on Rescan
**Criticality:** HIGH
**Test Type:** Integration
**Requirement:** REQ-006

Verifies UPSERT operations prevent duplicate artifacts when scanning
same repository multiple times.

**Assertions:**
- Artifact counts remain stable across rescans
- scanId updates to latest scan
- No duplicate records created
- Unique constraints enforced

### SPEC-006-001-001-003: Unique Constraint Validation
**Criticality:** HIGH
**Test Type:** Integration
**Requirement:** REQ-005

Validates that unique constraints exist and work correctly for all
ON CONFLICT targets.

**Assertions:**
- systemContexts (repository_id) unique constraint enforced
- requirements (repository_id, gxp_id) unique constraint enforced
- userStories (repository_id, gxp_id) unique constraint enforced
- specs (repository_id, gxp_id) unique constraint enforced
- evidence (repository_id, gxp_id) unique constraint enforced
- fileChecksums (repository_id, file_path) unique constraint enforced

### SPEC-006-001-001-004: Schema Field Alignment
**Criticality:** HIGH
**Test Type:** Integration
**Requirement:** REQ-005

Ensures all database insert/update operations reference only fields
that exist in the schema.

**Assertions:**
- systemContexts fields match schema (no description, businessContext, etc.)
- evidence has createdAt but NOT updatedAt
- requirements, userStories, specs have both createdAt and updatedAt
- All JSONB fields accept structured data
- All enum fields accept only valid values

### SPEC-006-001-001-005: File Checksum Updates
**Criticality:** HIGH
**Test Type:** Integration
**Requirement:** REQ-006

Validates incremental scanning correctly updates file checksums.

**Assertions:**
- Checksums update on rescan
- lastScannedAt timestamp advances
- updatedAt timestamp advances
- Unique constraint (repository_id, file_path) prevents duplicates

## Why These Tests Are Critical

**Prevention of Production Errors:**
These tests would have caught all three schema mismatch errors that
occurred in production:

1. **systemContexts missing unique constraint** - Test 3 validates constraints exist
2. **systemContexts field mismatch** - Test 4 validates field alignment
3. **evidence.updatedAt** - Test 4 validates schema-code match

**Test-Driven Persistence:**
Unlike existing tests (scanner.service.spec.ts, scanner.integration.spec.ts)
which only test pagination arithmetic, these tests actually:
- Instantiate ScannerService
- Call executeScan() method
- Execute Phase 5 (Persist)
- Verify database state

**Regression Prevention:**
These tests establish baseline expectations for:
- Upsert behavior
- Unique constraint enforcement
- Schema field alignment
- Foreign key relationships

## Implementation Notes

**Test Database:**
Tests require `TEST_DATABASE_URL` environment variable:
```bash
TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm test
```

**CI Integration:**
Currently skipped in CI via `describeIntegration` wrapper.
Should be enabled once CI has test database provisioned.

**Mock Strategy:**
- GitHub API client is mocked (no real GitHub requests)
- Database operations are real (uses test database)
- All services except GitHub client are real instances

## Future Enhancements

- Add evidence artifact tests (currently only requirements, user stories, specs)
- Test traceability link creation
- Test delta detection / incremental scanning
- Test error handling for malformed artifacts
- Add performance benchmarks (scan duration, artifact counts)
