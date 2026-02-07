---
gxp_id: US-002-001
title: "GitHub Authentication"
parent_id: REQ-002
as_a: "ROSIE Middleware System"
i_want: "to authenticate with GitHub API using secure credentials"
so_that: "I can access private repositories and fetch contents securely"
acceptance_criteria:
  - Accept GITHUB_TOKEN environment variable
  - Initialize Octokit client with authentication
  - Validate token on application startup
  - Log authentication failures with actionable error messages
  - Support GitHub PAT and GitHub App credentials (future)
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented in GitHub API Client (`packages/backend/src/modules/github/github-api.client.ts`):

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
}
```

## Security Considerations

- Token stored in environment variable (never in database or git)
- Token validated on startup (fail-fast if invalid)
- Token never logged or exposed in API responses
- Supports scoped tokens (prefer minimal scope: `repo` for private, `public_repo` for public)

## Test Scenarios

1. **Valid Token**: Start app with valid GITHUB_TOKEN → Authentication succeeds
2. **Missing Token**: Start app without GITHUB_TOKEN → Throws error, app fails to start
3. **Invalid Token**: Start app with malformed token → Authentication fails, error logged
4. **Token Validation**: Call validateToken() → Verifies token with GitHub API

## Implementing Specification

SPEC-002-001: GitHub API Client Implementation
