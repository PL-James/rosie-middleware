# CI Workflow Debugging Summary

**Date:** 2026-02-05  
**Duration:** ~15 minutes  
**Outcome:** ✅ Fully operational evidence generation pipeline

## Initial State

PR #6 merged successfully with:
- Scanner schema fixes
- ROSIE RFC-001 compliance implementation
- Integration tests
- Evidence generation scripts

**Problem:** CI workflow failing to generate evidence artifacts

## Issues Encountered & Fixes

### 1. DATABASE_URL Environment Variable
**Error:** `password authentication failed for user "runner"`

**Root Cause:** ScannerService imports database client that uses `DATABASE_URL`, but workflow only set `TEST_DATABASE_URL`

**Fix:** Added `DATABASE_URL` to workflow environment variables
```yaml
env:
  DATABASE_URL: postgresql://user:password@localhost:5432/rosie_test
  TEST_DATABASE_URL: postgresql://user:password@localhost:5432/rosie_test
```

**Commit:** `4972183`

---

### 2. Integration Test Upsert Logic
**Error:** `expected 'Test 2' to be 'Test 1'` in upsert test

**Root Cause:** Single insert with `onConflictDoUpdate` doesn't trigger update clause - need actual conflict

**Fix:** Changed test to do two sequential inserts
```typescript
// First insert creates record
await db.insert(systemContexts).values({...});

// Second insert with same key triggers conflict
await db.insert(systemContexts).values({...})
  .onConflictDoUpdate({
    target: [systemContexts.repositoryId],
    set: { projectName: 'Test 2' },
  });
```

**Commit:** Included in PR #6

---

### 3. Artifact Parser - Regulatory Field
**Error:** `expected null to be 'FDA 21 CFR Part 11'`

**Root Cause:** Parser only checked markdown sections, not YAML frontmatter

**Fix:** Added frontmatter data check before section fallback
```typescript
regulatory: data.regulatory || sections['Regulatory'] || sections['Regulatory Context']
```

**Commit:** `7dd148a`

---

### 4. User Story Markdown Extraction
**Error:** `expected null to be 'tester'` for `asA` field

**Root Cause:** Parser only checked frontmatter, didn't extract from markdown format

**Fix:** Added regex extraction for markdown patterns
```typescript
const asAMatch = markdown.match(/\*\*As a\*\*\s+(.+?)(?:\n|$)/i);
const iWantMatch = markdown.match(/\*\*I want\*\*\s+(.+?)(?:\n|$)/i);
const soThatMatch = markdown.match(/\*\*So that\*\*\s+(.+?)(?:\n|$)/i);
```

**Commit:** `7dd148a`

---

### 5. Test Results File Location
**Error:** `❌ test-results.json not found`

**Root Cause:** File created in `packages/backend/` workspace, evidence script expects it in root

**Fix:** Changed workflow to use `test:ci` script and move file
```yaml
run: |
  npm run test:ci
  if [ -f packages/backend/test-results.json ]; then
    mv packages/backend/test-results.json ./test-results.json
  fi
```

**Commit:** `14cadd8`, `4972183`

---

### 6. PKCS#8 Key Format
**Error:** `"pkcs8" must be PKCS#8 formatted string`

**Root Cause:** Keys generated in EC PRIVATE KEY format, jose library expects PKCS#8

**Fix:** Regenerated keys with proper format
```bash
openssl ecparam -name prime256v1 -genkey -noout | \
  openssl pkcs8 -topk8 -nocrypt -out .rosie-keys/private-key.pem
```

**Commit:** `9bc6ef5`

---

### 7. Test Results Array Handling
**Error:** `fileResult.testResults is not iterable`

**Root Cause:** Vitest JSON format varies, `testResults` might not be array

**Fix:** Added defensive array check
```typescript
if (!fileResult.testResults || !Array.isArray(fileResult.testResults)) {
  continue;
}
```

**Commit:** `fc547bd`

---

### 8. Vitest JSON Format Field Name
**Error:** No evidence files generated (0/58)

**Root Cause:** Vitest uses `assertionResults` not `testResults` in JSON output

**Fix:** Updated interface and access pattern
```typescript
interface TestFileResult {
  name: string;
  assertionResults: Array<{...}>;  // Changed from testResults
}

// Access pattern
for (const test of fileResult.assertionResults) {
  // Process test
}
```

**Commit:** `838c0c4`

---

### 9. GitHub Actions Permissions
**Error:** `Permission to PL-James/rosie-middleware.git denied to github-actions[bot]`

**Root Cause:** Default `GITHUB_TOKEN` doesn't have write permissions

**Fix:** Added explicit permissions to workflow
```yaml
permissions:
  contents: write  # Allow pushing commits
  pull-requests: write  # Allow commenting on PRs
```

**Commit:** `ebc5cc4`

---

## Final Results

### CI Workflow Status
✅ All tests passing: 136/136  
✅ Evidence generation: 58 files created  
✅ Evidence verification: 58/58 valid  
✅ Auto-commit to repository: Working  
✅ Artifact upload: Working (90-day retention)

### Evidence Coverage
- Total specs with tags: 58
- Evidence files generated: 58
- Verification success: 100%
- Coverage: 58/58 (100% of tagged specs)

### Workflow Performance
- Total duration: ~1 minute
- Test execution: ~20 seconds
- Evidence generation: ~5 seconds
- Verification: <1 second

## Key Learnings

### 1. Vitest JSON Reporter Format
The vitest JSON reporter uses `assertionResults` not `testResults`. This is different from Jest's format. Always verify the actual output structure:
```bash
npm test -- --reporter=json --outputFile=test.json
cat test.json | jq '.testResults[0] | keys'
```

### 2. Drizzle ORM Upsert Behavior
`onConflictDoUpdate` only triggers when there's an actual conflict. For testing upserts, you need two sequential inserts to create the conflict scenario.

### 3. Environment Variables in GitHub Actions
Services (like PostgreSQL) require environment variables to be set at the step level, not just globally. The `db` import happens at module load time, so `DATABASE_URL` must be set for all steps that import database code.

### 4. PKCS#8 Key Format
Modern JavaScript crypto libraries (jose, webcrypto) expect PKCS#8 format for private keys, not the traditional EC PRIVATE KEY format. Always generate with:
```bash
openssl pkcs8 -topk8 -nocrypt
```

### 5. GitHub Actions Write Permissions
The default `GITHUB_TOKEN` in GitHub Actions has read-only permissions. To push commits from workflows, you must explicitly grant `contents: write`.

## Future Improvements

### Short Term
- [x] Improve test failure reporting in CI
- [x] Add defensive programming for JSON parsing
- [ ] Add evidence generation metrics to workflow summary

### Medium Term
- [ ] Parallel test execution for faster CI
- [ ] Evidence diff reports (show what changed)
- [ ] Automated spec coverage warnings

### Long Term
- [ ] Evidence archival to S3/R2
- [ ] Evidence dashboard with web UI
- [ ] Chain-of-custody logging

## Debug Techniques Used

1. **Incremental Fixes:** Fixed one error at a time, verifying each fix before moving to next
2. **Log Analysis:** Used `gh run view --log` to inspect detailed workflow logs
3. **Local Reproduction:** Ran tests locally to compare behavior
4. **Defensive Programming:** Added array/null checks where JSON structure was uncertain
5. **Format Verification:** Used `jq` to inspect JSON structure before writing parsers

## References

- GitHub Actions Workflow: `.github/workflows/test-and-evidence.yml`
- Evidence Generator: `scripts/generate-evidence.ts`
- Evidence Verifier: `scripts/verify-evidence.ts`
- Vitest Docs: https://vitest.dev/guide/reporters.html
- JWS Spec: RFC 7515
