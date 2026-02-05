import { createHash } from 'crypto';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  statSync,
  copyFileSync,
} from 'fs';
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import path from 'path';
import { captureEnvironment } from './environment-snapshot';

/**
 * Evidence Package Library
 *
 * Creates tiered evidence packages (IQ/OQ/PQ) with manifest generation
 * and JWS signing for ROSIE RFC-001 compliance.
 *
 * @gxp-tag SPEC-INF-004
 * @trace US-INF-004
 * @gxp-criticality HIGH
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PackageOptions {
  specId: string;
  tier: 'IQ' | 'OQ' | 'PQ';
  outputDir: string;
  testResults: any;
  systemStateHash: string;
  gitCommit: string;
  tracedUserStory?: string;
  screenshotsDir?: string;  // PQ only
  tracesDir?: string;       // PQ only
  coverageReport?: any;     // OQ only
  dependencyTree?: any;     // IQ only
  healthCheck?: any;        // IQ only
}

export interface ManifestEntry {
  path: string;
  sha256: string;
  size_bytes: number;
}

export interface Manifest {
  package_id: string;
  spec_id: string;
  tier: 'IQ' | 'OQ' | 'PQ';
  created_at: string;
  files: ManifestEntry[];
  total_size_bytes: number;
  file_count: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── createEvidencePackage ───────────────────────────────────────────────────

/**
 * Creates a tiered evidence package directory with all required artifacts.
 *
 * @param options - Package creation options including tier, spec ID, and test results
 * @returns Absolute path to the created package directory
 */
export function createEvidencePackage(options: PackageOptions): string {
  const { specId, tier, outputDir, testResults, systemStateHash, gitCommit, tracedUserStory } = options;

  // Build deterministic directory name
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dirName = `${tier}-${specId}-${timestamp}`;
  const pkgDir = path.join(outputDir, dirName);

  // Create directory structure
  mkdirSync(path.join(pkgDir, 'artifacts'), { recursive: true });
  mkdirSync(path.join(pkgDir, 'configuration'), { recursive: true });

  // ── Common files (all tiers) ──

  // metadata.json
  const metadata = {
    '@context': 'https://www.rosie-standard.org/evidence/v1',
    package_id: `PKG-${tier}-${specId}-${Date.now()}`,
    spec_id: specId,
    tier,
    traced_user_story: tracedUserStory || null,
    system_state_hash: systemStateHash,
    git_commit: gitCommit,
    created_at: new Date().toISOString(),
  };
  writeFileSync(path.join(pkgDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // environment.json
  const envSnapshot = captureEnvironment();
  writeFileSync(path.join(pkgDir, 'environment.json'), JSON.stringify(envSnapshot, null, 2));

  // test-output.log
  const logLines = formatTestOutputLog(testResults);
  writeFileSync(path.join(pkgDir, 'test-output.log'), logLines);

  // artifacts/test-results.json
  writeFileSync(
    path.join(pkgDir, 'artifacts', 'test-results.json'),
    JSON.stringify(testResults, null, 2)
  );

  // ── IQ-specific ──
  if (tier === 'IQ') {
    if (options.dependencyTree) {
      writeFileSync(
        path.join(pkgDir, 'artifacts', 'dependency-tree.json'),
        JSON.stringify(options.dependencyTree, null, 2)
      );
    }
    if (options.healthCheck) {
      writeFileSync(
        path.join(pkgDir, 'artifacts', 'health-check.json'),
        JSON.stringify(options.healthCheck, null, 2)
      );
    }
  }

  // ── OQ-specific ──
  if (tier === 'OQ') {
    if (options.coverageReport) {
      writeFileSync(
        path.join(pkgDir, 'artifacts', 'coverage-report.json'),
        JSON.stringify(options.coverageReport, null, 2)
      );
    }
  }

  // ── PQ-specific ──
  if (tier === 'PQ') {
    if (options.screenshotsDir && existsSync(options.screenshotsDir)) {
      const screenshotsDest = path.join(pkgDir, 'screenshots');
      mkdirSync(screenshotsDest, { recursive: true });
      copyDirectoryContents(options.screenshotsDir, screenshotsDest);
    }
    if (options.tracesDir && existsSync(options.tracesDir)) {
      const tracesDest = path.join(pkgDir, 'traces');
      mkdirSync(tracesDest, { recursive: true });
      copyDirectoryContents(options.tracesDir, tracesDest);
    }
  }

  return pkgDir;
}

// ─── generateManifest ────────────────────────────────────────────────────────

/**
 * Generates a manifest listing all files in the package with SHA-256 hashes.
 * The manifest itself (manifest.json, manifest.jws) is excluded from the listing.
 *
 * @param packageDir - Absolute path to the evidence package directory
 * @returns Manifest object with file entries, total size, and file count
 */
export function generateManifest(packageDir: string): Manifest {
  // Read metadata to extract spec_id and tier
  const metadataPath = path.join(packageDir, 'metadata.json');
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

  const files = collectAllFiles(packageDir);
  files.sort(); // Deterministic ordering

  const entries: ManifestEntry[] = [];

  for (const relPath of files) {
    // Exclude manifest files from the listing
    if (relPath === 'manifest.json' || relPath === 'manifest.jws') continue;

    const absPath = path.join(packageDir, relPath);
    const content = readFileSync(absPath);
    const sha256 = createHash('sha256').update(content).digest('hex');
    const size = statSync(absPath).size;

    entries.push({
      path: relPath,
      sha256,
      size_bytes: size,
    });
  }

  const totalSize = entries.reduce((sum, e) => sum + e.size_bytes, 0);

  return {
    package_id: metadata.package_id || `PKG-${metadata.tier}-${metadata.spec_id}`,
    spec_id: metadata.spec_id,
    tier: metadata.tier,
    created_at: new Date().toISOString(),
    files: entries,
    total_size_bytes: totalSize,
    file_count: entries.length,
  };
}

// ─── signManifest ────────────────────────────────────────────────────────────

/**
 * Signs a manifest using ES256 (ECDSA P-256) and returns a JWS compact serialization.
 *
 * @param manifest - The manifest object to sign
 * @param privateKeyPem - PKCS#8 PEM-encoded ES256 private key
 * @returns JWS compact serialization string
 */
export async function signManifest(manifest: Manifest, privateKeyPem: string): Promise<string> {
  const privateKey = await importPKCS8(privateKeyPem, 'ES256');

  const jws = await new SignJWT(manifest as unknown as Record<string, unknown>)
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'JWT',
      kid: `rosie-evidence-${manifest.spec_id}`,
    })
    .setIssuedAt()
    .setExpirationTime('10y')
    .sign(privateKey);

  return jws;
}

// ─── validatePackage ─────────────────────────────────────────────────────────

/**
 * Validates an evidence package by checking:
 * 1. JWS signature on manifest.jws
 * 2. All files in the manifest exist with correct SHA-256 hashes
 * 3. No extra files exist outside the manifest
 *
 * @param packageDir - Absolute path to the evidence package directory
 * @param publicKeyPem - SPKI PEM-encoded ES256 public key
 * @returns Validation result with valid flag and list of errors
 */
export async function validatePackage(
  packageDir: string,
  publicKeyPem: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  // 1. Check manifest files exist
  const manifestJsonPath = path.join(packageDir, 'manifest.json');
  const manifestJwsPath = path.join(packageDir, 'manifest.jws');

  if (!existsSync(manifestJsonPath)) {
    return { valid: false, errors: ['manifest.json missing'] };
  }
  if (!existsSync(manifestJwsPath)) {
    return { valid: false, errors: ['manifest.jws missing'] };
  }

  // 2. Verify JWS signature and use signed payload as source of truth
  const jwsToken = readFileSync(manifestJwsPath, 'utf-8');
  let manifest: Manifest;

  try {
    const publicKey = await importSPKI(publicKeyPem, 'ES256');
    const { payload } = await jwtVerify(jwsToken, publicKey);
    manifest = payload as unknown as Manifest;
  } catch (err: any) {
    return { valid: false, errors: [`Invalid JWS signature: ${err.message}`] };
  }

  // 3. Check each file in the signed manifest exists and has correct hash
  const manifestPaths = new Set(manifest.files.map(f => f.path));

  for (const entry of manifest.files) {
    const absPath = path.join(packageDir, entry.path);

    if (!existsSync(absPath)) {
      errors.push(`File missing: ${entry.path}`);
      continue;
    }

    const content = readFileSync(absPath);
    const actualHash = createHash('sha256').update(content).digest('hex');

    if (actualHash !== entry.sha256) {
      errors.push(`File hash mismatch: ${entry.path} (expected ${entry.sha256.substring(0, 12)}..., got ${actualHash.substring(0, 12)}...)`);
    }
  }

  // 5. Check for extra files not in manifest
  const allFiles = collectAllFiles(packageDir);
  for (const relPath of allFiles) {
    if (relPath === 'manifest.json' || relPath === 'manifest.jws') continue;
    if (!manifestPaths.has(relPath)) {
      errors.push(`File not in manifest: ${relPath}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively collect all file paths relative to rootDir.
 */
function collectAllFiles(rootDir: string, prefix: string = ''): string[] {
  const files: string[] = [];
  const entries = readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectAllFiles(path.join(rootDir, entry.name), relPath));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }

  return files;
}

/**
 * Copy all files from srcDir to destDir (shallow — files only, not recursive).
 */
function copyDirectoryContents(srcDir: string, destDir: string): void {
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      copyFileSync(path.join(srcDir, entry.name), path.join(destDir, entry.name));
    } else if (entry.isDirectory()) {
      const subDest = path.join(destDir, entry.name);
      mkdirSync(subDest, { recursive: true });
      copyDirectoryContents(path.join(srcDir, entry.name), subDest);
    }
  }
}

/**
 * Format test results into a human-readable log string.
 */
function formatTestOutputLog(testResults: any): string {
  const lines: string[] = [];
  lines.push('=== Evidence Package Test Output ===');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  if (testResults.tool) {
    lines.push(`Tool: ${testResults.tool} v${testResults.version || 'unknown'}`);
  }

  const passed = testResults.passed ?? 0;
  const failed = testResults.failed ?? 0;
  const skipped = testResults.skipped ?? 0;
  const total = passed + failed + skipped;

  lines.push(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)`);
  lines.push(`Duration: ${testResults.duration_ms ?? 0}ms`);
  lines.push('');

  if (testResults.test_cases && Array.isArray(testResults.test_cases)) {
    lines.push('--- Test Cases ---');
    for (const tc of testResults.test_cases) {
      const icon = tc.status === 'passed' ? 'PASS' : tc.status === 'failed' ? 'FAIL' : 'SKIP';
      lines.push(`  [${icon}] ${tc.name} (${tc.duration}ms)`);
    }
  }

  lines.push('');
  lines.push('=== End of Test Output ===');
  return lines.join('\n');
}
