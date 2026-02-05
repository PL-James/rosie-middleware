# Root Cause Analysis: Scanner Schema Mismatch Errors

## Executive Summary

Multiple schema mismatch errors occurred in production due to:
1. **Missing unique constraints** on tables used in UPSERT operations
2. **Field references to non-existent columns**
3. **Zero test coverage** for database persistence logic

## Timeline of Errors

### Error 1: systemContexts Missing Unique Constraint
**Symptom:** `PostgresError: there is no unique or exclusion constraint matching the ON CONFLICT specification`

**Location:** `scanner.service.ts:276`
```typescript
.onConflictDoUpdate({
  target: [systemContexts.repositoryId], // ❌ No unique constraint!
```

**Root Cause:**
- Code assumed unique constraint on `repository_id`
- Schema only had regular index (line 151-153 in schema.ts)
- PostgreSQL requires UNIQUE constraint for ON CONFLICT

**Fix Applied:** Migration 0005 - Convert index to uniqueIndex

---

### Error 2: systemContexts Field Mismatch
**Symptom:** TypeScript compilation error - fields don't exist

**Location:** `scanner.service.ts:282-289` (commit 3032bcd)

**Code tried to update:**
- `description`, `businessContext`, `technicalContext`, `qualityAttributes`, `constraints`, `assumptions`, `rawContent`, `updatedAt`

**Actual schema fields:**
- `projectName`, `version`, `gxpRiskRating`, `validationStatus`, `intendedUse`, `regulatory`, `systemOwner`, `technicalContact`, `sections`

**Root Cause:** Code was written against an outdated or imagined schema specification

**Fix Applied:** Commit a637662 - Updated scanner.service.ts to use actual fields

---

### Error 3: evidence.updatedAt
**Symptom:** TypeScript compilation error - `updatedAt` does not exist on evidence table

**Location:** `scanner.service.ts:442`

**Root Cause:**
- `evidence` table only has `createdAt` (schema.ts:309)
- Other artifact tables (requirements, userStories, specs) have both `createdAt` and `updatedAt`
- Developer copy-pasted upsert logic without checking schema

**Fix Applied:** Commit 1b5b258 - Removed `updatedAt` from evidence upsert

---

## Complete Upsert Audit

| Table | Target Columns | Unique Constraint | Status |
|-------|---------------|-------------------|--------|
| systemContexts | `[repositoryId]` | ✅ Added in migration 0005 | **FIXED** |
| requirements | `[repositoryId, gxpId]` | ✅ Exists (line 184-187) | OK |
| userStories | `[repositoryId, gxpId]` | ✅ Exists (line 227-230) | OK |
| specs | `[repositoryId, gxpId]` | ✅ Exists (line 269-272) | OK |
| evidence | `[repositoryId, gxpId]` | ❌ **MISSING** (line 316 - regular index only) | **BUG** |
| fileChecksums | `[repositoryId, filePath]` | ✅ Exists (line 121-124) | OK |

**Critical Issue:** `evidence` table upsert will fail with same error as systemContexts!

---

## Why Tests Didn't Catch This

### Current Test Coverage Analysis

**Unit Tests (`scanner.service.spec.ts`):**
- Only tests pagination arithmetic (offset calculations)
- Does NOT instantiate ScannerService
- Does NOT call any actual methods
- Does NOT test database operations

**Integration Tests (`scanner.integration.spec.ts`):**
- Only tests pagination SQL queries
- Does NOT test the scan pipeline
- Does NOT test Phase 5 (Persist)
- Skipped in CI (`process.env.CI ? describe.skip : describe`)

**Missing:**
- ❌ No tests for `executeScan()` method
- ❌ No tests for Phase 5 persistence
- ❌ No tests for upsert operations
- ❌ No tests that exercise `systemContexts`, `requirements`, `userStories`, `specs`, or `evidence` inserts
- ❌ No schema validation tests

### Search Results

```bash
$ grep -r "systemContexts" packages/backend/src --include="*.spec.ts"
# No results

$ grep -r "executeScan" packages/backend/src --include="*.spec.ts"
# No results

$ grep -r "onConflictDoUpdate" packages/backend/src --include="*.spec.ts"
# No results
```

**Conclusion:** The core scanning logic has ZERO test coverage.

---

## Why This Happened

### 1. **Code Written Before Schema**
- Scanner service upsert logic was written assuming certain schema structure
- Schema was created later without matching those assumptions
- No validation between code and schema

### 2. **Copy-Paste Without Verification**
- Upsert logic for evidence copied from requirements/userStories/specs
- Assumed all tables have `updatedAt` - didn't verify
- Assumed all tables have unique constraints - didn't verify

### 3. **Integration Tests Skipped in CI**
- Tests that might catch this are marked `describe.skip` in CI
- Only run locally if developer remembers to set `TEST_DATABASE_URL`
- CI builds with TypeScript compilation only - doesn't catch runtime errors

### 4. **No Type Safety for SQL Operations**
- Drizzle ORM doesn't prevent referencing non-existent columns in `sql\`excluded.field_name\``
- TypeScript compilation succeeds even with wrong field names
- Errors only surface at runtime when PostgreSQL rejects the query

### 5. **Lack of Schema Linting**
- No automated checks that upsert targets have unique constraints
- No automated checks that `set` fields exist in schema
- No pre-commit hooks to validate schema-code alignment

---

## Recommended Fixes

### Immediate (This PR)

1. ✅ Add unique constraint to `systemContexts.repository_id` (migration 0005)
2. ✅ Fix systemContexts field references (commit a637662)
3. ✅ Remove evidence.updatedAt (commit 1b5b258)
4. ❌ **TODO:** Add unique constraint to `evidence (repository_id, gxp_id)`
5. ❌ **TODO:** Verify all other upserts

### Short-Term (Next Sprint)

6. **Add Integration Tests for Scan Pipeline**
   - Test that actually calls `executeScan()`
   - Verifies all 6 phases complete successfully
   - Checks that artifacts are persisted to database
   - Uses in-memory PostgreSQL or test container
   - Runs in CI (not skipped)

7. **Add Schema Validation Tests**
   - For each table with upserts, verify:
     - Unique constraint exists on ON CONFLICT target columns
     - All `set` fields exist in schema
     - Field types match

8. **Add Pre-Commit Hook**
   - Runs TypeScript build
   - Runs schema validation tests
   - Blocks commit if upsert targets missing unique constraints

### Long-Term (Technical Debt)

9. **Typed SQL Builders**
   - Replace `sql\`excluded.field\`` with typed field references
   - Use Drizzle's typed builders: `excluded.fieldName` instead of string templates
   - TypeScript will catch non-existent fields at compile time

10. **E2E Tests**
    - Full scan of real repository with all artifact types
    - Verify complete traceability chain
    - Test rescan/upsert behavior

11. **CI Database**
    - Set up test database in CI pipeline
    - Remove `describe.skip` from integration tests
    - Run full test suite including database operations

---

## Prevention Strategy

**Rule 1:** Never write database operations without corresponding tests
**Rule 2:** Always verify unique constraints exist before using ON CONFLICT
**Rule 3:** Always check schema before referencing fields in SQL
**Rule 4:** Integration tests must run in CI, not just locally
**Rule 5:** Schema changes require migration + test update in same commit

---

## Action Items

- [ ] Fix evidence table unique constraint (new migration)
- [ ] Write integration test for full scan pipeline
- [ ] Add schema validation test suite
- [ ] Remove `describe.skip` from integration tests
- [ ] Add pre-commit hook for schema validation
- [ ] Document testing requirements in CONTRIBUTING.md

---

## Files Modified in This Bugfix Branch

1. `packages/backend/src/db/schema.ts` - Added unique constraint to systemContexts.repositoryId
2. `packages/backend/src/modules/scanner/scanner.service.ts` - Fixed field references, removed evidence.updatedAt
3. `packages/backend/drizzle/0005_dazzling_marvel_zombies.sql` - Migration to add unique constraint
4. `packages/backend/drizzle/meta/0005_snapshot.json` - Migration metadata
5. `packages/backend/drizzle/meta/_journal.json` - Migration journal

---

**Generated:** 2026-02-05
**Branch:** `bugfix/scanner-schema-fixes`
**Author:** Claude Code (with James Gannon)
