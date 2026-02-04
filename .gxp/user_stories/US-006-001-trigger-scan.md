---
gxp_id: US-006-001
title: "Trigger Manual Scan"
parent_id: REQ-006
as_a: "Quality Assurance Engineer"
i_want: "to manually trigger a compliance scan for a repository"
so_that: "I can validate latest changes and update compliance reports"
acceptance_criteria:
  - POST /api/v1/repositories/{id}/scan endpoint
  - Accept optional commit_sha parameter (default: latest)
  - Return scan_id for status polling
  - Prevent concurrent scans of same repository
  - Update repository.last_scanned_at timestamp
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in Repository Controller:

```typescript
@Post(':id/scan')
async triggerScan(
  @Param('id') id: string,
  @Body() dto: TriggerScanDto
): Promise<{ scanId: string }> {
  // Prevent concurrent scans
  const activeScan = await this.scanService.findActiveScan(id);
  if (activeScan) {
    throw new ConflictException('Scan already in progress');
  }

  const scanId = await this.scanService.scanRepository(id, dto.commitSha);

  return { scanId };
}
```

## Request/Response

**Request:**
```http
POST /api/v1/repositories/abc123/scan
Content-Type: application/json

{
  "commitSha": "a1b2c3d4" // Optional, defaults to latest
}
```

**Response:**
```json
{
  "scanId": "scan-xyz789",
  "status": "pending",
  "message": "Scan initiated. Poll /api/v1/scans/{scanId} for status."
}
```

## Scan Status Polling

```http
GET /api/v1/scans/scan-xyz789

{
  "id": "scan-xyz789",
  "repositoryId": "abc123",
  "status": "in_progress",
  "progress": 67,
  "currentPhase": "Parse",
  "artifactsFound": 43,
  "startedAt": "2026-02-03T12:00:00Z"
}
```

## Concurrent Scan Prevention

- Check for existing scan with status = "pending" or "in_progress"
- Return 409 Conflict if active scan found
- Allow new scan only when previous scan status = "completed" or "failed"

## Test Scenarios

1. **Successful Trigger**: POST /scan → Returns scanId, scan starts
2. **Concurrent Prevention**: POST /scan while scan active → Returns 409 Conflict
3. **Custom Commit**: POST /scan with commitSha → Scans specific commit
4. **Latest Commit**: POST /scan without commitSha → Scans HEAD of default branch

## Implementing Specification

SPEC-006-001: Scan Orchestration Service
