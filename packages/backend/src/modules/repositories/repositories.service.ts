import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, repositories } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { GitHubApiClient } from '../github/github-api.client';
import { CreateRepositoryDto } from './dto/create-repository.dto';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(private githubClient: GitHubApiClient) {}

  /**
   * Create a new repository
   */
  async create(dto: CreateRepositoryDto) {
    // Parse GitHub URL
    const parsed = this.githubClient.parseGitHubUrl(dto.gitUrl);
    if (!parsed) {
      throw new BadRequestException('Invalid GitHub URL');
    }

    const { owner, repo } = parsed;

    // Verify repository exists on GitHub
    try {
      await this.githubClient.getRepository(owner, repo);
    } catch (_error) {
      throw new BadRequestException(
        `Repository not found or inaccessible: ${owner}/${repo}`,
      );
    }

    // Get default branch
    const defaultBranch = await this.githubClient.getDefaultBranch(
      owner,
      repo,
    );

    // Check ROSIE compliance
    const isRosieCompliant = await this.githubClient.isRosieCompliant(
      owner,
      repo,
      defaultBranch,
    );

    if (!isRosieCompliant) {
      this.logger.warn(
        `Repository ${owner}/${repo} is not ROSIE-compliant (missing .gxp/system_context.md)`,
      );
    }

    // Insert repository
    const [repository] = await db
      .insert(repositories)
      .values({
        name: dto.name,
        gitUrl: dto.gitUrl,
        description: dto.description,
        owner,
        repo,
        defaultBranch,
        autoScan: dto.autoScan ?? false,
        scanIntervalMinutes: dto.scanIntervalMinutes ?? 60,
        isRosieCompliant,
      })
      .returning();

    this.logger.log(`Created repository: ${repository.name} (${repository.id})`);

    return repository;
  }

  /**
   * Get all repositories
   */
  async findAll() {
    return db.select().from(repositories).orderBy(desc(repositories.createdAt));
  }

  /**
   * Get repository by ID
   */
  async findOne(id: string) {
    const [repository] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, id));

    if (!repository) {
      throw new NotFoundException(`Repository with ID ${id} not found`);
    }

    return repository;
  }

  /**
   * Update repository
   */
  async update(id: string, data: Partial<CreateRepositoryDto>) {
    const [updated] = await db
      .update(repositories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(repositories.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Repository with ID ${id} not found`);
    }

    this.logger.log(`Updated repository: ${id}`);

    return updated;
  }

  /**
   * Delete repository
   */
  async remove(id: string) {
    const [deleted] = await db
      .delete(repositories)
      .where(eq(repositories.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Repository with ID ${id} not found`);
    }

    this.logger.log(`Deleted repository: ${id}`);

    return deleted;
  }

  /**
   * Update last scan metadata
   */
  async updateLastScan(
    id: string,
    scanId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
  ) {
    await db
      .update(repositories)
      .set({
        lastScanId: scanId,
        lastScanAt: new Date(),
        lastScanStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(repositories.id, id));
  }
}
