const { migrate } = require('drizzle-orm/postgres-js/migrator');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { join } = require('path');

async function runMigrations() {
  console.log('Running migrations...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Create migration client
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  // Migrations folder path
  // In development: packages/backend/drizzle
  // In production: packages/backend/drizzle (copied by Dockerfile)
  const migrationsFolder = join(__dirname, '../../drizzle');
  console.log(`Migrations folder: ${migrationsFolder}`);

  try {
    // Pre-migration: deduplicate system_contexts to unblock unique index
    // migration (0005). Keeps the most recent row per repository_id.
    // Safe to run repeatedly — no-op when no duplicates exist.
    await migrationClient`
      DELETE FROM "system_contexts"
      WHERE "id" NOT IN (
        SELECT DISTINCT ON ("repository_id") "id"
        FROM "system_contexts"
        ORDER BY "repository_id", "created_at" DESC
      )
    `.catch(() => {
      // Table may not exist yet on fresh databases — that's fine
      console.log('Pre-migration dedup skipped (table may not exist yet)');
    });

    await migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
