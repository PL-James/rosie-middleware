#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { SignJWT, importPKCS8 } from 'jose';
import { glob } from 'glob';
import path from 'path';

/**
 * Evidence Generation Script
 *
 * Reads test results from vitest JSON reporter and generates
 * JWS-signed evidence artifacts for ROSIE compliance.
 *
 * @gxp-tag SPEC-INF-004
 * @gxp-criticality HIGH
 */

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  ancestorTitles: string[];
}

interface TestFileResult {
  name: string;
  testResults: Array<{
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
  system_state: string;
}

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
  console.log('   Private key loaded\n');

  // 5. Get git commit SHA
  const gitSha = execSync('git rev-parse HEAD').toString().trim();
  const gitShortSha = gitSha.substring(0, 7);
  console.log(`📝 System state: git:${gitShortSha}\n`);

  // 6. Get vitest version
  const vitestVersion = getVitestVersion();
  console.log(`🔧 Test tool: vitest ${vitestVersion}\n`);

  // 7. Generate evidence for each spec
  console.log('📝 Generating evidence artifacts...');
  mkdirSync('.gxp/evidence', { recursive: true });

  let evidenceCount = 0;

  for (const [specId, { verification_tier, test_file }] of gxpMapping) {
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

    // Create evidence payload
    const payload: EvidencePayload = {
      '@context': 'https://www.rosie-standard.org/evidence/v1',
      gxp_id: `EV-${specId}`,
      spec_id: specId,
      verification_tier: verification_tier,
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
      system_state: `git:${gitSha}`,
    };

    // Sign with JWS
    const jws = await new SignJWT(payload as any)
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'JWT',
        kid: `rosie-middleware-${new Date().toISOString().split('T')[0]}`,
      })
      .setIssuedAt()
      .setExpirationTime('10y')
      .sign(privateKey);

    // Write evidence file
    const evidenceFile = `.gxp/evidence/EV-${specId}.jws`;
    writeFileSync(evidenceFile, jws);

    const status = failed > 0 ? '❌' : passed > 0 ? '✅' : '⚠️';
    console.log(`   ${status} ${specId}: ${passed}/${passed + failed} tests passed`);
    evidenceCount++;
  }

  console.log(`\n✅ Evidence generation complete!`);
  console.log(`📁 ${evidenceCount} evidence files created in .gxp/evidence/\n`);

  // 8. Summary
  const evidenceFiles = readdirSync('.gxp/evidence').filter(f => f.endsWith('.jws'));
  console.log('📊 Evidence Summary:');
  console.log(`   Total evidence files: ${evidenceFiles.length}`);
  console.log(`   Specs covered: ${gxpMapping.size}`);
  console.log(`   Coverage: ${((evidenceFiles.length / gxpMapping.size) * 100).toFixed(0)}%\n`);
}

/**
 * Extract GxP tags from test files
 */
function extractGxpTags(): Map<string, { verification_tier: 'IQ' | 'OQ' | 'PQ'; test_file: string }> {
  const mapping = new Map();
  const testFiles = glob.sync('packages/*/src/**/*.spec.ts', {
    ignore: ['**/node_modules/**'],
  });

  for (const file of testFiles) {
    const content = readFileSync(file, 'utf-8');

    // Extract @gxp-tag comments
    const gxpTagMatches = content.matchAll(/@gxp-tag\s+([A-Z]+-\d+(?:-\d+)*)/g);

    for (const match of gxpTagMatches) {
      const specId = match[1];

      // Determine verification tier from spec ID or default to OQ
      let tier: 'IQ' | 'OQ' | 'PQ' = 'OQ';

      // Look for verification tier in the same comment block
      const commentBlock = content.substring(
        Math.max(0, match.index! - 500),
        match.index! + 100
      );

      if (commentBlock.includes('IQ') || commentBlock.includes('Installation Qualification')) {
        tier = 'IQ';
      } else if (commentBlock.includes('PQ') || commentBlock.includes('Performance Qualification')) {
        tier = 'PQ';
      }

      if (!mapping.has(specId)) {
        mapping.set(specId, {
          verification_tier: tier,
          test_file: file,
        });
      }
    }
  }

  return mapping;
}

/**
 * Find test results that match a spec
 */
function findTestsForSpec(
  testResults: TestFileResult[],
  specId: string,
  testFile: string
): TestResult[] {
  const results: TestResult[] = [];

  for (const fileResult of testResults) {
    // Match by file path
    if (!fileResult.name.includes(path.basename(testFile, '.spec.ts'))) {
      continue;
    }

    for (const test of fileResult.testResults) {
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

/**
 * Load private key from file or environment
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
 * Get vitest version
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

// Run
main().catch(error => {
  console.error('\n❌ Evidence generation failed:', error.message);
  process.exit(1);
});
