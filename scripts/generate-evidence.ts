#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { SignJWT, importPKCS8 } from 'jose';
import { glob } from 'glob';
import path from 'path';
import { computeSrcTreeHash } from './lib/system-state-hash';
import {
  createEvidencePackage,
  generateManifest,
  signManifest,
  type PackageOptions,
} from './lib/evidence-package';

/**
 * Evidence Generation Script
 *
 * Reads test results from vitest JSON reporter and generates
 * JWS-signed evidence artifacts for ROSIE compliance.
 *
 * Produces both:
 * - Legacy JWS files (.gxp/evidence/EV-SPEC-XXX.jws) for backward compatibility
 * - Tiered evidence packages (.gxp/evidence/packages/{IQ|OQ|PQ}-SPEC-XXX-{timestamp}/)
 *
 * @gxp-tag SPEC-INF-004
 * @gxp-criticality HIGH
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  ancestorTitles: string[];
}

export interface TestFileResult {
  name: string;
  assertionResults: Array<{
    ancestorTitles: string[];
    title: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
  }>;
}

interface EvidencePayload {
  '@context': 'https://www.rosie-standard.org/evidence/v1';
  gxp_id: string;
  spec_id: string;
  verification_tier: 'IQ' | 'OQ' | 'PQ';
  traced_user_story?: string;
  test_results: {
    tool: string;
    version: string;
    passed: number;
    failed: number;
    skipped: number;
    duration_ms: number;
    test_cases: TestResult[];
  };
  timestamp: string;
  system_state_hash: string;
  git_commit: string;
}

export interface GxpTagInfo {
  verification_tier: 'IQ' | 'OQ' | 'PQ';
  test_file: string;
  traced_user_story?: string;
}

// ─── Exported testable functions ─────────────────────────────────────────────

/**
 * Detect the verification tier from the content surrounding a @gxp-tag match.
 *
 * Priority:
 * 1. Explicit @test-type IQ|OQ|PQ annotation in the surrounding block
 * 2. Context-based detection (legacy fallback): looks for IQ/PQ keywords
 * 3. Default: OQ
 */
export function detectTestTier(content: string, matchIndex: number): 'IQ' | 'OQ' | 'PQ' {
  // Look in a window around the @gxp-tag for context
  const blockStart = Math.max(0, matchIndex - 500);
  const blockEnd = Math.min(content.length, matchIndex + 500);
  const commentBlock = content.substring(blockStart, blockEnd);

  // 1. Check for explicit @test-type IQ|OQ|PQ — find the closest one to matchIndex
  const testTypeMatches = [...commentBlock.matchAll(/@test-type\s+(IQ|OQ|PQ)\b/g)];
  if (testTypeMatches.length > 0) {
    // matchIndex relative to commentBlock
    const relativeIndex = matchIndex - blockStart;
    // Pick the closest @test-type to the @gxp-tag
    let closest = testTypeMatches[0];
    let closestDist = Math.abs(closest.index! - relativeIndex);
    for (const m of testTypeMatches) {
      const dist = Math.abs(m.index! - relativeIndex);
      if (dist < closestDist) {
        closest = m;
        closestDist = dist;
      }
    }
    return closest[1] as 'IQ' | 'OQ' | 'PQ';
  }

  // 2. Check for @test-type with legacy values and map them
  const legacyTestTypeMatch = commentBlock.match(/@test-type\s+(\w+)/);
  if (legacyTestTypeMatch) {
    const mapped = determineTierFromTestType(legacyTestTypeMatch[1]);
    if (mapped !== 'OQ') return mapped; // Only use if it resolved to something specific
  }

  // 3. Legacy context-based detection (fallback)
  if (commentBlock.includes('Installation Qualification') || /\bIQ\b/.test(commentBlock)) {
    return 'IQ';
  }
  if (commentBlock.includes('Performance Qualification') || /\bPQ\b/.test(commentBlock)) {
    return 'PQ';
  }

  return 'OQ';
}

/**
 * Map @test-type values to IQ/OQ/PQ tiers.
 *
 * Direct tiers (IQ, OQ, PQ) pass through.
 * Legacy values: unit/integration -> OQ, e2e -> PQ.
 * Unknown/undefined -> OQ (default).
 */
export function determineTierFromTestType(testType: string | undefined): 'IQ' | 'OQ' | 'PQ' {
  if (!testType) return 'OQ';

  switch (testType.toUpperCase()) {
    case 'IQ':
      return 'IQ';
    case 'OQ':
      return 'OQ';
    case 'PQ':
      return 'PQ';
    default:
      break;
  }

  // Legacy @test-type values
  switch (testType.toLowerCase()) {
    case 'e2e':
      return 'PQ';
    case 'unit':
    case 'integration':
    default:
      return 'OQ';
  }
}

/**
 * Extract GxP tags from test files.
 *
 * Searches both:
 * - packages/star/src/star-star/star.spec.ts (unit/integration tests)
 * - packages/star/e2e/star-star/star.spec.ts (e2e/PQ tests)
 *
 * @param rootDir - Project root directory. Defaults to process.cwd().
 */
export function extractGxpTags(
  rootDir: string = process.cwd()
): Map<string, GxpTagInfo> {
  const mapping = new Map<string, GxpTagInfo>();

  // Search both src and e2e directories for spec files
  const testFiles = [
    ...glob.sync('packages/*/src/**/*.spec.ts', { cwd: rootDir, ignore: ['**/node_modules/**'] }),
    ...glob.sync('packages/*/e2e/**/*.spec.ts', { cwd: rootDir, ignore: ['**/node_modules/**'] }),
  ];

  for (const relFile of testFiles) {
    const absFile = path.join(rootDir, relFile);
    const content = readFileSync(absFile, 'utf-8');

    // Extract @gxp-tag comments
    const gxpTagMatches = content.matchAll(/@gxp-tag\s+([A-Z]+-\d+(?:-\d+)*)/g);

    // Extract @trace annotations (US-IDs)
    const traceMatches = [...content.matchAll(/@trace\s+(US-\d+(?:-\d+)*)/g)];
    const firstTrace = traceMatches.length > 0 ? traceMatches[0][1] : undefined;

    for (const match of gxpTagMatches) {
      const specId = match[1];

      // Determine verification tier using @test-type first, then fallback
      const tier = detectTestTier(content, match.index!);

      // Find the closest @trace annotation to this @gxp-tag
      let tracedUserStory = firstTrace;
      for (const traceMatch of traceMatches) {
        const traceIndex = traceMatch.index!;
        const gxpIndex = match.index!;
        // Use the @trace that appears closest after the @gxp-tag (within same comment block)
        if (traceIndex > gxpIndex && traceIndex - gxpIndex < 200) {
          tracedUserStory = traceMatch[1];
          break;
        }
      }

      if (!mapping.has(specId)) {
        mapping.set(specId, {
          verification_tier: tier,
          test_file: relFile,
          traced_user_story: tracedUserStory,
        });
      }
    }
  }

  return mapping;
}

/**
 * Find test results that match a spec by test file path suffix.
 * Uses the full relative path suffix to avoid collisions between
 * files with the same basename in different directories.
 */
export function findTestsForSpec(
  testResults: TestFileResult[],
  specId: string,
  testFile: string
): TestResult[] {
  const results: TestResult[] = [];
  // Normalize separators and use the full relative path for matching
  const normalizedTestFile = testFile.replace(/\\/g, '/');

  for (const fileResult of testResults) {
    // Match by full path suffix to avoid cross-spec collisions
    const normalizedName = fileResult.name.replace(/\\/g, '/');
    if (!normalizedName.endsWith(normalizedTestFile) && !normalizedName.includes(normalizedTestFile)) {
      continue;
    }

    // Skip if assertionResults doesn't exist or isn't an array
    if (!fileResult.assertionResults || !Array.isArray(fileResult.assertionResults)) {
      continue;
    }

    for (const test of fileResult.assertionResults) {
      results.push({
        name: test.title,
        status: test.status,
        duration: test.duration,
        ancestorTitles: test.ancestorTitles,
      });
    }
  }

  return results;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Load private key from file or environment.
 */
async function loadPrivateKey() {
  let privateKeyPem: string;

  if (existsSync('.rosie-keys/private-key.pem')) {
    privateKeyPem = readFileSync('.rosie-keys/private-key.pem', 'utf-8');
  } else if (process.env.EVIDENCE_PRIVATE_KEY) {
    privateKeyPem = process.env.EVIDENCE_PRIVATE_KEY;
  } else {
    throw new Error('No private key found in .rosie-keys/private-key.pem or EVIDENCE_PRIVATE_KEY env var');
  }

  return await importPKCS8(privateKeyPem, 'ES256');
}

/**
 * Load raw private key PEM for the evidence-package library.
 */
function loadPrivateKeyPem(): string {
  if (existsSync('.rosie-keys/private-key.pem')) {
    return readFileSync('.rosie-keys/private-key.pem', 'utf-8');
  } else if (process.env.EVIDENCE_PRIVATE_KEY) {
    return process.env.EVIDENCE_PRIVATE_KEY;
  }
  throw new Error('No private key found in .rosie-keys/private-key.pem or EVIDENCE_PRIVATE_KEY env var');
}

/**
 * Get vitest version.
 */
function getVitestVersion(): string {
  try {
    const packageJsonPath = require.resolve('vitest/package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return 'unknown';
  }
}

// ─── CLI main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔬 ROSIE Evidence Generator');
  console.log('============================\n');

  // 1. Check test results exist
  if (!existsSync('test-results.json')) {
    console.error('❌ test-results.json not found');
    console.error('   Run: npm test -- --reporter=json --outputFile=test-results.json');
    process.exit(1);
  }

  // 2. Load test results
  console.log('📊 Loading test results...');
  const testResults = JSON.parse(readFileSync('test-results.json', 'utf-8'));

  if (!testResults.testResults) {
    console.error('❌ Invalid test results format');
    process.exit(1);
  }

  console.log(`   Found ${testResults.testResults.length} test files`);
  console.log(`   Total tests: ${testResults.numTotalTests}`);
  console.log(`   Passed: ${testResults.numPassedTests}`);
  console.log(`   Failed: ${testResults.numFailedTests}\n`);

  // 3. Extract GxP tags from test files
  console.log('🏷️  Extracting GxP tags from test files...');
  const gxpMapping = extractGxpTags();
  console.log(`   Found ${gxpMapping.size} specs with tests\n`);

  // 4. Load signing keys
  console.log('🔐 Loading signing keys...');
  const privateKey = await loadPrivateKey();
  const privateKeyPem = loadPrivateKeyPem();
  console.log('   Private key loaded\n');

  // 5. Compute system state hash (SHA-256 of /src tree) and git commit
  const systemStateHash = computeSrcTreeHash('packages/backend/src');
  const gitSha = execSync('git rev-parse HEAD').toString().trim();
  console.log(`📝 System state hash: ${systemStateHash.substring(0, 12)}...`);
  console.log(`   Git commit: ${gitSha.substring(0, 7)}\n`);

  // 6. Get vitest version
  const vitestVersion = getVitestVersion();
  console.log(`🔧 Test tool: vitest ${vitestVersion}\n`);

  // 7. Generate evidence for each spec
  console.log('📝 Generating evidence artifacts...');
  mkdirSync('.gxp/evidence', { recursive: true });
  mkdirSync('.gxp/evidence/packages', { recursive: true });

  let legacyCount = 0;
  let packageCount = 0;
  const tierBreakdown: Record<string, number> = { IQ: 0, OQ: 0, PQ: 0 };

  for (const [specId, { verification_tier, test_file, traced_user_story }] of gxpMapping) {
    // Find test results for this spec
    const relevantTests = findTestsForSpec(testResults.testResults, specId, test_file);

    if (relevantTests.length === 0) {
      console.log(`   ⚠️  No tests found for ${specId}`);
      continue;
    }

    const passed = relevantTests.filter(t => t.status === 'passed').length;
    const failed = relevantTests.filter(t => t.status === 'failed').length;
    const skipped = relevantTests.filter(t => t.status === 'skipped').length;
    const totalDuration = relevantTests.reduce((sum, t) => sum + t.duration, 0);

    // ── (a) Generate legacy JWS (backward compatibility) ──
    const payload: EvidencePayload = {
      '@context': 'https://www.rosie-standard.org/evidence/v1',
      gxp_id: `EV-${specId}`,
      spec_id: specId,
      verification_tier,
      ...(traced_user_story ? { traced_user_story } : {}),
      test_results: {
        tool: 'vitest',
        version: vitestVersion,
        passed,
        failed,
        skipped,
        duration_ms: Math.round(totalDuration),
        test_cases: relevantTests,
      },
      timestamp: new Date().toISOString(),
      system_state_hash: systemStateHash,
      git_commit: gitSha,
    };

    const jws = await new SignJWT(payload as any)
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'JWT',
        kid: `rosie-middleware-${new Date().toISOString().split('T')[0]}`,
      })
      .setIssuedAt()
      .setExpirationTime('10y')
      .sign(privateKey);

    const evidenceFile = `.gxp/evidence/EV-${specId}.jws`;
    writeFileSync(evidenceFile, jws);
    legacyCount++;

    // ── (b) Generate tiered evidence package ──
    const packageOpts: PackageOptions = {
      specId,
      tier: verification_tier,
      outputDir: '.gxp/evidence/packages',
      testResults: {
        tool: 'vitest',
        version: vitestVersion,
        passed,
        failed,
        skipped,
        duration_ms: Math.round(totalDuration),
        test_cases: relevantTests,
      },
      systemStateHash,
      gitCommit: gitSha,
      tracedUserStory: traced_user_story,
    };

    const pkgDir = createEvidencePackage(packageOpts);
    const manifest = generateManifest(pkgDir);
    const manifestJws = await signManifest(manifest, privateKeyPem);

    writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(pkgDir, 'manifest.jws'), manifestJws);

    packageCount++;
    tierBreakdown[verification_tier]++;

    const status = failed > 0 ? '❌' : passed > 0 ? '✅' : '⚠️';
    console.log(`   ${status} ${specId} [${verification_tier}]: ${passed}/${passed + failed} tests passed`);
  }

  console.log(`\n✅ Evidence generation complete!`);
  console.log(`📁 ${legacyCount} legacy JWS files in .gxp/evidence/`);
  console.log(`📦 ${packageCount} tiered packages in .gxp/evidence/packages/\n`);

  // 8. Summary with tier breakdown
  const evidenceFiles = readdirSync('.gxp/evidence').filter(f => f.endsWith('.jws'));
  console.log('📊 Evidence Summary:');
  console.log(`   Total JWS files: ${evidenceFiles.length}`);
  console.log(`   Total packages: ${packageCount}`);
  console.log(`   Tier breakdown: IQ=${tierBreakdown.IQ}, OQ=${tierBreakdown.OQ}, PQ=${tierBreakdown.PQ}`);
  console.log(`   Specs covered: ${gxpMapping.size}`);
  console.log(`   Coverage: ${((evidenceFiles.length / Math.max(gxpMapping.size, 1)) * 100).toFixed(0)}%\n`);
}

// Only run main() when executed directly (not imported by tests)
const isDirectExecution = process.argv[1]?.endsWith('generate-evidence.ts');
if (isDirectExecution) {
  main().catch(error => {
    console.error('\n❌ Evidence generation failed:', error.message);
    process.exit(1);
  });
}
