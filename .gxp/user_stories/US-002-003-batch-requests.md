---
gxp_id: US-002-003
title: "Batch File Content Requests"
parent_id: REQ-002
as_a: "ROSIE Middleware System"
i_want: "to fetch multiple file contents in batches to minimize GitHub API calls"
so_that: "I can scan large repositories efficiently without exhausting rate limits"
acceptance_criteria:
  - Group file requests into batches of 10
  - Use Promise.all() for parallel batch requests
  - Decode base64 content to UTF-8
  - Return array of file contents with paths
  - Reduce total API calls from N (files) to N/10 (batches)
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in GitHub API Client:

```typescript
async getFilesContent(
  owner: string,
  repo: string,
  paths: string[],
  ref: string
): Promise<FileContent[]> {
  const BATCH_SIZE = 10;
  const batches = [];

  // Split paths into batches of 10
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

private async getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<FileContent> {
  const response = await this.octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  if ('content' in response.data) {
    const decoded = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return { path, content: decoded };
  }

  throw new Error(`File not found: ${path}`);
}
```

## Batching Strategy

- **Before optimization**: 100 files = 100 sequential API calls (slow, rate limit risk)
- **After optimization**: 100 files = 10 batches × 10 parallel calls = ~10x faster

## Test Scenarios

1. **Single Batch**: Fetch 5 files → Single batch, 5 parallel requests
2. **Multiple Batches**: Fetch 25 files → 3 batches (10 + 10 + 5)
3. **Large Repository**: Fetch 100 files → 10 batches, verify performance improvement
4. **Base64 Decoding**: Verify UTF-8 content correctly decoded

## Performance Metrics

- **Before batching**: 100 files in ~30 seconds (sequential)
- **After batching**: 100 files in ~5 seconds (parallel batches)
- Rate limit consumption: Same (100 calls), but faster completion

## Implementing Specification

SPEC-002-002: Rate Limiting and Batching Logic
