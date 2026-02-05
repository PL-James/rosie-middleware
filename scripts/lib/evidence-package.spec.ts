import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import {
  createEvidencePackage,
  generateManifest,
  signManifest,
  validatePackage,
  type PackageOptions,
  type Manifest,
} from './evidence-package';
import {
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  readdirSync,
} from 'fs';
import path from 'path';
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose';

/**
 * Evidence Package Library — Tiered evidence packages (IQ/OQ/PQ) with manifest signing
 *
 * @gxp-tag SPEC-INF-004
 * @trace US-INF-004
 * @gxp-criticality HIGH
 * @test-type OQ
 */

// Shared test fixtures
let privateKeyPem: string;
let publicKeyPem: string;
const testOutputDir = path.join(__dirname, '__test_evidence_packages__');

beforeAll(async () => {
  // Generate an ephemeral ES256 keypair for tests
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  privateKeyPem = await exportPKCS8(privateKey);
  publicKeyPem = await exportSPKI(publicKey);
});

function baseOptions(overrides: Partial<PackageOptions> = {}): PackageOptions {
  return {
    specId: 'SPEC-TEST-001',
    tier: 'IQ',
    outputDir: testOutputDir,
    testResults: {
      tool: 'vitest',
      version: '2.1.9',
      passed: 5,
      failed: 0,
      skipped: 0,
      duration_ms: 42,
      test_cases: [{ name: 'example test', status: 'passed', duration: 42 }],
    },
    systemStateHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    gitCommit: 'a1b2c3d',
    tracedUserStory: 'US-TEST-001',
    ...overrides,
  };
}

describe('createEvidencePackage', () => {
  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should create package directory with correct structure', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ' }));
    expect(existsSync(pkgDir)).toBe(true);
    expect(existsSync(path.join(pkgDir, 'metadata.json'))).toBe(true);
    expect(existsSync(path.join(pkgDir, 'environment.json'))).toBe(true);
    expect(existsSync(path.join(pkgDir, 'test-output.log'))).toBe(true);
    expect(existsSync(path.join(pkgDir, 'configuration'))).toBe(true);
    expect(existsSync(path.join(pkgDir, 'artifacts'))).toBe(true);
    expect(existsSync(path.join(pkgDir, 'artifacts', 'test-results.json'))).toBe(true);
  });

  it('should include metadata.json with spec_id and tier', () => {
    const pkgDir = createEvidencePackage(baseOptions({ specId: 'SPEC-FOO-007', tier: 'OQ' }));
    const metadata = JSON.parse(readFileSync(path.join(pkgDir, 'metadata.json'), 'utf-8'));
    expect(metadata.spec_id).toBe('SPEC-FOO-007');
    expect(metadata.tier).toBe('OQ');
    expect(metadata.traced_user_story).toBe('US-TEST-001');
    expect(metadata.system_state_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.git_commit).toBe('a1b2c3d');
    expect(metadata.created_at).toBeDefined();
  });

  it('should include environment.json', () => {
    const pkgDir = createEvidencePackage(baseOptions());
    const env = JSON.parse(readFileSync(path.join(pkgDir, 'environment.json'), 'utf-8'));
    expect(env.node_version).toBeDefined();
    expect(env.platform).toBeDefined();
    expect(env.arch).toBeDefined();
    expect(env.timestamp).toBeDefined();
  });

  it('should include test-output.log', () => {
    const pkgDir = createEvidencePackage(baseOptions());
    const log = readFileSync(path.join(pkgDir, 'test-output.log'), 'utf-8');
    expect(log).toContain('passed');
  });

  it('should use spec_id and tier in package directory name', () => {
    const pkgDir = createEvidencePackage(baseOptions({ specId: 'SPEC-FOO-007', tier: 'PQ' }));
    const dirName = path.basename(pkgDir);
    expect(dirName).toContain('SPEC-FOO-007');
    expect(dirName).toContain('PQ');
  });
});

describe('IQ-specific content', () => {
  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should include dependency-tree.json for IQ packages', () => {
    const depTree = { name: 'backend', version: '1.0.0', dependencies: { jose: '6.1.3' } };
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: depTree }));
    const artifact = JSON.parse(
      readFileSync(path.join(pkgDir, 'artifacts', 'dependency-tree.json'), 'utf-8')
    );
    expect(artifact.name).toBe('backend');
    expect(artifact.dependencies.jose).toBe('6.1.3');
  });

  it('should include health-check.json for IQ packages', () => {
    const healthCheck = { status: 'ok', checks: { db: 'connected', redis: 'connected' } };
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', healthCheck }));
    const artifact = JSON.parse(
      readFileSync(path.join(pkgDir, 'artifacts', 'health-check.json'), 'utf-8')
    );
    expect(artifact.status).toBe('ok');
  });

  it('should NOT include screenshots for IQ packages', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ' }));
    expect(existsSync(path.join(pkgDir, 'screenshots'))).toBe(false);
  });
});

describe('OQ-specific content', () => {
  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should include coverage-report.json if available', () => {
    const coverageReport = { lines: { total: 100, covered: 85, pct: 85 } };
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'OQ', coverageReport }));
    const artifact = JSON.parse(
      readFileSync(path.join(pkgDir, 'artifacts', 'coverage-report.json'), 'utf-8')
    );
    expect(artifact.lines.pct).toBe(85);
  });

  it('should NOT include dependency-tree.json for OQ packages', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'OQ' }));
    expect(existsSync(path.join(pkgDir, 'artifacts', 'dependency-tree.json'))).toBe(false);
  });

  it('should NOT include screenshots for OQ packages', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'OQ' }));
    expect(existsSync(path.join(pkgDir, 'screenshots'))).toBe(false);
  });
});

describe('PQ-specific content', () => {
  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should include screenshots/ directory for PQ packages', () => {
    // Create a temp screenshots source dir
    const screenshotsSrc = path.join(testOutputDir, '__screenshots_src__');
    mkdirSync(screenshotsSrc, { recursive: true });
    writeFileSync(path.join(screenshotsSrc, 'login.png'), 'fake-png-data');

    const pkgDir = createEvidencePackage(
      baseOptions({ tier: 'PQ', screenshotsDir: screenshotsSrc })
    );
    expect(existsSync(path.join(pkgDir, 'screenshots'))).toBe(true);
    expect(existsSync(path.join(pkgDir, 'screenshots', 'login.png'))).toBe(true);
  });

  it('should include traces/ directory for PQ packages', () => {
    const tracesSrc = path.join(testOutputDir, '__traces_src__');
    mkdirSync(tracesSrc, { recursive: true });
    writeFileSync(path.join(tracesSrc, 'trace-001.json'), '{"actions":[]}');

    const pkgDir = createEvidencePackage(baseOptions({ tier: 'PQ', tracesDir: tracesSrc }));
    expect(existsSync(path.join(pkgDir, 'traces'))).toBe(true);
    expect(existsSync(path.join(pkgDir, 'traces', 'trace-001.json'))).toBe(true);
  });

  it('should NOT include dependency-tree.json for PQ packages', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'PQ' }));
    expect(existsSync(path.join(pkgDir, 'artifacts', 'dependency-tree.json'))).toBe(false);
  });
});

describe('generateManifest', () => {
  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should list all files with SHA-256 hashes', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest = generateManifest(pkgDir);
    expect(manifest.files.length).toBeGreaterThan(0);
    for (const entry of manifest.files) {
      expect(entry.path).toBeDefined();
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.size_bytes).toBeGreaterThan(0);
    }
  });

  it('should compute correct total_size_bytes', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest = generateManifest(pkgDir);
    const expectedTotal = manifest.files.reduce((sum, f) => sum + f.size_bytes, 0);
    expect(manifest.total_size_bytes).toBe(expectedTotal);
  });

  it('should be deterministic', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest1 = generateManifest(pkgDir);
    const manifest2 = generateManifest(pkgDir);
    // Compare files arrays (excluding created_at which is set at generation time)
    expect(manifest1.files).toEqual(manifest2.files);
    expect(manifest1.total_size_bytes).toBe(manifest2.total_size_bytes);
    expect(manifest1.file_count).toBe(manifest2.file_count);
  });

  it('should include spec_id and tier from metadata', () => {
    const pkgDir = createEvidencePackage(baseOptions({ specId: 'SPEC-MAN-001', tier: 'OQ' }));
    const manifest = generateManifest(pkgDir);
    expect(manifest.spec_id).toBe('SPEC-MAN-001');
    expect(manifest.tier).toBe('OQ');
  });

  it('should have correct file_count', () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest = generateManifest(pkgDir);
    expect(manifest.file_count).toBe(manifest.files.length);
  });
});

describe('signManifest', () => {
  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should create valid ES256 JWS', async () => {
    const pkgDir = createEvidencePackage(baseOptions());
    const manifest = generateManifest(pkgDir);
    const jws = await signManifest(manifest, privateKeyPem);
    expect(typeof jws).toBe('string');
    // JWS compact serialization has 3 dot-separated parts
    const parts = jws.split('.');
    expect(parts.length).toBe(3);
  });

  it('should include manifest content in payload', async () => {
    const pkgDir = createEvidencePackage(baseOptions({ specId: 'SPEC-SIG-001' }));
    const manifest = generateManifest(pkgDir);
    const jws = await signManifest(manifest, privateKeyPem);
    // Decode the payload (2nd part) from base64url
    const payloadB64 = jws.split('.')[1];
    const payloadJson = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    expect(payloadJson.spec_id).toBe('SPEC-SIG-001');
    expect(payloadJson.files).toBeDefined();
    expect(payloadJson.total_size_bytes).toBeDefined();
  });
});

describe('validatePackage', () => {
  afterEach(() => {
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should pass for valid packages', async () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest = generateManifest(pkgDir);
    const jws = await signManifest(manifest, privateKeyPem);
    // Write manifest and JWS to package
    writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(pkgDir, 'manifest.jws'), jws);

    const result = await validatePackage(pkgDir, publicKeyPem);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for tampered files', async () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest = generateManifest(pkgDir);
    const jws = await signManifest(manifest, privateKeyPem);
    writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(pkgDir, 'manifest.jws'), jws);

    // Tamper with a file
    writeFileSync(path.join(pkgDir, 'metadata.json'), '{"tampered": true}');

    const result = await validatePackage(pkgDir, publicKeyPem);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('hash mismatch'))).toBe(true);
  });

  it('should fail for missing files', async () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest = generateManifest(pkgDir);
    const jws = await signManifest(manifest, privateKeyPem);
    writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(pkgDir, 'manifest.jws'), jws);

    // Delete a file referenced in the manifest
    rmSync(path.join(pkgDir, 'test-output.log'));

    const result = await validatePackage(pkgDir, publicKeyPem);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('missing'))).toBe(true);
  });

  it('should fail for extra files not in manifest', async () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest = generateManifest(pkgDir);
    const jws = await signManifest(manifest, privateKeyPem);
    writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(pkgDir, 'manifest.jws'), jws);

    // Add an extra file
    writeFileSync(path.join(pkgDir, 'rogue-file.txt'), 'unexpected content');

    const result = await validatePackage(pkgDir, publicKeyPem);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not in manifest'))).toBe(true);
  });

  it('should fail for invalid JWS signature', async () => {
    const pkgDir = createEvidencePackage(baseOptions({ tier: 'IQ', dependencyTree: {}, healthCheck: {} }));
    const manifest = generateManifest(pkgDir);
    const jws = await signManifest(manifest, privateKeyPem);
    writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    // Write a corrupted JWS
    writeFileSync(path.join(pkgDir, 'manifest.jws'), jws.slice(0, -10) + 'XXXXXXXXXX');

    const result = await validatePackage(pkgDir, publicKeyPem);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('signature'))).toBe(true);
  });
});
