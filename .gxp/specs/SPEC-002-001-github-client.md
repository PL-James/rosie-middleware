---
gxp_id: SPEC-002-001
title: "GitHub API Client Implementation"
parent_id: US-002-001
verification_tier: OQ
design_approach: |
  Implement GitHub API client using Octokit SDK. Provide methods for repository
  validation, tree fetching, and file content retrieval with commit SHA verification.
source_files:
  - packages/backend/src/modules/github/github-api.client.ts
  - packages/backend/src/modules/github/github.module.ts
test_files: []
validation_status: DRAFT
assurance_status: DRAFT
---

## Operational Qualification (OQ)

This specification defines GitHub API integration. OQ verification ensures API calls work correctly and handle errors gracefully.

## Client Implementation

```typescript
@Injectable()
export class GitHubApiClient {
  private octokit: Octokit;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable not set');
    }

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'rosie-middleware/0.1.0',
    });
  }

  async validateToken(): Promise<void> {
    try {
      await this.octokit.rest.users.getAuthenticated();
      this.logger.log('GitHub authentication successful');
    } catch (error) {
      this.logger.error('GitHub authentication failed', error);
      throw new Error('Invalid GitHub token');
    }
  }

  parseGitHubUrl(url: string): { owner: string; repo: string } {
    const patterns = [
      /https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
      /git@github\.com:([^\/]+)\/([^\/]+?)\.git$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }

    throw new Error('Invalid GitHub URL');
  }

  async getLatestCommitSha(owner: string, repo: string, branch = 'main'): Promise<string> {
    const response = await this.octokit.rest.repos.getBranch({ owner, repo, branch });
    return response.data.commit.sha;
  }

  async getTree(
    owner: string,
    repo: string,
    treeSha: string,
    recursive = true
  ): Promise<TreeNode[]> {
    const response = await this.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: recursive ? '1' : '0',
    });

    return response.data.tree
      .filter((node) => node.path?.startsWith('.gxp/'))
      .map((node) => ({
        path: node.path,
        type: node.type,
        sha: node.sha,
      }));
  }

  async getFilesContent(
    owner: string,
    repo: string,
    paths: string[],
    ref: string
  ): Promise<FileContent[]> {
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

  private async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): Promise<FileContent> {
    const response = await this.octokit.rest.repos.getContent({ owner, repo, path, ref });

    if ('content' in response.data) {
      const decoded = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return { path, content: decoded };
    }

    throw new Error(`File not found: ${path}`);
  }
}
```

## Key Methods

### validateToken()
- Verify GitHub authentication on startup
- Fail-fast if token invalid

### parseGitHubUrl(url)
- Extract owner and repo from various URL formats
- Throw error if URL malformed

### getLatestCommitSha(owner, repo, branch)
- Fetch latest commit SHA for branch
- Default branch: main

### getTree(owner, repo, treeSha, recursive)
- Fetch repository file tree
- Filter to .gxp/ directory only
- Return array of TreeNode objects

### getFilesContent(owner, repo, paths, ref)
- Batch file content requests (10 per batch)
- Decode base64 to UTF-8
- Return array of FileContent objects

## Error Handling

- **Authentication Failure**: Throws error on startup
- **Rate Limit**: Logs warning (future: exponential backoff)
- **File Not Found**: Throws error with file path
- **API Error**: Logs error and re-throws

## Verification Method

**Operational Qualification (OQ):**

1. **Token Validation:**
   - Start app with valid token → Logs "authentication successful"
   - Start app with invalid token → Throws error

2. **URL Parsing:**
   - Parse https://github.com/owner/repo → Returns { owner, repo }
   - Parse git@github.com:owner/repo.git → Returns { owner, repo }
   - Parse invalid URL → Throws error

3. **Tree Fetching:**
   - Fetch tree for rosie-middleware → Returns .gxp/ files
   - Verify filtering to .gxp/ directory works

4. **File Fetching:**
   - Fetch 25 files in batches → Returns 25 FileContent objects
   - Verify base64 decoding correct
   - Verify batching reduces API calls

## Implementation Files

- `packages/backend/src/modules/github/github-api.client.ts`
