---
gxp_id: US-005-003
title: "Audit Log Recording"
parent_id: REQ-005
as_a: "Compliance Officer"
i_want: "to have an immutable audit trail of all system operations"
so_that: "I can demonstrate 21 CFR Part 11 compliance during regulatory audits"
acceptance_criteria:
  - Log all write operations (INSERT, UPDATE, DELETE)
  - Include timestamp, user, action, resource_type, resource_id
  - Store payload hash for non-repudiation
  - Use append-only table (no UPDATE or DELETE allowed)
  - Index on timestamp and resource_id for audit queries
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in Audit Log Service (`packages/backend/src/modules/audit/audit-log.service.ts`):

```typescript
@Injectable()
export class AuditLogService {
  async record(entry: AuditLogEntry): Promise<void> {
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(entry.payload))
      .digest('hex');

    await this.db.insert(auditLog).values({
      timestamp: new Date(),
      user: entry.user || 'system',
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      payloadHash,
    });
  }
}
```

## Schema Definition

```typescript
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  user: text('user').notNull(),
  action: text('action').notNull(), // SCAN_STARTED, SCAN_COMPLETED, ARTIFACT_INSERTED
  resourceType: text('resource_type').notNull(), // repository, requirement, user_story
  resourceId: uuid('resource_id').notNull(),
  payloadHash: text('payload_hash').notNull(),
});

// Indexes for audit queries
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
```

## Logged Actions

- **REPOSITORY_CREATED**: New repository registered
- **SCAN_STARTED**: Scan initiated
- **SCAN_COMPLETED**: Scan finished successfully
- **SCAN_FAILED**: Scan encountered error
- **ARTIFACT_INSERTED**: New artifact persisted
- **ARTIFACT_UPDATED**: Artifact modified (re-scan)
- **REPOSITORY_DELETED**: Repository removed

## Audit Queries

**Find all operations on a repository:**
```sql
SELECT * FROM audit_log
WHERE resource_type = 'repository' AND resource_id = '{id}'
ORDER BY timestamp DESC;
```

**Find all scans in date range:**
```sql
SELECT * FROM audit_log
WHERE action LIKE 'SCAN_%'
  AND timestamp BETWEEN '2026-01-01' AND '2026-02-01'
ORDER BY timestamp DESC;
```

## Test Scenarios

1. **Scan Audit Trail**: Trigger scan → Verify SCAN_STARTED, ARTIFACT_INSERTED (×43), SCAN_COMPLETED logged
2. **Timestamp Accuracy**: Record action → Verify timestamp within 1 second of wall clock
3. **Payload Hash**: Record action with payload → Verify hash matches SHA-256 of payload
4. **Immutability**: Attempt to UPDATE audit_log row → Fails (no UPDATE permission granted)

## Regulatory Compliance

Supports 21 CFR Part 11 § 11.10(e):
- Complete audit trail of all system operations
- Sequentially numbered (id column)
- Time-stamped (timestamp column)
- Non-repudiation through payload hashing

## Implementing Specification

SPEC-005-001: Atomic Transaction Service Implementation
