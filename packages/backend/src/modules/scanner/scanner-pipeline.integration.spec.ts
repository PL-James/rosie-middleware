import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import {
  scans,
  repositories,
  systemContexts,
  requirements,
  userStories,
  specs,
  evidence,
  fileChecksums,
} from '@/db/schema';
import { ScannerService } from './scanner.service';
import { GitHubApiClient } from '../github/github-api.client';
import { ArtifactParserService } from '../artifacts/artifact-parser.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { TraceabilityValidatorService } from '../traceability/traceability-validator.service';

/**
 * Scanner Service Full Pipeline Integration Tests
 *
 * @gxp-tag SPEC-006-001-001
 * @gxp-criticality HIGH
 * @test-type integration
 * @requirement REQ-006
 *
 * Tests the complete 6-phase scan pipeline with real database operations.
 * This test suite would have caught all schema mismatch errors before deployment.
 */

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/rosie_test';

/**
 * Integration tests require a live PostgreSQL database.
 *
 * Locally: TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm test
 * CI: TEST_DATABASE_URL is set by GitHub Actions (PostgreSQL service)
 *
 * Tests will skip if TEST_DATABASE_URL is not configured.
 */
const describeIntegration = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIntegration('ScannerService - Full Pipeline Integration', () => {
  let testClient: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let scannerService: ScannerService;
  let mockGithubClient: any;
  let artifactParser: ArtifactParserService;
  let repositoriesService: RepositoriesService;
  let traceabilityValidator: TraceabilityValidatorService;
  let mockCacheManager: any;
  let testRepoId: string;

  // Mock GitHub file content
  const mockSystemContext = `---
gxp_id: system_context
project_name: Test ROSIE Project
version: 1.0.0
gxp_risk_rating: HIGH
validation_status: DRAFT
intended_use: Testing scanner pipeline
regulatory: FDA 21 CFR Part 11
system_owner: Test Owner
technical_contact: test@example.com
---

# System Context

Test system context content.
`;

  const mockRequirement = `---
gxp_id: REQ-001
title: Test Requirement
gxp_risk_rating: HIGH
---

# Requirement

Test requirement description.

## Acceptance Criteria

- AC1: Test criteria 1
- AC2: Test criteria 2
`;

  const mockUserStory = `---
gxp_id: US-001-001
parent_id: REQ-001
title: Test User Story
status: draft
---

# User Story

**As a** tester
**I want** to verify scanner functionality
**So that** I can ensure quality

## Acceptance Criteria

- Test AC1
`;

  const mockSpec = `---
gxp_id: SPEC-001-001-001
parent_id: US-001-001
title: Test Specification
verification_tier: OQ
---

# Specification

Test spec content.

## Design Approach

Test design.

## Implementation Notes

Test implementation.
`;

  beforeAll(async () => {
    testClient = postgres(TEST_DB_URL, { max: 1 });
    db = drizzle(testClient);

    // Initialize services
    artifactParser = new ArtifactParserService();

    // Mock cache manager
    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };

    // Create repositories service (needs db access)
    repositoriesService = {
      findOne: vi.fn().mockImplementation(async (id: string) => {
        const [repo] = await db
          .select()
          .from(repositories)
          .where(eq(repositories.id, id));
        if (!repo) throw new Error('Repository not found');
        return repo;
      }),
      updateLastScan: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Create traceability validator
    traceabilityValidator = {
      buildTraceabilityGraph: vi.fn().mockResolvedValue(undefined),
      detectBrokenLinks: vi.fn().mockResolvedValue([]),
    } as any;

    // Mock GitHub API Client
    mockGithubClient = {
      getLatestCommitSha: vi.fn().mockResolvedValue('abc123def456'),
      getCommit: vi.fn().mockResolvedValue({
        sha: 'abc123def456',
        commit: {
          message: 'Test commit',
          tree: {
            sha: 'tree123',
          },
        },
      }),
      getTree: vi.fn().mockResolvedValue([
        { path: '.gxp/system_context.md', type: 'blob', sha: 'sha1', size: 100 },
        { path: '.gxp/requirements/REQ-001.md', type: 'blob', sha: 'sha2', size: 200 },
        { path: '.gxp/user_stories/US-001-001.md', type: 'blob', sha: 'sha3', size: 150 },
        { path: '.gxp/specs/SPEC-001-001-001.md', type: 'blob', sha: 'sha4', size: 180 },
      ]),
      getFilesContent: vi.fn().mockResolvedValue([
        { path: '.gxp/system_context.md', content: mockSystemContext, sha: 'sha1' },
        { path: '.gxp/requirements/REQ-001.md', content: mockRequirement, sha: 'sha2' },
        { path: '.gxp/user_stories/US-001-001.md', content: mockUserStory, sha: 'sha3' },
        { path: '.gxp/specs/SPEC-001-001-001.md', content: mockSpec, sha: 'sha4' },
      ]),
    };

    // Initialize scanner service
    scannerService = new ScannerService(
      mockGithubClient,
      artifactParser,
      repositoriesService,
      traceabilityValidator,
      mockCacheManager,
    );

    // Create test repository
    const [repo] = await db
      .insert(repositories)
      .values({
        name: 'test-scanner-pipeline',
        gitUrl: 'https://github.com/test/scanner',
        owner: 'test',
        repo: 'scanner',
      })
      .returning();
    testRepoId = repo.id;
  });

  afterAll(async () => {
    // Cleanup - cascade delete will handle related records
    if (testRepoId) {
      await db.delete(repositories).where(eq(repositories.id, testRepoId));
    }
    await testClient.end();
  });

  /**
   * @gxp-tag SPEC-006-001-001-001
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-006
   * @description Verifies complete scan pipeline executes all 6 phases successfully
   */
  it('should execute complete scan pipeline and persist all artifacts', async () => {
    // Create scan record
    const [scan] = await db
      .insert(scans)
      .values({
        repositoryId: testRepoId,
        status: 'pending',
      })
      .returning();

    // Execute scan
    await scannerService.executeScanWithProgress(scan.id, 'test', 'scanner');

    // Verify scan completed
    const [completedScan] = await db
      .select()
      .from(scans)
      .where(eq(scans.id, scan.id));

    expect(completedScan.status).toBe('completed');
    expect(completedScan.commitSha).toBe('abc123def456');
    expect(completedScan.commitMessage).toBe('Test commit');
    expect(completedScan.artifactsFound).toBeGreaterThan(0);

    // Verify system context persisted
    const systemContextRecords = await db
      .select()
      .from(systemContexts)
      .where(eq(systemContexts.repositoryId, testRepoId));

    expect(systemContextRecords.length).toBe(1);
    expect(systemContextRecords[0].projectName).toBe('Test ROSIE Project');
    expect(systemContextRecords[0].version).toBe('1.0.0');
    expect(systemContextRecords[0].gxpRiskRating).toBe('HIGH');
    expect(systemContextRecords[0].validationStatus).toBe('DRAFT');
    expect(systemContextRecords[0].intendedUse).toBe('Testing scanner pipeline');
    expect(systemContextRecords[0].regulatory).toBe('FDA 21 CFR Part 11');
    expect(systemContextRecords[0].systemOwner).toBe('Test Owner');
    expect(systemContextRecords[0].technicalContact).toBe('test@example.com');

    // Verify requirements persisted
    const requirementRecords = await db
      .select()
      .from(requirements)
      .where(eq(requirements.repositoryId, testRepoId));

    expect(requirementRecords.length).toBe(1);
    expect(requirementRecords[0].gxpId).toBe('REQ-001');
    expect(requirementRecords[0].title).toBe('Test Requirement');
    expect(requirementRecords[0].gxpRiskRating).toBe('HIGH');
    expect(requirementRecords[0].filePath).toBe('.gxp/requirements/REQ-001.md');

    // Verify user stories persisted
    const userStoryRecords = await db
      .select()
      .from(userStories)
      .where(eq(userStories.repositoryId, testRepoId));

    expect(userStoryRecords.length).toBe(1);
    expect(userStoryRecords[0].gxpId).toBe('US-001-001');
    expect(userStoryRecords[0].parentId).toBe('REQ-001');
    expect(userStoryRecords[0].title).toBe('Test User Story');
    expect(userStoryRecords[0].asA).toBe('tester');
    expect(userStoryRecords[0].iWant).toBe('to verify scanner functionality');
    expect(userStoryRecords[0].soThat).toBe('I can ensure quality');

    // Verify specs persisted
    const specRecords = await db
      .select()
      .from(specs)
      .where(eq(specs.repositoryId, testRepoId));

    expect(specRecords.length).toBe(1);
    expect(specRecords[0].gxpId).toBe('SPEC-001-001-001');
    expect(specRecords[0].parentId).toBe('US-001-001');
    expect(specRecords[0].title).toBe('Test Specification');
    expect(specRecords[0].verificationTier).toBe('OQ');

    // Verify file checksums persisted
    const checksumRecords = await db
      .select()
      .from(fileChecksums)
      .where(eq(fileChecksums.repositoryId, testRepoId));

    expect(checksumRecords.length).toBe(4); // 4 files scanned
  });

  /**
   * @gxp-tag SPEC-006-001-001-002
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-006
   * @description Verifies UPSERT behavior when scanning same repository twice
   */
  it('should upsert artifacts on rescan without duplicates', async () => {
    // First scan
    const [scan1] = await db
      .insert(scans)
      .values({
        repositoryId: testRepoId,
        status: 'pending',
      })
      .returning();

    await scannerService.executeScanWithProgress(scan1.id, 'test', 'scanner');

    // Get initial counts
    const initialSystemContexts = await db
      .select()
      .from(systemContexts)
      .where(eq(systemContexts.repositoryId, testRepoId));
    const initialRequirements = await db
      .select()
      .from(requirements)
      .where(eq(requirements.repositoryId, testRepoId));
    const initialUserStories = await db
      .select()
      .from(userStories)
      .where(eq(userStories.repositoryId, testRepoId));
    const initialSpecs = await db
      .select()
      .from(specs)
      .where(eq(specs.repositoryId, testRepoId));

    // Second scan (rescan)
    const [scan2] = await db
      .insert(scans)
      .values({
        repositoryId: testRepoId,
        status: 'pending',
      })
      .returning();

    await scannerService.executeScanWithProgress(scan2.id, 'test', 'scanner');

    // Verify counts remain the same (upsert, not insert)
    const finalSystemContexts = await db
      .select()
      .from(systemContexts)
      .where(eq(systemContexts.repositoryId, testRepoId));
    const finalRequirements = await db
      .select()
      .from(requirements)
      .where(eq(requirements.repositoryId, testRepoId));
    const finalUserStories = await db
      .select()
      .from(userStories)
      .where(eq(userStories.repositoryId, testRepoId));
    const finalSpecs = await db
      .select()
      .from(specs)
      .where(eq(specs.repositoryId, testRepoId));

    expect(finalSystemContexts.length).toBe(initialSystemContexts.length);
    expect(finalRequirements.length).toBe(initialRequirements.length);
    expect(finalUserStories.length).toBe(initialUserStories.length);
    expect(finalSpecs.length).toBe(initialSpecs.length);

    // Verify scanId was updated to latest scan
    expect(finalSystemContexts[0].scanId).toBe(scan2.id);
    expect(finalRequirements[0].scanId).toBe(scan2.id);
    expect(finalUserStories[0].scanId).toBe(scan2.id);
    expect(finalSpecs[0].scanId).toBe(scan2.id);
  });

  /**
   * @gxp-tag SPEC-006-001-001-003
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-005
   * @description Verifies unique constraints prevent duplicate artifacts
   */
  it('should enforce unique constraints on upsert operations', async () => {
    // This test verifies that the unique constraints we added actually work
    // by attempting manual duplicate inserts

    const [scan] = await db
      .insert(scans)
      .values({
        repositoryId: testRepoId,
        status: 'pending',
      })
      .returning();

    // Test systemContexts unique constraint (repository_id)
    // First insert
    await db.insert(systemContexts).values({
      repositoryId: testRepoId,
      scanId: scan.id,
      projectName: 'Test 1',
      version: '1.0.0',
      gxpRiskRating: 'HIGH',
      validationStatus: 'DRAFT',
      sections: {},
    });

    // Second insert with onConflictDoUpdate - should update
    await db
      .insert(systemContexts)
      .values({
        repositoryId: testRepoId,
        scanId: scan.id,
        projectName: 'Test 2',
        version: '1.0.0',
        gxpRiskRating: 'HIGH',
        validationStatus: 'DRAFT',
        sections: {},
      })
      .onConflictDoUpdate({
        target: [systemContexts.repositoryId],
        set: {
          projectName: 'Test 2', // Should update, not error
        },
      });

    const systemContextRecords = await db
      .select()
      .from(systemContexts)
      .where(eq(systemContexts.repositoryId, testRepoId));

    expect(systemContextRecords.length).toBe(1);
    expect(systemContextRecords[0].projectName).toBe('Test 2'); // Updated

    // Test requirements unique constraint (repository_id, gxp_id)
    await db
      .insert(requirements)
      .values({
        repositoryId: testRepoId,
        scanId: scan.id,
        gxpId: 'REQ-TEST',
        title: 'First Title',
        filePath: 'test.md',
      })
      .onConflictDoUpdate({
        target: [requirements.repositoryId, requirements.gxpId],
        set: {
          title: 'Updated Title',
        },
      });

    const requirementRecords = await db
      .select()
      .from(requirements)
      .where(eq(requirements.gxpId, 'REQ-TEST'));

    expect(requirementRecords.length).toBe(1);
    expect(requirementRecords[0].title).toBe('Updated Title');
  });

  /**
   * @gxp-tag SPEC-006-001-001-004
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-005
   * @description Verifies all schema fields match between code and database
   */
  it('should persist all schema fields without type errors', async () => {
    // This test would have caught the field mismatch errors
    // by actually inserting data and verifying all fields persist

    const [scan] = await db
      .insert(scans)
      .values({
        repositoryId: testRepoId,
        status: 'pending',
      })
      .returning();

    // Test all systemContexts fields from actual schema
    const [systemContextRecord] = await db
      .insert(systemContexts)
      .values({
        repositoryId: testRepoId,
        scanId: scan.id,
        projectName: 'Test Project',
        version: '1.0.0',
        gxpRiskRating: 'HIGH',
        validationStatus: 'DRAFT',
        intendedUse: 'Test intended use',
        regulatory: 'Test regulatory',
        systemOwner: 'Test Owner',
        technicalContact: 'test@example.com',
        sections: { section1: 'content' },
      })
      .returning();

    expect(systemContextRecord.projectName).toBe('Test Project');
    expect(systemContextRecord.version).toBe('1.0.0');
    expect(systemContextRecord.gxpRiskRating).toBe('HIGH');
    expect(systemContextRecord.validationStatus).toBe('DRAFT');
    expect(systemContextRecord.intendedUse).toBe('Test intended use');
    expect(systemContextRecord.regulatory).toBe('Test regulatory');
    expect(systemContextRecord.systemOwner).toBe('Test Owner');
    expect(systemContextRecord.technicalContact).toBe('test@example.com');
    expect(systemContextRecord.sections).toEqual({ section1: 'content' });
    expect(systemContextRecord.createdAt).toBeDefined();
    // Note: systemContexts does NOT have updatedAt

    // Test evidence table (only has createdAt, NOT updatedAt)
    const [evidenceRecord] = await db
      .insert(evidence)
      .values({
        repositoryId: testRepoId,
        scanId: scan.id,
        fileName: 'test.jws',
        filePath: '.gxp/evidence/test.jws',
        gxpId: 'SPEC-001',
        verificationTier: 'OQ',
        jwsPayload: { test: 'payload' },
        jwsHeader: { alg: 'ES256' },
        signature: 'test-signature',
        testResults: { passed: true },
        systemState: 'test-hash',
        timestamp: new Date(),
        rawContent: 'test-jws-content',
      })
      .returning();

    expect(evidenceRecord.fileName).toBe('test.jws');
    expect(evidenceRecord.createdAt).toBeDefined();
    // Verify updatedAt does NOT exist (would cause TypeScript error if referenced)
    expect('updatedAt' in evidenceRecord).toBe(false);
  });

  /**
   * @gxp-tag SPEC-006-001-001-005
   * @gxp-criticality HIGH
   * @test-type integration
   * @requirement REQ-006
   * @description Verifies file checksum updates work correctly
   */
  it('should update file checksums on rescan', async () => {
    const [scan] = await db
      .insert(scans)
      .values({
        repositoryId: testRepoId,
        status: 'pending',
      })
      .returning();

    // Insert initial checksum
    const [initialChecksum] = await db
      .insert(fileChecksums)
      .values({
        repositoryId: testRepoId,
        filePath: 'test/file.md',
        sha256Hash: 'old-hash',
        lastScannedAt: new Date('2020-01-01'),
      })
      .returning();

    // Update checksum (simulate rescan)
    const newScanTime = new Date();
    await db
      .insert(fileChecksums)
      .values({
        repositoryId: testRepoId,
        filePath: 'test/file.md',
        sha256Hash: 'new-hash',
        lastScannedAt: newScanTime,
      })
      .onConflictDoUpdate({
        target: [fileChecksums.repositoryId, fileChecksums.filePath],
        set: {
          sha256Hash: 'new-hash',
          lastScannedAt: newScanTime,
          updatedAt: newScanTime,
        },
      });

    const [updatedChecksum] = await db
      .select()
      .from(fileChecksums)
      .where(eq(fileChecksums.id, initialChecksum.id));

    expect(updatedChecksum.sha256Hash).toBe('new-hash');
    expect(updatedChecksum.lastScannedAt.getTime()).toBeGreaterThan(
      initialChecksum.lastScannedAt.getTime()
    );
    expect(updatedChecksum.updatedAt.getTime()).toBeGreaterThan(
      initialChecksum.updatedAt.getTime()
    );
  });
});
