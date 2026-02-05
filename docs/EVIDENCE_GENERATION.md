# Evidence Generation for ROSIE Compliance

This document explains how to generate and verify JWS-signed evidence artifacts for ROSIE RFC-001 compliance.

---

## Overview

**What is Evidence?**

Evidence artifacts are cryptographically signed JSON files that prove:
1. Tests were executed at a specific git commit
2. Test results (passed/failed counts)
3. When the tests ran (timestamp)
4. What tool ran them (vitest version)

**Why JWS Signatures?**

JSON Web Signatures (JWS) provide:
- ✅ **Tamper-proof verification** - Any modification invalidates the signature
- ✅ **Authenticity** - Proves evidence was created by authorized party
- ✅ **Regulatory compliance** - Meets FDA 21 CFR Part 11 requirements

---

## Quick Start

### 1. Generate Signing Keys (One-Time Setup)

**For local development:**

```bash
# Create keys directory
mkdir -p .rosie-keys

# Generate EC private key (P-256 curve)
openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem

# Extract public key
openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem

# Secure the private key
chmod 600 .rosie-keys/private-key.pem

# Add to .gitignore (already configured)
echo ".rosie-keys/" >> .gitignore
```

**Important:** Never commit private keys to git!

### 2. Run Tests

```bash
# Set up test database (one-time)
createdb rosie_test
TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm run db:migrate

# Run tests with JSON reporter
TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm run test:ci
```

This creates `test-results.json` with test execution details.

### 3. Generate Evidence

```bash
npm run generate-evidence
```

**Output:**
```
🔬 ROSIE Evidence Generator
============================

📊 Loading test results...
   Found 16 test files
   Total tests: 143
   Passed: 143
   Failed: 0

🏷️  Extracting GxP tags from test files...
   Found 18 specs with tests

🔐 Loading signing keys...
   Private key loaded

📝 System state: git:b99d0f7

🔧 Test tool: vitest 2.1.0

📝 Generating evidence artifacts...
   ✅ SPEC-006-001-001: 5/5 tests passed
   ✅ SPEC-002-001: 15/15 tests passed
   ✅ SPEC-004-002: 10/10 tests passed
   ...

✅ Evidence generation complete!
📁 18 evidence files created in .gxp/evidence/
```

### 4. Verify Evidence

```bash
npm run verify-evidence
```

**Output:**
```
🔍 ROSIE Evidence Verifier
===========================

🔐 Loading public key...
   Public key loaded

📁 Found 18 evidence files

🔬 Verifying evidence signatures...

   ✅ EV-SPEC-006-001-001.jws
      Spec: SPEC-006-001-001
      Tests: 5 passed, 0 failed
      Timestamp: 2026-02-05T18:30:45.123Z
      System: git:b99d0f7abc123...

   ✅ EV-SPEC-002-001.jws
      ...

📊 Verification Summary:
   Evidence files: 18
   Verified: 18
   Failed: 0
   Spec coverage: 18/18 (100%)

✅ All evidence verified successfully
```

---

## CI/CD Setup (GitHub Actions)

### 1. Add Signing Keys to GitHub Secrets

```bash
# Display private key (copy the output)
cat .rosie-keys/private-key.pem

# Go to GitHub: Settings → Secrets and variables → Actions → New repository secret
# Name: EVIDENCE_PRIVATE_KEY
# Value: (paste private key, including -----BEGIN/END----- lines)

# Display public key (copy the output)
cat .rosie-keys/public-key.pem

# Add another secret:
# Name: EVIDENCE_PUBLIC_KEY
# Value: (paste public key)
```

### 2. CI Workflow Automatically Runs

The `.github/workflows/test-and-evidence.yml` workflow:

**On Every PR:**
- ✅ Runs all tests (including integration tests with PostgreSQL)
- ✅ Generates evidence artifacts
- ✅ Verifies evidence signatures
- ✅ Uploads evidence as downloadable artifact
- ❌ Does NOT commit evidence (PR branch)

**On Merge to Main:**
- ✅ Runs all tests
- ✅ Generates evidence artifacts
- ✅ Verifies evidence signatures
- ✅ **Commits evidence to main branch**
- ✅ Evidence always stays synchronized with code

---

## Evidence File Format

### Structure

```
.gxp/evidence/EV-SPEC-006-001-001.jws
```

**Contents (JWS compact format):**
```
eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJvc2llLW1pZGRsZXdhcmUtMjAyNi0wMi0wNSJ9.eyJAY29udGV4dCI6Imh0dHBzOi8vd3d3LnJvc2llLXN0YW5kYXJkLm9yZy9ldmlkZW5jZS92MSIsImd4cF9pZCI6IkVWLVNQRUMtMDA2LTAwMS0wMDEiLCJzcGVjX2lkIjoiU1BFQy0wMDYtMDAxLTAwMSIsInZlcmlmaWNhdGlvbl90aWVyIjoiT1EiLCJ0ZXN0X3Jlc3VsdHMiOnsidG9vbCI6InZpdGVzdCIsInZlcnNpb24iOiIyLjEuMCIsInBhc3NlZCI6NSwiZmFpbGVkIjowLCJza2lwcGVkIjowLCJkdXJhdGlvbl9tcyI6MTIzNCwidGVzdF9jYXNlcyI6W119LCJ0aW1lc3RhbXAiOiIyMDI2LTAyLTA1VDE4OjMwOjQ1LjEyM1oiLCJzeXN0ZW1fc3RhdGUiOiJnaXQ6Yjk5ZDBmN2FiYzEyMyJ9.MEUCIQDXxY1Z2...
```

**Decoded payload:**
```json
{
  "@context": "https://www.rosie-standard.org/evidence/v1",
  "gxp_id": "EV-SPEC-006-001-001",
  "spec_id": "SPEC-006-001-001",
  "verification_tier": "OQ",
  "test_results": {
    "tool": "vitest",
    "version": "2.1.0",
    "passed": 5,
    "failed": 0,
    "skipped": 0,
    "duration_ms": 1234,
    "test_cases": [
      {
        "name": "should execute complete scan pipeline and persist all artifacts",
        "status": "passed",
        "duration": 234,
        "ancestorTitles": ["ScannerService - Full Pipeline Integration"]
      }
    ]
  },
  "timestamp": "2026-02-05T18:30:45.123Z",
  "system_state": "git:b99d0f7abc123..."
}
```

### Verification

Anyone can verify evidence with the public key:

```typescript
import { jwtVerify, importSPKI } from 'jose';

const jws = readFileSync('.gxp/evidence/EV-SPEC-006-001-001.jws', 'utf-8');
const publicKeyPem = readFileSync('.rosie-keys/public-key.pem', 'utf-8');
const publicKey = await importSPKI(publicKeyPem, 'ES256');

const { payload } = await jwtVerify(jws, publicKey);
console.log('Evidence verified:', payload);
// ✅ Signature valid, evidence is authentic
```

---

## How Scanner Ingests Evidence

When you run a scan, the scanner:

1. **Discovers** `.gxp/evidence/*.jws` files
2. **Parses** JWS (verifies signature, extracts payload)
3. **Persists** to database:

```sql
INSERT INTO evidence (
  repository_id,
  scan_id,
  spec_id,
  gxp_id,
  file_name,
  file_path,
  verification_tier,
  jws_payload,
  jws_header,
  signature,
  test_results,
  system_state,
  timestamp
) VALUES (...);
```

4. **Links** evidence to specs via `spec_id`

Evidence is now queryable via API:
```
GET /api/repositories/{id}/evidence
GET /api/evidence/{id}
```

---

## Troubleshooting

### "No private key found"

**Error:**
```
❌ No private key found in .rosie-keys/private-key.pem
```

**Solution:**
```bash
# Generate signing keys (see step 1)
mkdir -p .rosie-keys
openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem
openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem
```

### "test-results.json not found"

**Error:**
```
❌ test-results.json not found
```

**Solution:**
```bash
# Run tests with JSON reporter
npm run test:ci
```

### "Evidence verification failed"

**Error:**
```
❌ EV-SPEC-006-001-001.jws
   Error: signature verification failed
```

**Causes:**
- Evidence file was manually edited (tampering)
- Wrong public key used for verification
- Evidence generated with different private key

**Solution:**
- Regenerate evidence: `npm run generate-evidence`
- Ensure public/private key pair match

### "Integration tests skipped"

**Issue:**
Integration tests show as skipped in test output.

**Cause:**
`TEST_DATABASE_URL` not set.

**Solution:**
```bash
# Set up test database
createdb rosie_test

# Run tests with TEST_DATABASE_URL
TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm test
```

---

## Best Practices

### 1. Key Management

**✅ DO:**
- Store private key in `.rosie-keys/` (git-ignored)
- Add private key to CI secrets (GitHub Actions)
- Keep public key in repo or documentation
- Use separate keys for dev/staging/production

**❌ DON'T:**
- Commit private keys to git
- Share private keys via email/Slack
- Reuse keys across projects
- Store keys in environment variables (use files or secrets manager)

### 2. Evidence Lifecycle

**Development:**
```bash
# After implementing new feature with tests
npm run test:ci
npm run generate-evidence
git add .gxp/evidence/
git commit -m "feat: add feature X with evidence"
```

**CI/CD:**
- Let CI auto-generate evidence on merge to main
- Review evidence artifacts in PR (downloadable)
- Verify evidence before merge: `npm run verify-evidence`

**Production:**
- Evidence files live in git (immutable history)
- Scanner ingests on every scan
- Evidence links to specs in database

### 3. Audit Trail

Every evidence file has:
- ✅ Git commit SHA (reproducible)
- ✅ Timestamp (when tests ran)
- ✅ JWS signature (tamper-proof)
- ✅ Test results (what passed/failed)

**Auditors can verify:**
```bash
# 1. Checkout specific commit
git checkout b99d0f7abc123

# 2. Verify evidence signature
npm run verify-evidence

# 3. Re-run tests (should produce same results)
npm run test:ci

# 4. Compare test results
diff test-results.json .gxp/evidence/EV-*.jws
```

---

## FAQ

### Q: Do I need to generate evidence locally?

**A:** No, CI auto-generates evidence on merge to main. Local generation is optional for testing.

### Q: What happens if tests fail?

**A:** Evidence is still generated, but `failed` count will be > 0. CI will fail and evidence won't be committed.

### Q: Can I edit evidence files?

**A:** No! JWS signatures prevent tampering. Any edit invalidates the signature.

### Q: How long are evidence files valid?

**A:** 10 years (set in JWS expiration). Evidence is immutable once committed.

### Q: What if I lose the private key?

**A:** Generate a new key pair, regenerate all evidence. Old evidence remains valid (verified with old public key).

### Q: Do evidence files slow down git?

**A:** No, they're small text files (~2-5KB each). 18 files = ~100KB total.

---

## Related Documentation

- **ROSIE RFC-001:** https://www.rosie-standard.org/rfc/001
- **JWS (RFC 7515):** https://datatracker.ietf.org/doc/html/rfc7515
- **FDA 21 CFR Part 11:** Electronic records and signatures
- **GitHub Actions Secrets:** https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

**Generated:** 2026-02-05
**Version:** 1.0.0
**Status:** Production Ready
