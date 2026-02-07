---
gxp_id: SPEC-INF-001
title: "Database Schema Definition"
parent_id: US-005-002
verification_tier: IQ
design_approach: |
  Define PostgreSQL database schema using Drizzle ORM. Establish all tables,
  columns, data types, constraints, indexes, and foreign key relationships
  required for ROSIE artifact storage and traceability tracking.
source_files:
  - packages/backend/src/db/schema.ts
test_files: []
validation_status: DRAFT
assurance_status: DRAFT
---

## Installation Qualification (IQ)

This specification defines the database schema structure. IQ verification ensures the schema is correctly installed and configured.

## Table Definitions

### repositories

Stores registered GitHub repositories.

```typescript
export const repositories = pgTable('repositories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  gitUrl: text('git_url').notNull().unique(),
  owner: text('owner').notNull(),
  repo: text('repo').notNull(),
  defaultBranch: text('default_branch').default('main'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastScannedAt: timestamp('last_scanned_at'),
});
```

**Constraints:**
- PRIMARY KEY: id
- UNIQUE: git_url

### scans

Stores scan job history and metrics.

```typescript
export const scans = pgTable('scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }).notNull(),
  status: text('status').notNull(), // pending, in_progress, completed, failed
  commitSha: text('commit_sha').notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
  artifactsFound: jsonb('artifacts_found'),
  errorMessage: text('error_message'),
});
```

**Foreign Keys:**
- repository_id → repositories.id (ON DELETE CASCADE)

### system_contexts

Stores apex documents from .gxp/system_context.md.

```typescript
export const systemContexts = pgTable('system_contexts', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }).notNull(),
  gxpId: text('gxp_id').notNull(),
  projectName: text('project_name').notNull(),
  version: text('version').notNull(),
  gxpRiskRating: text('gxp_risk_rating').notNull(),
  validationStatus: text('validation_status').notNull(),
  intendedUse: text('intended_use'),
  regulatoryContext: text('regulatory_context'),
  markdownContent: text('markdown_content'),
});
```

### requirements

Stores high-level requirements (REQ artifacts).

```typescript
export const requirements = pgTable('requirements', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }).notNull(),
  gxpId: text('gxp_id').notNull(),
  title: text('title').notNull(),
  gxpRiskRating: text('gxp_risk_rating').notNull(),
  description: text('description'),
  acceptanceCriteria: jsonb('acceptance_criteria'),
  validationStatus: text('validation_status').default('DRAFT'),
  markdownContent: text('markdown_content'),
});
```

**Indexes:**
- (repository_id, gxp_id) UNIQUE
- gxp_risk_rating

### user_stories

Stores user stories (US artifacts) linked to requirements.

```typescript
export const userStories = pgTable('user_stories', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }).notNull(),
  gxpId: text('gxp_id').notNull(),
  title: text('title').notNull(),
  parentId: text('parent_id'), // References requirements.gxpId
  asA: text('as_a'),
  iWant: text('i_want'),
  soThat: text('so_that'),
  acceptanceCriteria: jsonb('acceptance_criteria'),
  status: text('status').default('IMPLEMENTED'),
  validationStatus: text('validation_status').default('DRAFT'),
  markdownContent: text('markdown_content'),
});
```

**Foreign Keys:**
- parent_id → requirements.gxp_id (conceptual, not enforced due to cross-repository references)

**Indexes:**
- (repository_id, gxp_id) UNIQUE
- parent_id

### specs

Stores specifications (SPEC artifacts) linked to user stories.

```typescript
export const specs = pgTable('specs', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }).notNull(),
  gxpId: text('gxp_id').notNull(),
  title: text('title').notNull(),
  parentId: text('parent_id'), // References userStories.gxpId
  verificationTier: text('verification_tier').notNull(), // IQ, OQ, PQ
  designApproach: text('design_approach'),
  sourceFiles: jsonb('source_files'),
  testFiles: jsonb('test_files'),
  validationStatus: text('validation_status').default('DRAFT'),
  markdownContent: text('markdown_content'),
});
```

**Indexes:**
- (repository_id, gxp_id) UNIQUE
- parent_id
- verification_tier

### evidence

Stores JWS evidence artifacts with signature verification.

```typescript
export const evidence = pgTable('evidence', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }).notNull(),
  gxpId: text('gxp_id').notNull(),
  title: text('title').notNull(),
  parentId: text('parent_id'), // References specs.gxpId
  jwsPayload: jsonb('jws_payload'),
  jwsSignature: text('jws_signature'),
  signatureVerified: boolean('signature_verified'),
  validationStatus: text('validation_status').default('DRAFT'),
});
```

### traceability_links

Materialized parent-child relationships for fast queries.

```typescript
export const traceabilityLinks = pgTable('traceability_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }).notNull(),
  sourceId: text('source_id').notNull(),
  targetId: text('target_id').notNull(),
  linkType: text('link_type').notNull(), // REQ_TO_US, US_TO_SPEC, SPEC_TO_EVIDENCE
  isValid: boolean('is_valid').default(true),
});
```

**Indexes:**
- (source_id, target_id) UNIQUE
- source_id
- target_id

### audit_log

Immutable audit trail of all system operations.

```typescript
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  user: text('user').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id').notNull(),
  payloadHash: text('payload_hash').notNull(),
});
```

**Indexes:**
- timestamp
- (resource_type, resource_id)

## Verification Method

**Installation Qualification (IQ):**

1. **Schema Creation:**
   - Run Drizzle migrations
   - Verify all tables created
   - Verify all columns with correct data types

2. **Constraint Validation:**
   - Verify PRIMARY KEY constraints
   - Verify UNIQUE constraints
   - Verify FOREIGN KEY constraints with CASCADE

3. **Index Validation:**
   - Verify all indexes created
   - Run EXPLAIN ANALYZE on key queries
   - Verify index usage in query plans

4. **Data Type Validation:**
   - Insert test records
   - Verify JSONB fields accept JSON
   - Verify UUID fields accept UUIDs
   - Verify timestamp fields accept dates

## Implementation Files

- `packages/backend/src/db/schema.ts`: Drizzle schema definitions
- `packages/backend/drizzle/`: Migration files
