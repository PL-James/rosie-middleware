import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

/**
 * Database Migration Tests
 *
 * @gxp-tag REQ-DB-001
 * @gxp-criticality HIGH
 * @test-type integration
 *
 * Validates that database migrations run successfully on fresh PostgreSQL instances,
 * including proper pgcrypto extension installation for UUID generation.
 */

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/rosie_test';

/**
 * Integration tests are skipped in CI because they require a live PostgreSQL database
 * with migrations applied. CI environment does not have TEST_DATABASE_URL configured.
 * Run locally with: TEST_DATABASE_URL=postgresql://localhost:5432/rosie_test npm test
 */
const describeIntegration = process.env.CI ? describe.skip : describe;

describeIntegration('Database Migrations - pgcrypto Extension', () => {
  let testClient: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testClient = postgres(TEST_DB_URL, { max: 1 });
    db = drizzle(testClient);
  });

  afterAll(async () => {
    await testClient.end();
  });

  /**
   * @gxp-tag REQ-DB-001
   * @gxp-criticality HIGH
   * @test-type integration
   * @description Verifies pgcrypto extension is created during initial migration
   */
  it('should create pgcrypto extension during migration', async () => {
    // Run migrations
    await migrate(db, { migrationsFolder: './drizzle' });

    // Query for pgcrypto extension
    const result = await testClient`
      SELECT * FROM pg_extension WHERE extname = 'pgcrypto'
    `;

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].extname).toBe('pgcrypto');
  });

  /**
   * @gxp-tag REQ-DB-001
   * @gxp-criticality HIGH
   * @test-type integration
   * @description Verifies gen_random_uuid() function is available after migration
   */
  it('should enable gen_random_uuid() function', async () => {
    // Test that gen_random_uuid() works
    const result = await testClient`SELECT gen_random_uuid() as uuid`;

    expect(result.length).toBe(1);
    expect(result[0].uuid).toBeDefined();
    expect(typeof result[0].uuid).toBe('string');
    // UUID format validation (8-4-4-4-12 pattern)
    expect(result[0].uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  /**
   * @gxp-tag REQ-DB-001
   * @gxp-criticality HIGH
   * @test-type integration
   * @description Verifies UUID generation in table defaults works correctly
   */
  it('should generate UUIDs for table primary keys using gen_random_uuid()', async () => {
    // Insert a test repository record without specifying ID
    const result = await testClient`
      INSERT INTO repositories (name, git_url, owner, repo)
      VALUES ('test-repo', 'https://github.com/test/repo', 'test', 'repo')
      RETURNING id
    `;

    expect(result.length).toBe(1);
    expect(result[0].id).toBeDefined();
    expect(typeof result[0].id).toBe('string');
    expect(result[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    // Cleanup
    await testClient`DELETE FROM repositories WHERE id = ${result[0].id}`;
  });

  /**
   * @gxp-tag REQ-DB-001
   * @gxp-criticality MEDIUM
   * @test-type integration
   * @description Verifies migration is idempotent (can run multiple times safely)
   */
  it('should be idempotent when run multiple times', async () => {
    // Run migrations again
    await expect(
      migrate(db, { migrationsFolder: './drizzle' })
    ).resolves.not.toThrow();

    // Verify extension still exists
    const result = await testClient`
      SELECT * FROM pg_extension WHERE extname = 'pgcrypto'
    `;

    expect(result.length).toBeGreaterThan(0);
  });
});
