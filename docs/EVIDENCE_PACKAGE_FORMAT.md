# Evidence Package Format

Reference documentation for the tiered evidence package structure defined in ROSIE RFC-001 SS6.2.

## Package Directory Structure

Each evidence package is a self-contained directory under `.gxp/evidence/`. The directory name follows the pattern:

```
{TIER}-{SPEC_ID}-{ISO_TIMESTAMP}
```

Example: `OQ-SPEC-001-001-2026-02-05T14-30-00-000Z`

### Common Structure (All Tiers)

```
OQ-SPEC-001-001-2026-02-05T14-30-00-000Z/
  metadata.json
  environment.json
  test-output.log
  manifest.json
  manifest.jws
  artifacts/
    test-results.json
  configuration/
```

### IQ Package (Installation Qualification)

```
IQ-SPEC-INF-001-2026-02-05T14-30-00-000Z/
  metadata.json
  environment.json
  test-output.log
  manifest.json
  manifest.jws
  artifacts/
    test-results.json
    dependency-tree.json    # IQ-specific
    health-check.json       # IQ-specific
  configuration/
```

### OQ Package (Operational Qualification)

```
OQ-SPEC-001-001-2026-02-05T14-30-00-000Z/
  metadata.json
  environment.json
  test-output.log
  manifest.json
  manifest.jws
  artifacts/
    test-results.json
    coverage-report.json    # OQ-specific
  configuration/
```

### PQ Package (Performance Qualification)

```
PQ-SPEC-008-001-2026-02-05T14-30-00-000Z/
  metadata.json
  environment.json
  test-output.log
  manifest.json
  manifest.jws
  artifacts/
    test-results.json
  screenshots/              # PQ-specific
    dashboard-initial.png
    evidence-mobile.png
  traces/                   # PQ-specific
    trace-001.json
  configuration/
```

## File Schemas

### metadata.json

```json
{
  "@context": "https://www.rosie-standard.org/evidence/v1",
  "package_id": "PKG-OQ-SPEC-001-001-1738765800000",
  "spec_id": "SPEC-001-001",
  "tier": "OQ",
  "traced_user_story": "US-001-001",
  "system_state_hash": "a1b2c3d4e5f6...64 hex chars",
  "git_commit": "ebc5cc48",
  "created_at": "2026-02-05T14:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `@context` | string | Fixed URI identifying the evidence schema version |
| `package_id` | string | Unique identifier: `PKG-{TIER}-{SPEC_ID}-{epoch_ms}` |
| `spec_id` | string | The specification this evidence covers |
| `tier` | `"IQ"` \| `"OQ"` \| `"PQ"` | Verification tier |
| `traced_user_story` | string \| null | User story linked via `@trace` annotation |
| `system_state_hash` | string | SHA-256 hex digest of `/src` tree |
| `git_commit` | string | Short git SHA at time of evidence generation |
| `created_at` | string | ISO 8601 UTC timestamp |

### manifest.json

```json
{
  "package_id": "PKG-OQ-SPEC-001-001-1738765800000",
  "spec_id": "SPEC-001-001",
  "tier": "OQ",
  "created_at": "2026-02-05T14:30:00.000Z",
  "files": [
    {
      "path": "metadata.json",
      "sha256": "a1b2c3d4...64 hex chars",
      "size_bytes": 312
    },
    {
      "path": "environment.json",
      "sha256": "e5f6a7b8...64 hex chars",
      "size_bytes": 487
    },
    {
      "path": "artifacts/test-results.json",
      "sha256": "c9d0e1f2...64 hex chars",
      "size_bytes": 1024
    }
  ],
  "total_size_bytes": 1823,
  "file_count": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `package_id` | string | Copied from metadata.json |
| `spec_id` | string | Specification identifier |
| `tier` | string | Verification tier |
| `created_at` | string | Manifest creation timestamp |
| `files` | `ManifestEntry[]` | Array of file entries (excludes `manifest.json` and `manifest.jws`) |
| `total_size_bytes` | number | Sum of all `size_bytes` values |
| `file_count` | number | Length of `files` array |

Each `ManifestEntry`:

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Relative path from package root |
| `sha256` | string | 64-char hex SHA-256 of file content |
| `size_bytes` | number | File size in bytes |

### manifest.jws

JWS compact serialization (three base64url-encoded segments separated by dots):

```
eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJvc2llLWV2aWRlbmNlLVNQRUMtMDAxLTAwMSJ9.eyJwYWNrYWdlX2lkIjoiUEtHLU9RLVNQRUMtMDAxLTAwMS0xNzM4NzY1ODAwMDAwIiwiZmlsZXMiOlt7InBhdGgiOiJtZXRhZGF0YS5qc29uIiwic2hhMjU2IjoiLi4uIiwic2l6ZV9ieXRlcyI6MzEyfV19.signature
```

Protected header:

```json
{
  "alg": "ES256",
  "typ": "JWT",
  "kid": "rosie-evidence-SPEC-001-001"
}
```

The payload is the full manifest object. The signature is ECDSA P-256. The `kid` field includes the spec ID for key rotation traceability.

### environment.json

```json
{
  "node_version": "v20.11.0",
  "npm_version": "10.2.4",
  "platform": "linux",
  "arch": "x64",
  "os_release": "6.1.0-17-amd64",
  "hostname": "ci-runner-42",
  "username": "runner",
  "cwd": "/home/runner/work/rosie-middleware",
  "env_vars": {
    "NODE_ENV": "test",
    "CI": "true",
    "GITHUB_ACTIONS": "true"
  },
  "timestamp": "2026-02-05T14:30:00.000Z"
}
```

Sensitive environment variables (matching patterns: `key`, `token`, `secret`, `password`, `credential`, `api_key`, `private`) are automatically redacted. Only an explicit allowlist is included: `NODE_ENV`, `PATH`, `SHELL`, `LANG`, `HOME`, `USER`, `CI`, `GITHUB_ACTIONS`, `RAILWAY_ENVIRONMENT`.

## Tier-Specific Artifacts

### IQ: dependency-tree.json

Resolved dependency graph snapshot. Used to verify that the correct versions of all dependencies are installed.

```json
{
  "name": "rosie-middleware-backend",
  "version": "0.1.0",
  "dependencies": {
    "jose": "6.1.3",
    "drizzle-orm": "0.33.0",
    "@nestjs/core": "11.0.0"
  }
}
```

### IQ: health-check.json

Infrastructure readiness report capturing the state of all required services at test time.

```json
{
  "status": "ok",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "disk_space": "sufficient"
  }
}
```

### OQ: coverage-report.json

Code coverage metrics from the test runner.

```json
{
  "lines": { "total": 500, "covered": 425, "pct": 85.0 },
  "branches": { "total": 120, "covered": 96, "pct": 80.0 },
  "functions": { "total": 80, "covered": 72, "pct": 90.0 }
}
```

### PQ: screenshots/

PNG screenshots captured during E2E test execution at multiple viewports:

- Desktop (1280x720)
- Tablet (768x1024)
- Mobile (375x667)

### PQ: traces/

Playwright trace archives (`.zip` or `.json`) that can be replayed using `npx playwright show-trace` for post-mortem debugging of E2E test failures.

## Verification Protocol

The `validatePackage` function performs four checks:

1. **Presence check** -- both `manifest.json` and `manifest.jws` must exist
2. **Signature verification** -- `manifest.jws` must be a valid ES256 JWS decodable with the repository's public key
3. **File integrity** -- every file listed in `manifest.files` must exist with a matching SHA-256 hash
4. **Completeness check** -- no files may exist in the package that are not listed in the manifest (excluding `manifest.json` and `manifest.jws` themselves)

A package passes validation if and only if all four checks succeed.

```typescript
import { validatePackage } from './scripts/lib/evidence-package';
import { readFileSync } from 'fs';

const publicKey = readFileSync('.rosie-keys/public-key.pem', 'utf-8');
const result = await validatePackage('.gxp/evidence/OQ-SPEC-001-001-...', publicKey);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
  process.exit(1);
}
```

Return type:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];  // Empty when valid === true
}
```

## Example Package Listing

Full IQ package as produced in CI:

```
.gxp/evidence/IQ-SPEC-INF-001-2026-02-05T14-30-00-000Z/
  metadata.json          (312 bytes)
  environment.json       (487 bytes)
  test-output.log        (1.2 KB)
  manifest.json          (892 bytes)
  manifest.jws           (624 bytes)
  artifacts/
    test-results.json    (2.1 KB)
    dependency-tree.json (4.8 KB)
    health-check.json    (156 bytes)
  configuration/
```

## Source Reference

Implementation: `scripts/lib/evidence-package.ts`

Key exports:
- `createEvidencePackage(options: PackageOptions): string` -- creates the package directory
- `generateManifest(packageDir: string): Manifest` -- hashes all files into a manifest
- `signManifest(manifest: Manifest, privateKeyPem: string): Promise<string>` -- produces JWS
- `validatePackage(packageDir: string, publicKeyPem: string): Promise<ValidationResult>` -- verifies
