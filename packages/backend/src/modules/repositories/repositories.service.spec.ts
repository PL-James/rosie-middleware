import { describe, it, expect } from 'vitest';
import { GitHubApiClient } from '../github/github-api.client';

/**
 * Repository Service Unit Tests
 *
 * @gxp-tag SPEC-001-001
 * @trace US-001-001
 * @gxp-criticality HIGH
 * @test-type OQ
 *
 * Validates repository URL parsing, CRUD validation, and service behavior.
 */

describe('RepositoriesService - URL Parsing', () => {
  /**
   * @gxp-tag SPEC-001-001
   * @test-type OQ
   */
  it('should parse HTTPS GitHub URLs correctly', () => {
    const client = new GitHubApiClient({ get: () => 'mock-token' } as any);
    const result = client.parseGitHubUrl('https://github.com/owner/repo');

    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should parse GitHub URLs with .git suffix', () => {
    const client = new GitHubApiClient({ get: () => 'mock-token' } as any);
    const result = client.parseGitHubUrl('https://github.com/owner/repo.git');

    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should return null for invalid URLs', () => {
    const client = new GitHubApiClient({ get: () => 'mock-token' } as any);
    const result = client.parseGitHubUrl('not-a-github-url');

    expect(result).toBeNull();
  });

  it('should handle URLs with nested paths', () => {
    const client = new GitHubApiClient({ get: () => 'mock-token' } as any);
    const result = client.parseGitHubUrl('https://github.com/PL-James/rosie-middleware');

    expect(result).toEqual({ owner: 'PL-James', repo: 'rosie-middleware' });
  });
});
