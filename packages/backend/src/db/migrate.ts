import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrationClient } from './index';
import { join } from 'path';

async function runMigrations() {
  console.log('Running migrations...');

  const db = drizzle(migrationClient);

  // Use absolute path to migrations folder
  // In development: packages/backend/drizzle
  // In production: packages/backend/drizzle (copied by Dockerfile)
  const migrationsFolder = join(__dirname, '../../drizzle');
  console.log(`Migrations folder: ${migrationsFolder}`);

  await migrate(db, { migrationsFolder });

  console.log('Migrations completed successfully');

  await migrationClient.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
