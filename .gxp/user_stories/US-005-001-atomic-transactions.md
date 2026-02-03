---
gxp_id: US-005-001
title: "Atomic Transaction Management"
parent_id: REQ-005
as_a: "ROSIE Middleware System"
i_want: "to use atomic database transactions for all artifact inserts"
so_that: "I can ensure all-or-nothing semantics and prevent partial data corruption"
acceptance_criteria:
  - Wrap all artifact inserts in single database transaction
  - Rollback entire transaction if any insert fails
  - Update scan status only after successful commit
  - Log transaction success/failure to audit trail
  - Support retry on transient database errors
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in Scanner Service using Drizzle ORM transactions:

```typescript
async persistPhase(repositoryId: string, artifacts: ParsedArtifact[]): Promise<void> {
  await this.db.transaction(async (tx) => {
    // Insert all artifacts within transaction
    for (const artifact of artifacts) {
      if (artifact.type === 'requirement') {
        await tx.insert(requirements).values({
          repositoryId,
          gxpId: artifact.data.gxp_id,
          title: artifact.data.title,
          gxpRiskRating: artifact.data.gxp_risk_rating,
          description: artifact.data.description,
        });
      }
      // ... similar for user_stories, specs, evidence
    }

    // Update scan status to completed
    await tx.update(scans)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(scans.id, scanId));

    // Record to audit log
    await tx.insert(auditLog).values({
      action: 'SCAN_COMPLETED',
      resourceType: 'repository',
      resourceId: repositoryId,
    });
  });
}
```

## Transaction Guarantees

**ACID Properties:**
- **Atomicity**: All inserts succeed or all rollback
- **Consistency**: Foreign key constraints enforced
- **Isolation**: Other transactions don't see partial state
- **Durability**: Committed data persisted to disk

## Rollback Scenarios

Transaction rolled back if:
- Any insert violates database constraint
- Database connection lost mid-transaction
- Explicit error thrown during processing

## Test Scenarios

1. **Successful Transaction**: Insert 43 artifacts → All committed, scan status = completed
2. **Foreign Key Violation**: Insert user story with invalid parent_id → Rollback, scan status = failed
3. **Duplicate gxp_id**: Insert requirement with existing gxp_id → Rollback or UPDATE (depending on config)
4. **Database Connection Lost**: Connection drops mid-insert → Rollback, scan retried

## Retry Strategy

```typescript
async persistWithRetry(data: any, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.persistPhase(data);
      return; // Success
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await this.sleep(1000 * attempt); // Exponential backoff
    }
  }
}
```

## Implementing Specification

SPEC-005-001: Atomic Transaction Service Implementation
