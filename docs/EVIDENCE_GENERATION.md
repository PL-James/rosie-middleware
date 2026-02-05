# ROSIE Evidence Generation Pipeline

**Status:** ✅ Fully Operational (as of 2026-02-05)

## Overview

The ROSIE Middleware now has a fully automated evidence generation pipeline that produces cryptographically signed evidence artifacts for GxP compliance validation. Every push to `main` triggers automated test execution and evidence generation.

## Pipeline Components

### 1. Automated Testing
- **Platform:** GitHub Actions with PostgreSQL 16 service container
- **Test Runner:** Vitest 2.1.9
- **Test Types:** Unit, Integration, End-to-End
- **Coverage:** 136 tests across 16 test files

### 2. Evidence Generation
- **Script:** `scripts/generate-evidence.ts`
- **Input:** Test results from vitest JSON reporter
- **Output:** JWS-signed evidence artifacts (`.gxp/evidence/*.jws`)
- **Signing Algorithm:** ES256 (ECDSA P-256)
- **Key Format:** PKCS#8

### 3. Evidence Verification
- **Script:** `scripts/verify-evidence.ts`
- **Validation:** JWS signature verification, spec coverage analysis
- **Output:** Verification report with pass/fail status

## Evidence Artifact Structure

Each evidence file (`.jws`) contains:

```json
{
  "@context": "https://www.rosie-standard.org/evidence/v1",
  "gxp_id": "EV-SPEC-XXX-YYY",
  "spec_id": "SPEC-XXX-YYY",
  "verification_tier": "IQ|OQ|PQ",
  "test_results": {
    "tool": "vitest",
    "version": "2.1.9",
    "passed": 10,
    "failed": 0,
    "skipped": 0,
    "duration_ms": 1234,
    "test_cases": [...]
  },
  "timestamp": "2026-02-05T21:47:19.580Z",
  "system_state": "git:ebc5cc48ff703e732190738922f450683e694174"
}
```

Signed with JWS header:
```json
{
  "alg": "ES256",
  "typ": "JWT",
  "kid": "rosie-middleware-2026-02-05"
}
```

## Current Coverage

- **Total Specs:** 15
- **Specs with Tests:** 58 (many specs have multiple sub-specifications)
- **Evidence Files Generated:** 58
- **Verification Success Rate:** 100% (58/58)

## GitHub Actions Workflow

**File:** `.github/workflows/test-and-evidence.yml`

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Steps:**
1. Setup Node.js and PostgreSQL
2. Install dependencies
3. Run database migrations
4. Execute all tests (unit + integration)
5. Generate evidence artifacts
6. Verify evidence integrity
7. Upload artifacts (90-day retention)
8. Commit evidence to `main` (on successful push only)
9. Comment PR summary (on pull requests)

## Signing Keys

**Location:** `.rosie-keys/`
- `private-key.pem` - ES256 private key (PKCS#8 format)
- `public-key.pem` - ES256 public key

**CI/CD:**
- Private key stored in GitHub Secrets: `EVIDENCE_PRIVATE_KEY`
- Public key stored in GitHub Secrets: `EVIDENCE_PUBLIC_KEY`
- Ephemeral keys generated if secrets not configured

**Local Development:**
```bash
# Generate new signing keys (if needed)
openssl ecparam -name prime256v1 -genkey -noout | \
  openssl pkcs8 -topk8 -nocrypt -out .rosie-keys/private-key.pem
openssl ec -in .rosie-keys/private-key.pem -pubout \
  -out .rosie-keys/public-key.pem
```

## Running Locally

### Generate Evidence
```bash
# Run tests with JSON reporter
npm run test:ci

# Generate evidence artifacts
npm run generate-evidence
```

### Verify Evidence
```bash
npm run verify-evidence
```

### Manual Test Execution
```bash
# Backend tests only
npm test --workspace=backend

# Integration tests (requires PostgreSQL)
TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test \
  npm test --workspace=backend
```

## GxP Tag Requirements

All tests that contribute to evidence must have GxP tags:

```typescript
/**
 * @gxp-tag SPEC-XXX-YYY
 * @gxp-criticality HIGH|MEDIUM|LOW
 * @test-type unit|integration|e2e
 * @requirement REQ-XXX (optional)
 * @description Brief test description
 */
it('should validate requirement', () => {
  // Test implementation
});
```

## Verification Tiers

- **IQ (Installation Qualification):** System setup and configuration
- **OQ (Operational Qualification):** System functionality and features
- **PQ (Performance Qualification):** System performance and scalability

## Troubleshooting

### Evidence Generation Fails

**Symptom:** No `.jws` files created

**Common Causes:**
1. Test results file not found → Check `test-results.json` exists
2. No GxP tags found → Verify `@gxp-tag` comments in test files
3. Signing keys missing → Check `.rosie-keys/` directory

**Solution:**
```bash
# Verify test results structure
cat test-results.json | jq '.testResults[0] | keys'

# Check for GxP tags
grep -r "@gxp-tag" packages/backend/src --include="*.spec.ts"

# Verify signing keys
ls -la .rosie-keys/
```

### Verification Fails

**Symptom:** `npm run verify-evidence` reports failed signatures

**Common Causes:**
1. Evidence signed with different key → Re-generate with correct key
2. Evidence file corrupted → Re-generate evidence
3. Public key mismatch → Verify `.rosie-keys/public-key.pem`

**Solution:**
```bash
# Re-generate evidence with current keys
npm run generate-evidence

# Verify public key format
openssl ec -pubin -in .rosie-keys/public-key.pem -text
```

### CI Workflow Fails

**Check:**
1. GitHub Actions logs: `gh run list --workflow=test-and-evidence.yml`
2. Database connection: Verify PostgreSQL service container started
3. Test failures: Check test output in workflow logs
4. Permissions: Verify workflow has `contents: write` permission

## Compliance Artifacts

All evidence artifacts are:
- ✅ Cryptographically signed (non-repudiation)
- ✅ Timestamped (temporal validation)
- ✅ Linked to system state (git SHA)
- ✅ Version controlled (committed to repository)
- ✅ Archived (90-day retention in GitHub Artifacts)

## Future Enhancements

- [ ] Evidence archival to long-term storage (S3/R2)
- [ ] PDF compliance report generation
- [ ] Evidence dashboard (view all evidence in web UI)
- [ ] Automated spec coverage tracking
- [ ] Evidence chain-of-custody logging

## References

- ROSIE RFC-001: Evidence Artifact Specification
- ROSIE Standard: https://www.rosie-standard.org/evidence/v1
- JWS Specification: RFC 7515
- ES256 Algorithm: RFC 7518 Section 3.4

## Maintenance

**Quarterly:**
- Review evidence coverage (target: 100% of specs)
- Rotate signing keys (recommended but not required)
- Archive evidence artifacts to long-term storage

**Per Release:**
- Generate full evidence report
- Verify all critical specs have evidence
- Update compliance documentation
