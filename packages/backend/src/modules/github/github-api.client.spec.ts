import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubApiClient } from './github-api.client';
import { ConfigService } from '@nestjs/config';

/**
 * GitHub API Client Unit Tests
 *
 * @gxp-tag REQ-GH-001
 * @gxp-criticality HIGH
 * @test-type unit
 *
 * Validates file content encoding validation and large file handling.
 */

describe('GitHubApiClient - File Content Encoding', () => {
  let client: GitHubApiClient;
  let mockOctokit: any;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockReturnValue('mock-github-token'),
    } as any;

    client = new GitHubApiClient(mockConfigService);

    // Access private octokit instance to mock it
    mockOctokit = {
      repos: {
        getContent: vi.fn(),
        get: vi.fn(),
        getBranch: vi.fn(),
        getCommit: vi.fn(),
      },
      git: {
        getTree: vi.fn(),
        getBlob: vi.fn(),
      },
      rateLimit: {
        get: vi.fn(),
      },
    };

    // Replace octokit with mock
    (client as any).octokit = mockOctokit;
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies base64-encoded files are decoded correctly
   */
  it('should decode base64-encoded file content', async () => {
    const mockContent = Buffer.from('Hello, World!').toString('base64');

    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'file',
        path: 'test.txt',
        content: mockContent,
        encoding: 'base64',
        sha: 'abc123',
      },
    });

    const result = await client.getFileContent('owner', 'repo', 'test.txt');

    expect(result.content).toBe('Hello, World!');
    expect(result.path).toBe('test.txt');
    expect(result.sha).toBe('abc123');
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies utf-8 encoded files are handled correctly
   */
  it('should handle utf-8 encoded file content', async () => {
    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'file',
        path: 'test.txt',
        content: 'Plain text content',
        encoding: 'utf-8',
        sha: 'abc123',
      },
    });

    const result = await client.getFileContent('owner', 'repo', 'test.txt');

    expect(result.content).toBe('Plain text content');
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies utf8 variant encoding is handled correctly
   */
  it('should handle utf8 (without hyphen) encoded file content', async () => {
    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'file',
        path: 'test.txt',
        content: 'Plain text content',
        encoding: 'utf8',
        sha: 'abc123',
      },
    });

    const result = await client.getFileContent('owner', 'repo', 'test.txt');

    expect(result.content).toBe('Plain text content');
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies large files (encoding="none") are fetched via Git Blob API
   */
  it('should fetch large files via Git Blob API when encoding is "none"', async () => {
    const largeMockContent = Buffer.from('Large file content').toString('base64');

    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'file',
        path: 'large-file.txt',
        content: '', // Empty when encoding is "none"
        encoding: 'none',
        sha: 'blob123',
      },
    });

    mockOctokit.git.getBlob.mockResolvedValue({
      data: {
        content: largeMockContent,
        encoding: 'base64',
      },
    });

    const result = await client.getFileContent('owner', 'repo', 'large-file.txt');

    expect(result.content).toBe('Large file content');
    expect(mockOctokit.git.getBlob).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      file_sha: 'blob123',
    });
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies unsupported encoding throws descriptive error
   */
  it('should throw error for unsupported encoding types', async () => {
    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'file',
        path: 'test.bin',
        content: 'binary content',
        encoding: 'binary', // Unsupported
        sha: 'abc123',
      },
    });

    await expect(
      client.getFileContent('owner', 'repo', 'test.bin')
    ).rejects.toThrow("Unsupported encoding 'binary'");
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @description Verifies directory access is rejected
   */
  it('should throw error when path is a directory', async () => {
    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'dir',
        path: 'src',
      },
    });

    await expect(
      client.getFileContent('owner', 'repo', 'src')
    ).rejects.toThrow('Path src is not a file');
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @description Verifies array response is rejected
   */
  it('should throw error when response is an array', async () => {
    mockOctokit.repos.getContent.mockResolvedValue({
      data: [
        { type: 'file', path: 'file1.txt' },
        { type: 'file', path: 'file2.txt' },
      ],
    });

    await expect(
      client.getFileContent('owner', 'repo', 'src')
    ).rejects.toThrow('Path src is not a file');
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies Unicode content is preserved during base64 decoding
   */
  it('should preserve Unicode characters during decoding', async () => {
    const unicodeText = 'Hello 世界 🌍 Привет';
    const mockContent = Buffer.from(unicodeText).toString('base64');

    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'file',
        path: 'unicode.txt',
        content: mockContent,
        encoding: 'base64',
        sha: 'abc123',
      },
    });

    const result = await client.getFileContent('owner', 'repo', 'unicode.txt');

    expect(result.content).toBe(unicodeText);
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @description Verifies empty files are handled correctly
   */
  it('should handle empty files', async () => {
    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'file',
        path: 'empty.txt',
        content: '',
        encoding: 'base64',
        sha: 'abc123',
      },
    });

    const result = await client.getFileContent('owner', 'repo', 'empty.txt');

    expect(result.content).toBe('');
  });

  /**
   * @gxp-tag REQ-GH-001
   * @gxp-criticality HIGH
   * @test-type unit
   * @description Verifies Git Blob API error handling for large files
   */
  it('should handle Git Blob API errors for large files', async () => {
    mockOctokit.repos.getContent.mockResolvedValue({
      data: {
        type: 'file',
        path: 'large.txt',
        content: '',
        encoding: 'none',
        sha: 'blob123',
      },
    });

    mockOctokit.git.getBlob.mockRejectedValue(new Error('Blob not found'));

    await expect(
      client.getFileContent('owner', 'repo', 'large.txt')
    ).rejects.toThrow('Blob not found');
  });
});
