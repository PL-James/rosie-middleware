---
gxp_id: SPEC-006-001
title: "Scan Orchestration Service"
parent_id: US-006-001
verification_tier: PQ
design_approach: |
  Orchestrate 6-phase scanning pipeline: Discovery → Fetch → Parse → Validate →
  Persist → Notify. Track scan status and metrics.
source_files:
  - packages/backend/src/modules/scanner/scanner.service.ts
test_files:
  - packages/backend/src/modules/scanner/scanner-pipeline.integration.spec.ts
validation_status: DRAFT
---

## Performance Qualification (PQ)

Verifies scanning pipeline executes phases correctly and handles errors.

## Implementation

```typescript
async scanRepository(repositoryId: string, commitSha?: string): Promise<string> {
  const startedAt = new Date();
  const scan = await this.createScan(repositoryId, commitSha);

  try {
    const artifacts = await this.discoveryPhase(repositoryId);
    const contents = await this.fetchPhase(artifacts);
    const parsed = await this.parsePhase(contents);
    const validated = await this.validatePhase(parsed);
    await this.persistPhase(repositoryId, validated);
    await this.notifyPhase(scan.id);

    await this.updateScan(scan.id, 'completed', Date.now() - startedAt.getTime());
  } catch (error) {
    await this.updateScan(scan.id, 'failed', undefined, error.message);
    throw error;
  }

  return scan.id;
}
```

## Verification Method

**Tests:**
- Complete scan → All phases execute
- Discovery fails → Scan status = failed
- Parse errors → Logs warnings, scan continues

## Implementation Files

- `packages/backend/src/modules/scanner/scanner.service.ts`
