---
gxp_id: SPEC-002-002
title: "GitHub API Rate Limiting Logic"
parent_id: US-002-003
verification_tier: PQ
design_approach: |
  Implement rate limit monitoring and batching logic to minimize GitHub API calls.
  Check X-RateLimit-Remaining header and log warnings when limits approached.
  Future: Implement exponential backoff and pause/resume functionality.
source_files:
  - packages/backend/src/modules/github/github-api.client.ts
test_files: []
validation_status: DRAFT
---

## Performance Qualification (PQ)

This specification defines rate limiting strategy. PQ verification ensures system handles API rate limits efficiently.

## Rate Limit Monitoring

```typescript
async checkRateLimit(): Promise<void> {
  const response = await this.octokit.rest.rateLimit.get();
  const remaining = response.data.rate.remaining;
  const limit = response.data.rate.limit;

  if (remaining < 100) {
    this.logger.warn(`GitHub API rate limit low: ${remaining}/${limit} remaining`);
  }

  if (remaining === 0) {
    const resetTime = new Date(response.data.rate.reset * 1000);
    throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}`);
  }
}
```

## Batching Strategy

**Without Batching:**
- 100 files = 100 sequential API calls
- Duration: ~30 seconds
- Rate limit consumption: 100 calls

**With Batching (10 per batch):**
- 100 files = 10 batches × 10 parallel calls
- Duration: ~5 seconds (6x faster)
- Rate limit consumption: 100 calls (same, but faster)

## Implementation

```typescript
async getFilesContent(
  owner: string,
  repo: string,
  paths: string[],
  ref: string
): Promise<FileContent[]> {
  // Check rate limit before batch operations
  await this.checkRateLimit();

  const BATCH_SIZE = 10;
  const batches = [];

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    batches.push(paths.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map((path) => this.getFileContent(owner, repo, path, ref))
    );
    results.push(...batchResults);
  }

  return results;
}
```

## GitHub Rate Limits

**Authenticated Requests:**
- **Personal Access Token (PAT)**: 5,000 requests/hour
- **GitHub App**: 15,000 requests/hour (future)

**Rate Limit Headers:**
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4987
X-RateLimit-Reset: 1675437600
```

## Future Enhancements

1. **Exponential Backoff:**
   - Retry failed requests with increasing delay
   - Max 3 retries before failing

2. **Pause/Resume:**
   - Pause scanning when rate limit exhausted
   - Resume when limit resets (checked via cron)

3. **GitHub App:**
   - Migrate from PAT to GitHub App for higher limits
   - 15,000 requests/hour vs 5,000

## Verification Method

**Performance Qualification (PQ):**

1. **Batching Performance:**
   - Fetch 100 files → Measure duration
   - Verify sub-10 second completion
   - Verify batching used (logs show batch count)

2. **Rate Limit Warning:**
   - Mock rate limit at 50 remaining
   - Trigger scan
   - Verify warning logged

3. **Rate Limit Exhaustion:**
   - Mock rate limit at 0 remaining
   - Trigger scan
   - Verify error thrown with reset time

4. **Large Repository:**
   - Scan repository with 500+ files
   - Verify completion without rate limit errors
   - Monitor API call efficiency

## Implementation Files

- `packages/backend/src/modules/github/github-api.client.ts`
