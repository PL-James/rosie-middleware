---
gxp_id: SPEC-INF-002
title: "Database Migrations"
parent_id: US-005-001
verification_tier: IQ
design_approach: |
  Use Drizzle ORM migration system to manage database schema changes. Migrations
  are version-controlled and applied sequentially to ensure consistent schema
  state across development, staging, and production environments.
source_files:
  - packages/backend/drizzle.config.ts
  - packages/backend/drizzle/0000_initial_schema.sql
test_files: []
validation_status: DRAFT
---

## Installation Qualification (IQ)

This specification defines the database migration system. IQ verification ensures migrations can be applied reliably and rolled back if needed.

## Migration Configuration

**drizzle.config.ts:**
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
});
```

## Initial Migration (0000_initial_schema.sql)

Created with: `npx drizzle-kit generate:pg`

Contains:
- CREATE TABLE statements for all 9 tables
- CREATE INDEX statements for performance optimization
- FOREIGN KEY constraints with ON DELETE CASCADE

## Migration Workflow

**Development:**
1. Modify `src/db/schema.ts`
2. Run `npx drizzle-kit generate:pg` to create migration file
3. Review generated SQL
4. Run `npx drizzle-kit push:pg` to apply migration
5. Commit migration file to git

**Production:**
1. Pull latest code (includes new migrations)
2. Run `npx drizzle-kit push:pg` to apply pending migrations
3. Railway automatically applies migrations on deployment

## Migration Safety

- Migrations are idempotent (safe to run multiple times)
- Migrations are atomic (all-or-nothing)
- Rollback not supported (design schema changes carefully)
- Test migrations on staging before production

## Verification Method

**Installation Qualification (IQ):**

1. **Fresh Database:**
   - Create empty PostgreSQL database
   - Run all migrations
   - Verify all tables exist
   - Verify no errors logged

2. **Migration Ordering:**
   - Verify migrations applied in numeric order
   - Verify drizzle.__migrations__ table tracks applied migrations

3. **Idempotency:**
   - Run same migration twice
   - Verify no errors (CREATE TABLE IF NOT EXISTS)

4. **Foreign Key Cascade:**
   - Insert repository
   - Insert artifacts
   - Delete repository
   - Verify artifacts cascade deleted

## Implementation Files

- `packages/backend/drizzle.config.ts`: Migration configuration
- `packages/backend/drizzle/`: Migration SQL files
