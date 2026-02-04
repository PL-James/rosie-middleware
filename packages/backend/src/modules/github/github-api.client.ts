import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { ConfigService } from '@nestjs/config';

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
}

export interface GitHubTreeNode {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

@Injectable()
export class GitHubApiClient {
  private readonly logger = new Logger(GitHubApiClient.name);
  private octokit: Octokit;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('GITHUB_TOKEN');

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'rosie-middleware/0.1.0',
    });
  }

  /**
   * Parse GitHub URL into owner and repo
   */
  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)/,
      /github\.com\/([^\/]+)\/([^\/]+)\.git/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to get repository ${owner}/${repo}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get default branch
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const repoData = await this.getRepository(owner, repo);
    return repoData.default_branch;
  }

  /**
   * Get latest commit SHA for a branch
   */
  async getLatestCommitSha(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch,
      });

      return data.commit.sha;
    } catch (error) {
      this.logger.error(
        `Failed to get commit SHA for ${owner}/${repo}@${branch}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get commit information
   */
  async getCommit(owner: string, repo: string, sha: string) {
    try {
      const { data } = await this.octokit.repos.getCommit({
        owner,
        repo,
        ref: sha,
      });

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to get commit ${sha} for ${owner}/${repo}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get repository tree (file listing)
   */
  async getTree(
    owner: string,
    repo: string,
    treeSha: string,
    recursive = true,
  ): Promise<GitHubTreeNode[]> {
    try {
      const { data } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: treeSha,
        recursive: recursive ? 'true' : undefined,
      });

      return data.tree as GitHubTreeNode[];
    } catch (error) {
      this.logger.error(
        `Failed to get tree for ${owner}/${repo}@${treeSha}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<GitHubFile> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if (Array.isArray(data) || data.type !== 'file') {
        throw new Error(`Path ${path} is not a file`);
      }

      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        path: data.path,
        content,
        sha: data.sha,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get file content for ${owner}/${repo}/${path}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get multiple files in parallel (batched)
   */
  async getFilesContent(
    owner: string,
    repo: string,
    paths: string[],
    ref?: string,
  ): Promise<GitHubFile[]> {
    const batchSize = 10; // Avoid rate limiting
    const results: GitHubFile[] = [];

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((path) =>
          this.getFileContent(owner, repo, path, ref).catch((err) => {
            this.logger.warn(`Failed to fetch ${path}: ${err.message}`);
            return null;
          }),
        ),
      );

      results.push(...batchResults.filter((r) => r !== null));
    }

    return results;
  }

  /**
   * Check if .gxp directory exists
   */
  async isRosieCompliant(owner: string, repo: string, ref?: string): Promise<boolean> {
    try {
      await this.getFileContent(owner, repo, '.gxp/system_context.md', ref);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimit() {
    try {
      const { data } = await this.octokit.rateLimit.get();
      return data.rate;
    } catch (error) {
      this.logger.error('Failed to get rate limit:', error.message);
      throw error;
    }
  }
}
