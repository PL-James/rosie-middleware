---
gxp_id: US-005-002
title: "Foreign Key Enforcement"
parent_id: REQ-005
as_a: "Database Administrator"
i_want: "to enforce foreign key constraints for traceability links"
so_that: "I can prevent orphan artifacts and maintain referential integrity"
acceptance_criteria:
  - Define foreign keys for user_stories.parent_id → requirements.gxp_id
  - Define foreign keys for specs.parent_id → user_stories.gxp_id
  - Define foreign keys for evidence.parent_id → specs.gxp_id
  - Configure ON DELETE CASCADE for repository deletion
  - Reject inserts with invalid parent_id
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in Drizzle schema (`packages/backend/src/db/schema.ts`):

```typescript
export const requirements = pgTable('requirements', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }),
  gxpId: text('gxp_id').notNull(),
  title: text('title').notNull(),
  // ... other fields
});

export const userStories = pgTable('user_stories', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }),
  gxpId: text('gxp_id').notNull(),
  parentId: text('parent_id').references(() => requirements.gxpId), // Foreign key
  // ... other fields
});

export const specs = pgTable('specs', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }),
  gxpId: text('gxp_id').notNull(),
  parentId: text('parent_id').references(() => userStories.gxpId), // Foreign key
  // ... other fields
});
```

## Constraint Configuration

| Child Table | Parent Reference | Constraint |
|-------------|------------------|------------|
| user_stories.parent_id | requirements.gxp_id | FOREIGN KEY |
| specs.parent_id | user_stories.gxp_id | FOREIGN KEY |
| evidence.parent_id | specs.gxp_id | FOREIGN KEY |
| *.repository_id | repositories.id | ON DELETE CASCADE |

## Test Scenarios

1. **Valid Parent**: Insert user story with parent_id=REQ-001 (exists) → Success
2. **Invalid Parent**: Insert user story with parent_id=REQ-999 (missing) → Foreign key violation error
3. **Cascade Delete**: Delete repository → All artifacts deleted automatically
4. **Orphan Prevention**: Attempt to delete requirement with child user stories → Error (unless cascade configured)

## Validation Errors

PostgreSQL error messages:
```
ERROR: insert or update on table "user_stories" violates foreign key constraint "user_stories_parent_id_fkey"
DETAIL: Key (parent_id)=(REQ-999) is not present in table "requirements".
```

Application handling:
```typescript
catch (error) {
  if (error.code === '23503') { // Foreign key violation
    throw new BadRequestException(`Invalid parent_id: ${parentId}`);
  }
}
```

## Implementing Specification

SPEC-INF-001: Database Schema Definition
