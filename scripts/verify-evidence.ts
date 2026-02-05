#!/usr/bin/env tsx

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { jwtVerify, importSPKI } from 'jose';
import { glob } from 'glob';
import path from 'path';
import { validatePackage } from './lib/evidence-package';

/**
 * Evidence Verification Script
 *
 * Verifies JWS signatures on evidence artifacts and checks
 * that all specs have corresponding evidence.
 *
 * Supports both:
 * - Legacy JWS files (.gxp/evidence/*.jws)
 * - Tiered evidence packages (.gxp/evidence/packages/*)
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
  system_state_hash?: string;
  git_commit?: string;
}

interface PackageMetadata {
  package_id: string;
  spec_id: string;
  tier: 'IQ' | 'OQ' | 'PQ';
  traced_user_story?: string;
  system_state_hash: string;
  git_commit: string;
  created_at: string;
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
  const publicKeyPem = loadPublicKeyPem();
  const publicKey = await importSPKI(publicKeyPem, 'ES256');
  console.log('   Public key loaded\n');

  // ─── 3. Verify legacy JWS files ───────────────────────────────────────────

  const evidenceFiles = readdirSync('.gxp/evidence')
    .filter(f => f.endsWith('.jws'))
    .sort();

  if (evidenceFiles.length === 0) {
    console.warn('⚠️  No legacy JWS evidence files found in .gxp/evidence/\n');
  } else {
    console.log(`📁 Found ${evidenceFiles.length} legacy JWS evidence files\n`);
  }

  console.log('🔬 Verifying legacy JWS signatures...\n');

  const jwsVerified: string[] = [];
  const jwsFailed: string[] = [];

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
      if (evidence.system_state_hash) {
        console.log(`      State hash: ${evidence.system_state_hash.substring(0, 12)}...`);
        console.log(`      Git commit: ${evidence.git_commit || 'N/A'}`);
      } else {
        console.log(`      System: ${evidence.system_state}`);
      }
      console.log('');

      jwsVerified.push(file);

      if (testsFailed > 0) {
        exitCode = 1;
      }
    } catch (error: any) {
      console.error(`   ❌ ${file}`);
      console.error(`      Error: ${error.message}\n`);
      jwsFailed.push(file);
      exitCode = 1;
    }
  }

  // ─── 4. Verify evidence packages ──────────────────────────────────────────

  const packagesDir = '.gxp/evidence/packages';
  let pkgVerified: string[] = [];
  let pkgFailed: string[] = [];
  const tierBreakdown: Record<string, number> = { IQ: 0, OQ: 0, PQ: 0 };

  if (existsSync(packagesDir)) {
    const packageDirs = readdirSync(packagesDir)
      .filter(d => {
        const fullPath = path.join(packagesDir, d);
        return statSync(fullPath).isDirectory() && existsSync(path.join(fullPath, 'manifest.json'));
      })
      .sort();

    if (packageDirs.length > 0) {
      console.log(`📦 Found ${packageDirs.length} evidence packages\n`);
      console.log('🔬 Verifying evidence packages...\n');

      for (const dir of packageDirs) {
        const pkgPath = path.join(packagesDir, dir);

        try {
          const result = await validatePackage(pkgPath, publicKeyPem);

          // Read metadata for display
          const metadataPath = path.join(pkgPath, 'metadata.json');
          let metadata: PackageMetadata | null = null;
          if (existsSync(metadataPath)) {
            metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
          }

          // Count files and total size
          const manifestPath = path.join(pkgPath, 'manifest.json');
          let fileCount = 0;
          let totalSize = 0;
          if (existsSync(manifestPath)) {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
            fileCount = manifest.file_count || 0;
            totalSize = manifest.total_size_bytes || 0;
          }

          if (result.valid) {
            const tier = metadata?.tier || 'unknown';
            if (tier in tierBreakdown) {
              tierBreakdown[tier]++;
            }

            console.log(`   ✅ ${dir}`);
            console.log(`      Spec: ${metadata?.spec_id || 'unknown'}`);
            console.log(`      Tier: ${tier}`);
            console.log(`      Files: ${fileCount} (${formatBytes(totalSize)})`);
            if (metadata?.system_state_hash) {
              console.log(`      State hash: ${metadata.system_state_hash.substring(0, 12)}...`);
            }
            if (metadata?.git_commit) {
              console.log(`      Git commit: ${metadata.git_commit.substring(0, 7)}`);
            }
            console.log('');

            pkgVerified.push(dir);
          } else {
            console.error(`   ❌ ${dir}`);
            for (const err of result.errors) {
              console.error(`      - ${err}`);
            }
            console.log('');
            pkgFailed.push(dir);
            exitCode = 1;
          }
        } catch (error: any) {
          console.error(`   ❌ ${dir}`);
          console.error(`      Error: ${error.message}\n`);
          pkgFailed.push(dir);
          exitCode = 1;
        }
      }
    } else {
      console.log('📦 No evidence packages found in .gxp/evidence/packages/\n');
    }
  } else {
    console.log('📦 No evidence packages directory found\n');
  }

  // ─── 5. Check spec coverage ───────────────────────────────────────────────

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

  // Check which specs have evidence (JWS or package)
  const specsWithEvidence: string[] = [];
  const specsWithoutEvidence: string[] = [];

  for (const specId of specIds) {
    const hasJws = evidenceFiles.includes(`EV-${specId}.jws`);
    const hasPackage = existsSync(packagesDir) && readdirSync(packagesDir).some(
      d => d.includes(specId) && statSync(path.join(packagesDir, d)).isDirectory()
    );

    if (hasJws || hasPackage) {
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

  // ─── 6. Summary with tier breakdown ───────────────────────────────────────

  console.log('📊 Verification Summary:');
  console.log(`   Legacy JWS files: ${evidenceFiles.length} (${jwsVerified.length} verified, ${jwsFailed.length} failed)`);
  console.log(`   Evidence packages: ${pkgVerified.length + pkgFailed.length} (${pkgVerified.length} verified, ${pkgFailed.length} failed)`);
  if (pkgVerified.length > 0) {
    console.log(`   Tier breakdown: IQ=${tierBreakdown.IQ}, OQ=${tierBreakdown.OQ}, PQ=${tierBreakdown.PQ}`);
  }
  console.log(`   Spec coverage: ${specsWithEvidence.length}/${specIds.length} (${specIds.length > 0 ? ((specsWithEvidence.length / specIds.length) * 100).toFixed(0) : 0}%)\n`);

  if (jwsFailed.length > 0 || pkgFailed.length > 0) {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Load public key PEM from file or environment.
 */
function loadPublicKeyPem(): string {
  if (existsSync('.rosie-keys/public-key.pem')) {
    return readFileSync('.rosie-keys/public-key.pem', 'utf-8');
  } else if (process.env.EVIDENCE_PUBLIC_KEY) {
    return process.env.EVIDENCE_PUBLIC_KEY;
  }
  throw new Error('No public key found in .rosie-keys/public-key.pem or EVIDENCE_PUBLIC_KEY env var');
}

/**
 * Format bytes into a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Only run main() when executed directly (not imported by tests)
const isDirectExecution = process.argv[1]?.endsWith('verify-evidence.ts');
if (isDirectExecution) {
  main().catch(error => {
    console.error('\n❌ Evidence verification failed:', error.message);
    process.exit(1);
  });
}
