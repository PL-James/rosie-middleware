---
gxp_id: US-006-002
title: "Record Scan Metrics"
parent_id: REQ-006
as_a: "System Administrator"
i_want: "to record detailed metrics for each scan"
so_that: "I can monitor performance and identify bottlenecks"
acceptance_criteria:
  - Record started_at and completed_at timestamps
  - Calculate duration_ms (completed - started)
  - Count artifacts by type (requirements, user_stories, specs, evidence)
  - Store commit_sha scanned
  - Record error details for failed scans
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented in Scanner Service:

```typescript
async scanRepository(repositoryId: string, commitSha?: string): Promise<string> {
  const startedAt = new Date();

  const scan = await this.db.insert(scans).values({
    repositoryId,
    status: 'in_progress',
    commitSha: commitSha || await this.getLatestCommitSha(repositoryId),
    startedAt,
  });

  try {
    // Execute scanning phases
    const artifacts = await this.executePipeline(repositoryId, commitSha);

    // Update scan with results
    await this.db.update(scans)
      .set({
        status: 'completed',
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        artifactsFound: {
          requirements: artifacts.filter(a => a.type === 'requirement').length,
          user_stories: artifacts.filter(a => a.type === 'user_story').length,
          specs: artifacts.filter(a => a.type === 'spec').length,
          evidence: artifacts.filter(a => a.type === 'evidence').length,
        }
      })
      .where(eq(scans.id, scan.id));

  } catch (error) {
    await this.db.update(scans)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error.message,
      })
      .where(eq(scans.id, scan.id));

    throw error;
  }

  return scan.id;
}
```

## Scan Record Schema

```typescript
export const scans = pgTable('scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  repositoryId: uuid('repository_id').references(() => repositories.id, {
    onDelete: 'cascade',
  }),
  status: text('status').notNull(), // pending, in_progress, completed, failed
  commitSha: text('commit_sha').notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
  artifactsFound: jsonb('artifacts_found'), // { requirements: 8, user_stories: 18, ... }
  errorMessage: text('error_message'),
});
```

## Metrics Exposed

- **Duration**: Total scan time in milliseconds
- **Throughput**: Artifacts per second (artifactsFound / durationMs * 1000)
- **Success Rate**: completed_scans / total_scans
- **Error Rate**: failed_scans / total_scans

## Test Scenarios

1. **Successful Scan**: Complete scan → durationMs recorded, artifactsFound populated
2. **Failed Scan**: Scan encounters error → errorMessage populated, status = failed
3. **Performance Tracking**: Scan 100-artifact repo → Verify durationMs < 60,000ms
4. **Artifact Counts**: Verify counts match actual artifacts parsed

## Implementing Specification

SPEC-006-001: Scan Orchestration Service
