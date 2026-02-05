#!/usr/bin/env tsx

import { readFileSync, readdirSync, existsSync } from 'fs';
import { jwtVerify, importSPKI } from 'jose';
import { glob } from 'glob';

/**
 * Evidence Verification Script
 *
 * Verifies JWS signatures on evidence artifacts and checks
 * that all specs have corresponding evidence.
 *
 * @gxp-tag SPEC-INF-005
 * @gxp-criticality HIGH
 */

interface EvidencePayload {
  '@context': string;
  gxp_id: string;
  spec_id: string;
  verification_tier: string;
  test_results: {
    tool: string;
    version: string;
    passed: number;
    failed: number;
    skipped: number;
    duration_ms: number;
  };
  timestamp: string;
  system_state: string;
}

async function main() {
  console.log('🔍 ROSIE Evidence Verifier');
  console.log('===========================\n');

  let exitCode = 0;

  // 1. Verify evidence directory exists
  if (!existsSync('.gxp/evidence')) {
    console.error('❌ .gxp/evidence directory not found');
    process.exit(1);
  }

  // 2. Load public key
  console.log('🔐 Loading public key...');
  const publicKey = await loadPublicKey();
  console.log('   Public key loaded\n');

  // 3. Find all evidence files
  const evidenceFiles = readdirSync('.gxp/evidence')
    .filter(f => f.endsWith('.jws'))
    .sort();

  if (evidenceFiles.length === 0) {
    console.warn('⚠️  No evidence files found in .gxp/evidence/\n');
  } else {
    console.log(`📁 Found ${evidenceFiles.length} evidence files\n`);
  }

  // 4. Verify each evidence file
  console.log('🔬 Verifying evidence signatures...\n');

  const verified: string[] = [];
  const failed: string[] = [];

  for (const file of evidenceFiles) {
    const jws = readFileSync(`.gxp/evidence/${file}`, 'utf-8');

    try {
      const { payload } = await jwtVerify(jws, publicKey);
      const evidence = payload as unknown as EvidencePayload;

      // Verify payload structure
      if (!evidence['@context'] || !evidence.gxp_id || !evidence.spec_id) {
        throw new Error('Invalid evidence payload structure');
      }

      // Check test results
      const { passed, failed: testsFailed } = evidence.test_results;
      const status = testsFailed > 0 ? '⚠️' : '✅';

      console.log(`   ${status} ${file}`);
      console.log(`      Spec: ${evidence.spec_id}`);
      console.log(`      Tests: ${passed} passed, ${testsFailed} failed`);
      console.log(`      Timestamp: ${evidence.timestamp}`);
      console.log(`      System: ${evidence.system_state}\n`);

      verified.push(file);

      if (testsFailed > 0) {
        exitCode = 1;
      }
    } catch (error: any) {
      console.error(`   ❌ ${file}`);
      console.error(`      Error: ${error.message}\n`);
      failed.push(file);
      exitCode = 1;
    }
  }

  // 5. Find all spec files
  console.log('📋 Checking spec coverage...\n');

  const specFiles = glob.sync('.gxp/specs/**/*.md');
  const specIds: string[] = [];

  for (const specFile of specFiles) {
    const content = readFileSync(specFile, 'utf-8');
    const match = content.match(/^gxp_id:\s*([A-Z]+-\d+(?:-\d+)*)/m);

    if (match) {
      specIds.push(match[1]);
    }
  }

  console.log(`   Found ${specIds.length} specification files`);

  // 6. Check which specs have evidence
  const specsWithEvidence: string[] = [];
  const specsWithoutEvidence: string[] = [];

  for (const specId of specIds) {
    const evidenceFile = `EV-${specId}.jws`;

    if (evidenceFiles.includes(evidenceFile)) {
      specsWithEvidence.push(specId);
    } else {
      specsWithoutEvidence.push(specId);
    }
  }

  console.log(`   Specs with evidence: ${specsWithEvidence.length}/${specIds.length}\n`);

  if (specsWithoutEvidence.length > 0) {
    console.warn('⚠️  Specs missing evidence:\n');
    for (const specId of specsWithoutEvidence) {
      console.warn(`   - ${specId}`);
    }
    console.warn('');
  }

  // 7. Summary
  console.log('📊 Verification Summary:');
  console.log(`   Evidence files: ${evidenceFiles.length}`);
  console.log(`   Verified: ${verified.length}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Spec coverage: ${specsWithEvidence.length}/${specIds.length} (${((specsWithEvidence.length / specIds.length) * 100).toFixed(0)}%)\n`);

  if (failed.length > 0) {
    console.error('❌ Evidence verification failed\n');
    process.exit(1);
  }

  if (exitCode === 0) {
    console.log('✅ All evidence verified successfully\n');
  } else {
    console.warn('⚠️  Evidence verified with warnings (some tests failed)\n');
  }

  process.exit(exitCode);
}

/**
 * Load public key from file or environment
 */
async function loadPublicKey() {
  let publicKeyPem: string;

  if (existsSync('.rosie-keys/public-key.pem')) {
    publicKeyPem = readFileSync('.rosie-keys/public-key.pem', 'utf-8');
  } else if (process.env.EVIDENCE_PUBLIC_KEY) {
    publicKeyPem = process.env.EVIDENCE_PUBLIC_KEY;
  } else {
    throw new Error('No public key found in .rosie-keys/public-key.pem or EVIDENCE_PUBLIC_KEY env var');
  }

  return await importSPKI(publicKeyPem, 'ES256');
}

// Run
main().catch(error => {
  console.error('\n❌ Evidence verification failed:', error.message);
  process.exit(1);
});
