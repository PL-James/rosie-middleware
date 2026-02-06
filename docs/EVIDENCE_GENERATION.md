# ROSIE Evidence Generation Pipeline

## Overview

The ROSIE Middleware generates cryptographically signed evidence artifacts for GxP compliance validation. The pipeline runs on every push to `main` and on every pull request, producing both legacy JWS files and tiered evidence packages.

## Dual-Mode Output

The pipeline produces evidence in two formats for backward compatibility:

### Legacy JWS (Single-File)

Individual `.jws` files in `.gxp/evidence/`, each containing a signed payload with test results for one specification. Format:

```
.gxp/evidence/EV-SPEC-001-001.jws
.gxp/evidence/EV-SPEC-002-001.jws
```

Payload structure:

```json
{
  "@context": "https://www.rosie-standard.org/evidence/v1",
  "gxp_id": "EV-SPEC-001-001",
  "spec_id": "SPEC-001-001",
  "verification_tier": "OQ",
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

### Tiered Evidence Packages (Directory-Based)

Self-contained directories in `.gxp/evidence/`, one per specification per tier, containing metadata, environment snapshot, test results, manifest, and signed manifest. Format:

```
.gxp/evidence/IQ-SPEC-INF-001-2026-02-05T14-30-00-000Z/
.gxp/evidence/OQ-SPEC-001-001-2026-02-05T14-30-00-000Z/
.gxp/evidence/PQ-SPEC-008-001-2026-02-05T14-30-00-000Z/
```

See `docs/EVIDENCE_PACKAGE_FORMAT.md` for the full directory structure and file schemas.

## Evidence Generation Pipeline

```
Test Execution
     |
     v
Parse Test Results (vitest JSON reporter output)
     |
     v
Parse GxP Annotations (@gxp-tag, @trace, @test-type)
     |
     v
Compute system_state_hash (SHA-256 of /src tree)
     |
     v
Route results by tier (IQ / OQ / PQ)
     |
     v
Create Evidence Packages (tier-specific directories)
     |
     v
Generate Manifests (SHA-256 hash of all package files)
     |
     v
Sign Manifests (ES256 JWS compact serialization)
     |
     v
Verify Packages (validatePackage protocol)
     |
     v
Commit + Upload Artifacts
```

### Step 1: Test Execution

Tests run via Vitest with JSON reporter output:

```bash
npm run test:ci
# Produces test-results.json in vitest JSON format
```

E2E tests run via Playwright:

```bash
cd packages/frontend && npx playwright test --reporter=json
# Produces e2e-results.json + screenshots + traces
```

### Step 2: GxP Annotation Parsing

The pipeline scans test files for annotation blocks:

```typescript
/**
 * @gxp-tag SPEC-001-001
 * @trace US-001-001
 * @gxp-criticality HIGH
 * @test-type OQ
 */
```

Annotations parsed:

| Annotation | Required | Description |
|-----------|----------|-------------|
| `@gxp-tag` | Yes | Links to SPEC-XXX-YYY specification |
| `@trace` | Yes | Links to US-XXX-YYY user story |
| `@test-type` | Yes | Declares tier: `IQ`, `OQ`, or `PQ` |
| `@gxp-criticality` | Recommended | `HIGH`, `MEDIUM`, or `LOW` |
| `@requirement` | Optional | Links to REQ-XXX |
| `@description` | Optional | Free-text purpose |

### Step 3: system_state_hash Computation

A deterministic SHA-256 hash of the entire `/src` tree, ensuring evidence is bound to specific code.

Algorithm (implemented in `scripts/lib/system-state-hash.ts`):

1. Recursively enumerate all files under the source directory
2. Skip `node_modules/` and hidden directories (starting with `.`)
3. Sort file list by relative path (lexicographic, ascending)
4. Initialize SHA-256 hash context
5. For each file: hash the relative path (UTF-8), then hash the file content (binary)
6. Finalize as 64-character lowercase hex string

```typescript
import { computeSrcTreeHash } from './scripts/lib/system-state-hash';

const hash = computeSrcTreeHash('/path/to/src');
// => "a1b2c3d4e5f6..." (64 hex characters)
```

Including the file path in the hash means renamed files produce a different hash even if content is unchanged.

### Step 4: Tier Routing

Test results are grouped by their `@test-type` annotation:

| Tier | Source | Additional Artifacts |
|------|--------|---------------------|
| IQ | Backend infrastructure tests | dependency-tree.json, health-check.json |
| OQ | Backend unit/integration tests | coverage-report.json |
| PQ | Frontend E2E tests (Playwright) | screenshots/, traces/ |

### Step 5: Package Creation

```typescript
import { createEvidencePackage } from './scripts/lib/evidence-package';

const pkgDir = createEvidencePackage({
  specId: 'SPEC-001-001',
  tier: 'OQ',
  outputDir: '.gxp/evidence',
  testResults: parsedResults,
  systemStateHash: hash,
  gitCommit: 'ebc5cc48',
  tracedUserStory: 'US-001-001',
  coverageReport: coverageData,  // OQ-specific
});
```

### Step 6: Manifest + Signing

```typescript
import { generateManifest, signManifest } from './scripts/lib/evidence-package';
import { readFileSync, writeFileSync } from 'fs';

const manifest = generateManifest(pkgDir);
writeFileSync(`${pkgDir}/manifest.json`, JSON.stringify(manifest, null, 2));

const privateKey = readFileSync('.rosie-keys/private-key.pem', 'utf-8');
const jws = await signManifest(manifest, privateKey);
writeFileSync(`${pkgDir}/manifest.jws`, jws);
```

### Step 7: Verification

```typescript
import { validatePackage } from './scripts/lib/evidence-package';

const publicKey = readFileSync('.rosie-keys/public-key.pem', 'utf-8');
const result = await validatePackage(pkgDir, publicKey);

if (!result.valid) {
  console.error('Evidence package verification failed:', result.errors);
  process.exit(1);
}
```

## GxP Tag Annotation Examples

### OQ Test (Unit/Integration)

```typescript
/**
 * Repository Service -- CRUD operations and validation
 *
 * @gxp-tag SPEC-001-001
 * @trace US-001-001
 * @gxp-criticality HIGH
 * @test-type OQ
 * @description OQ -- repository registration and deletion
 */
describe('RepositoryService', () => {
  it('should register a new repository', () => { ... });
  it('should reject duplicate git URLs', () => { ... });
});
```

### IQ Test (Infrastructure)

```typescript
/**
 * Database Schema Verification
 *
 * @gxp-tag SPEC-INF-001
 * @trace US-INF-001
 * @gxp-criticality HIGH
 * @test-type IQ
 * @description IQ -- verify database schema and migrations
 */
describe('Database Schema', () => {
  it('should have all required tables', () => { ... });
  it('should enforce foreign key constraints', () => { ... });
});
```

### PQ Test (E2E)

```typescript
/**
 * PQ -- Evidence Verification E2E Tests
 *
 * @gxp-tag SPEC-008-003
 * @trace US-008-001
 * @gxp-criticality HIGH
 * @test-type PQ
 * @description PQ -- QA Team: evidence list and verification UI
 */
test.describe('Evidence Verification', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({ path: 'test-results/screenshots/evidence-app-load.png' });
  });
});
```

## @test-type Annotation

The `@test-type` annotation determines which tier the test results are routed to:

| Value | Tier | Test Runner | Artifacts |
|-------|------|-------------|-----------|
| `IQ` | Installation Qualification | Vitest | dependency-tree, health-check |
| `OQ` | Operational Qualification | Vitest | coverage-report |
| `PQ` | Performance Qualification | Playwright | screenshots, traces |

Every test file MUST have exactly one `@test-type` annotation. A file without this annotation will not have its results included in any evidence package.

## CI/CD Integration

Workflow: `.github/workflows/test-and-evidence.yml`

### Triggers

- Push to `main` branch
- Pull requests targeting `main`

### Pipeline Steps

1. **Setup** -- Node.js 20, PostgreSQL 16 service container, Playwright browsers
2. **Migrate** -- Run Drizzle ORM migrations against test database
3. **Test** -- `npm run test:ci` (Vitest with JSON reporter)
4. **E2E** -- Start backend, run Playwright tests, capture screenshots/traces
5. **Keys** -- Load signing keys from GitHub Secrets (or generate ephemeral keys)
6. **Generate** -- `npm run generate-evidence` (creates JWS files + tiered packages)
7. **Verify** -- `npm run verify-evidence` (validates all packages)
8. **Upload** -- Upload evidence artifacts to GitHub (90-day retention)
9. **Commit** -- On `main` push, commit evidence to repository
10. **Comment** -- On PRs, post evidence summary as PR comment

### Required Secrets

| Secret | Description |
|--------|-------------|
| `EVIDENCE_PRIVATE_KEY` | ES256 private key (PKCS#8 PEM) |
| `EVIDENCE_PUBLIC_KEY` | ES256 public key (SPKI PEM) |

If secrets are not configured, ephemeral keys are generated per run.

### Signing Keys

Generate locally:

```bash
mkdir -p .rosie-keys
openssl ecparam -name prime256v1 -genkey -noout | \
  openssl pkcs8 -topk8 -nocrypt -out .rosie-keys/private-key.pem
openssl ec -in .rosie-keys/private-key.pem -pubout \
  -out .rosie-keys/public-key.pem
```

The `.rosie-keys/` directory is gitignored. For CI, store the key contents in GitHub Secrets.

## Running Locally

### Generate evidence

```bash
# Run tests with JSON reporter
npm run test:ci

# Generate evidence artifacts
npm run generate-evidence
```

### Verify evidence

```bash
npm run verify-evidence
```

### Full local cycle

```bash
npm run test:ci && npm run generate-evidence && npm run verify-evidence
```

## Troubleshooting

### No evidence packages created

1. Check that `test-results.json` exists after `npm run test:ci`
2. Verify `@gxp-tag` annotations exist in test files: `grep -r "@gxp-tag" packages/backend/src --include="*.spec.ts"`
3. Check signing keys exist: `ls -la .rosie-keys/`

### Verification fails

1. Re-generate evidence with current keys: `npm run generate-evidence`
2. Check public key format: `openssl ec -pubin -in .rosie-keys/public-key.pem -text`
3. Ensure files were not modified after signing

### CI workflow failures

1. Check GitHub Actions logs: `gh run list --workflow=test-and-evidence.yml`
2. Verify PostgreSQL service container started
3. Check workflow permissions: `contents: write` and `pull-requests: write` are required
