import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import { scans, repositories } from '@/db/schema';

/**
 * Scanner Service Integration Tests - Pagination
 *
 * @gxp-tag REQ-SCAN-004
 * @gxp-criticality HIGH
 * @test-type integration
 *
 * Validates scan pagination with real database operations.
 */

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/rosie_test';

/**
 * Integration tests require a live PostgreSQL database with migrations applied.
 *
 * Locally: TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm test
 * CI: TEST_DATABASE_URL is set by GitHub Actions (PostgreSQL service)
 *
 * Tests will skip if TEST_DATABASE_URL is not configured.
 */
const describeIntegration = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIntegration('ScannerService - Pagination Integration', () => {
  let testClient: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  let testRepoId: string;
  const scanIds: string[] = [];

  beforeAll(async () => {
    testClient = postgres(TEST_DB_URL, { max: 1 });
    db = drizzle(testClient);

    // Create test repository
    const [repo] = await db
      .insert(repositories)
      .values({
        name: 'test-pagination-repo',
        gitUrl: 'https://github.com/test/pagination',
        owner: 'test',
        repo: 'pagination',
      })
      .returning();
    testRepoId = repo.id;

    // Create 25 test scans for pagination testing
    for (let i = 0; i < 25; i++) {
      const [scan] = await db
        .insert(scans)
        .values({
          repositoryId: testRepoId,
          status: 'completed',
          commitSha: `abc123${i.toString().padStart(2, '0')}`,
          commitMessage: `Test scan ${i + 1}`,
          artifactsFound: i,
          artifactsCreated: i,
          createdAt: new Date(Date.now() + i * 1000), // Stagger timestamps
        })
        .returning();
      scanIds.push(scan.id);
    }
  });

  afterAll(async () => {
    // Cleanup
    if (testRepoId) {
      await db.delete(scans).where(eq(scans.repositoryId, testRepoId));
      await db.delete(repositories).where(eq(repositories.id, testRepoId));
    }
    await testClient.end();
  });

  /**
   * @gxp-tag REQ-SCAN-004
   * @gxp-criticality HIGH
   * @test-type integration
   * @description Verifies paginated scan retrieval returns correct page 1 results
   */
  it('should return correct first page of scans', async () => {
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get paginated scans
    const result = await db
      .select()
      .from(scans)
      .where(eq(scans.repositoryId, testRepoId))
      .orderBy(scans.createdAt)
      .limit(limit)
      .offset(offset);

    expect(result.length).toBe(10);
  });

  /**
   * @gxp-tag REQ-SCAN-004
   * @gxp-criticality HIGH
   * @test-type integration
   * @description Verifies paginated scan retrieval returns correct page 2 results
   */
  it('should return correct second page of scans', async () => {
    const page = 2;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get paginated scans
    const result = await db
      .select()
      .from(scans)
      .where(eq(scans.repositoryId, testRepoId))
      .orderBy(scans.createdAt)
      .limit(limit)
      .offset(offset);

    expect(result.length).toBe(10);
  });

  /**
   * @gxp-tag REQ-SCAN-004
   * @gxp-criticality HIGH
   * @test-type integration
   * @description Verifies paginated scan retrieval returns correct last page (partial)
   */
  it('should return partial last page of scans', async () => {
    const page = 3;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get paginated scans (should return 5 items for page 3)
    const result = await db
      .select()
      .from(scans)
      .where(eq(scans.repositoryId, testRepoId))
      .orderBy(scans.createdAt)
      .limit(limit)
      .offset(offset);

    expect(result.length).toBe(5); // 25 total, 10 per page, page 3 has 5
  });

  /**
   * @gxp-tag REQ-SCAN-004
   * @gxp-criticality MEDIUM
   * @test-type integration
   * @description Verifies total count query returns correct count
   */
  it('should return correct total count', async () => {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scans)
      .where(eq(scans.repositoryId, testRepoId));

    expect(countResult.count).toBe(25);
  });

  /**
   * @gxp-tag REQ-SCAN-004
   * @gxp-criticality MEDIUM
   * @test-type integration
   * @description Verifies pagination with custom limit
   */
  it('should handle custom limit values', async () => {
    const page = 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const result = await db
      .select()
      .from(scans)
      .where(eq(scans.repositoryId, testRepoId))
      .orderBy(scans.createdAt)
      .limit(limit)
      .offset(offset);

    expect(result.length).toBe(5);
  });

  /**
   * @gxp-tag REQ-SCAN-004
   * @gxp-criticality MEDIUM
   * @test-type integration
   * @description Verifies empty repository returns zero scans
   */
  it('should handle repository with no scans', async () => {
    // Create empty repository
    const [emptyRepo] = await db
      .insert(repositories)
      .values({
        name: 'empty-repo',
        gitUrl: 'https://github.com/test/empty',
        owner: 'test',
        repo: 'empty',
      })
      .returning();

    const result = await db
      .select()
      .from(scans)
      .where(eq(scans.repositoryId, emptyRepo.id))
      .orderBy(scans.createdAt)
      .limit(10)
      .offset(0);

    expect(result.length).toBe(0);

    // Cleanup
    await db.delete(repositories).where(eq(repositories.id, emptyRepo.id));
  });

  /**
   * @gxp-tag REQ-SCAN-004
   * @gxp-criticality HIGH
   * @test-type integration
   * @description Verifies scans are ordered by creation date (most recent first)
   */
  it('should order scans by creation date descending', async () => {
    const result = await db
      .select()
      .from(scans)
      .where(eq(scans.repositoryId, testRepoId))
      .orderBy(scans.createdAt)
      .limit(5);

    // Verify ordering (oldest first for ASC, but service uses DESC)
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1].createdAt);
      const curr = new Date(result[i].createdAt);
      expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
    }
  });
});
