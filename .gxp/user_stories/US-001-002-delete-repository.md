---
gxp_id: US-001-002
title: "Delete Repository with Cascade"
parent_id: REQ-001
as_a: "System Administrator"
i_want: "to delete repositories that are no longer needed"
so_that: "I can maintain a clean database and reduce storage costs"
acceptance_criteria:
  - DELETE /api/v1/repositories/{id}
  - System confirms deletion with user (UI only)
  - System removes repository and all related artifacts
  - System cascades delete to scans, artifacts, traceability_links
  - System logs deletion to audit trail
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented in Repository Service with database cascading:

```typescript
async delete(id: string): Promise<void> {
  await this.db.delete(repositories).where(eq(repositories.id, id));
  // Cascading deletes handled by database foreign key constraints:
  // - scans (ON DELETE CASCADE)
  // - system_contexts (ON DELETE CASCADE)
  // - requirements, user_stories, specs, evidence (ON DELETE CASCADE)
  // - traceability_links (ON DELETE CASCADE)

  await this.auditLog.record({
    action: 'DELETE',
    resourceType: 'repository',
    resourceId: id,
  });
}
```

## Database Cascade Configuration

Foreign keys with CASCADE:
- `scans.repository_id → repositories.id ON DELETE CASCADE`
- `requirements.repository_id → repositories.id ON DELETE CASCADE`
- `user_stories.repository_id → repositories.id ON DELETE CASCADE`
- `specs.repository_id → repositories.id ON DELETE CASCADE`
- `evidence.repository_id → repositories.id ON DELETE CASCADE`

## Test Scenarios

1. **Successful Deletion**: Delete repository with artifacts → All records removed
2. **Cascade Verification**: Verify scans, artifacts, traceability_links removed
3. **Audit Trail**: Verify deletion logged with timestamp and user
4. **Non-existent Repository**: Attempt to delete missing repository → Returns 404

## User Workflow

1. Navigate to dashboard
2. Click delete icon on repository card
3. Confirmation modal: "Delete {name}? This will remove all artifacts and scans."
4. User clicks "Confirm Delete"
5. System deletes repository and cascades to related records
6. User sees success notification: "Repository deleted"
7. Dashboard updates to remove deleted repository

## Implementing Specification

SPEC-001-001: Repository Service Implementation
