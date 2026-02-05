# ROSIE Evidence Generation Scripts

Scripts for generating and verifying JWS-signed evidence artifacts.

## Scripts

### `generate-evidence.ts`

Generates JWS-signed evidence artifacts from test results.

**Usage:**
```bash
# 1. Run tests with JSON reporter
npm run test:ci

# 2. Generate evidence
npm run generate-evidence
```

**Requires:**
- `test-results.json` (created by vitest JSON reporter)
- Private key in `.rosie-keys/private-key.pem` or `EVIDENCE_PRIVATE_KEY` env var

**Output:**
- Evidence files in `.gxp/evidence/EV-*.jws`

---

### `verify-evidence.ts`

Verifies JWS signatures on evidence artifacts.

**Usage:**
```bash
npm run verify-evidence
```

**Requires:**
- Evidence files in `.gxp/evidence/`
- Public key in `.rosie-keys/public-key.pem` or `EVIDENCE_PUBLIC_KEY` env var

**Output:**
- Verification status for each evidence file
- Coverage report (specs with/without evidence)

---

## Quick Start

### 1. Generate Signing Keys

```bash
mkdir -p .rosie-keys
openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem
openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem
```

### 2. Run Tests

```bash
createdb rosie_test  # One-time setup
TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm run db:migrate
TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm run test:ci
```

### 3. Generate Evidence

```bash
npm run generate-evidence
```

### 4. Verify Evidence

```bash
npm run verify-evidence
```

---

## See Also

- **[Evidence Generation Guide](../docs/EVIDENCE_GENERATION.md)** - Complete documentation
- **[ROSIE Compliance Report](../ROSIE_COMPLIANCE_REPORT.md)** - Current status
