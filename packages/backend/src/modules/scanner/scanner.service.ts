import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  db,
  scans,
  systemContexts,
  requirements,
  userStories,
  specs,
  evidence,
  fileChecksums,
  tagBlocks,
} from '@/db';
import { eq, desc, sql } from 'drizzle-orm';
import { GitHubApiClient } from '../github/github-api.client';
import { ArtifactParserService } from '../artifacts/artifact-parser.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { TraceabilityValidatorService } from '../traceability/traceability-validator.service';
import { createHash } from 'crypto';
import { createPaginatedResponse, PaginatedResponse } from '@/common/pagination.dto';

export interface ParsedTagBlock {
  filePath: string;
  gxpId: string;
  traces: string[];
  gxpType: string | null;
  description: string | null;
  line: number;
  contentSha: string;
}

export interface ScanProgress {
  phase:
    | 'discovery'
    | 'fetch'
    | 'parse'
    | 'validate'
    | 'persist'
    | 'notify'
    | 'completed'
    | 'failed';
  message: string;
  progress: number; // 0-100
  artifactsProcessed?: number;
  totalArtifacts?: number;
}

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  constructor(
    private githubClient: GitHubApiClient,
    private artifactParser: ArtifactParserService,
    private repositoriesService: RepositoriesService,
    private traceabilityValidator: TraceabilityValidatorService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Scan a repository for ROSIE artifacts
   */
  async scanRepository(repositoryId: string): Promise<string> {
    const repository = await this.repositoriesService.findOne(repositoryId);

    // Create scan record
    const [scan] = await db
      .insert(scans)
      .values({
        repositoryId,
        status: 'pending',
      })
      .returning();

    this.logger.log(
      `Starting scan ${scan.id} for repository ${repository.name}`,
    );

    // Update repository last scan
    await this.repositoriesService.updateLastScan(
      repositoryId,
      scan.id,
      'in_progress',
    );

    // Execute scan in background (in production, use BullMQ)
    this.executeScan(scan.id, repository.owner, repository.repo)
      .catch((error) => {
        this.logger.error(`Scan ${scan.id} failed:`, error);
      });

    return scan.id;
  }

  /**
   * Execute the 6-phase scan pipeline with progress callbacks
   * Public method for use by BullMQ processor
   */
  async executeScanWithProgress(
    scanId: string,
    owner: string,
    repo: string,
    onProgress?: (progress: number, phase: string) => Promise<void>,
  ): Promise<void> {
    return this.executeScan(scanId, owner, repo, onProgress);
  }

  /**
   * Execute the 6-phase scan pipeline
   */
  private async executeScan(
    scanId: string,
    owner: string,
    repo: string,
    onProgress?: (progress: number, phase: string) => Promise<void>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update scan status
      await db
        .update(scans)
        .set({
          status: 'in_progress',
          startedAt: new Date(),
        })
        .where(eq(scans.id, scanId));

      // Phase 1: Discovery
      this.logger.log(`[${scanId}] Phase 1: Discovery`);
      if (onProgress) await onProgress(10, 'Discovering files');
      const commitSha = await this.githubClient.getLatestCommitSha(
        owner,
        repo,
        'main',
      );
      const commit = await this.githubClient.getCommit(owner, repo, commitSha);
      const tree = await this.githubClient.getTree(owner, repo, commit.commit.tree.sha, true);

      // Filter for .gxp directory files
      const gxpFiles = tree.filter(
        (node) => node.type === 'blob' && node.path.startsWith('.gxp/'),
      );

      if (gxpFiles.length === 0) {
        throw new Error('No .gxp directory found - repository is not ROSIE-compliant');
      }

      this.logger.log(
        `[${scanId}] Found ${gxpFiles.length} files in .gxp directory`,
      );

      // Phase 1.5: Delta Detection (Incremental Scanning)
      this.logger.log(`[${scanId}] Phase 1.5: Delta Detection`);
      if (onProgress) await onProgress(20, 'Detecting file changes');

      // Get scan record to access repositoryId
      const [scanRecord] = await db.select().from(scans).where(eq(scans.id, scanId));
      const previousChecksums = await db
        .select()
        .from(fileChecksums)
        .where(eq(fileChecksums.repositoryId, scanRecord.repositoryId));

      // Create a map for fast lookup
      const checksumMap = new Map(
        previousChecksums.map((cs) => [cs.filePath, cs.sha256Hash]),
      );

      // Identify changed files by comparing GitHub blob SHAs with stored checksums
      // GitHub provides the SHA-1 hash in the tree, which we can use as our checksum
      const changedFiles = gxpFiles.filter((file) => {
        const previousHash = checksumMap.get(file.path);
        // If file is new or hash changed, include it
        return !previousHash || previousHash !== file.sha;
      });

      // Identify deleted files (files in DB but not in current tree)
      const currentFilePaths = new Set(gxpFiles.map((f) => f.path));
      const deletedFiles = previousChecksums.filter(
        (cs) => !currentFilePaths.has(cs.filePath),
      );

      const totalFiles = gxpFiles.length;
      const skippedFiles = totalFiles - changedFiles.length;
      const deletedCount = deletedFiles.length;

      this.logger.log(
        `[${scanId}] Delta Detection Results:`,
      );
      this.logger.log(
        `  - Total files: ${totalFiles}`,
      );
      this.logger.log(
        `  - Changed files: ${changedFiles.length}`,
      );
      this.logger.log(
        `  - Skipped (unchanged): ${skippedFiles}`,
      );
      this.logger.log(
        `  - Deleted files: ${deletedCount}`,
      );
      this.logger.log(
        `  - Performance: Reduced API calls by ${Math.round((skippedFiles / totalFiles) * 100)}%`,
      );

      // Phase 2: Fetch (only changed files)
      this.logger.log(`[${scanId}] Phase 2: Fetch (${changedFiles.length} changed files)`);
      if (onProgress) await onProgress(30, `Fetching ${changedFiles.length} changed files`);
      const filePaths = changedFiles.map((f) => f.path);
      const files = await this.githubClient.getFilesContent(
        owner,
        repo,
        filePaths,
        commitSha,
      );

      this.logger.log(`[${scanId}] Fetched ${files.length} files`);

      // Phase 3: Parse
      this.logger.log(`[${scanId}] Phase 3: Parse`);
      if (onProgress) await onProgress(50, 'Parsing artifacts');
      const artifacts = {
        systemContext: null as any,
        requirements: [] as any[],
        userStories: [] as any[],
        specs: [] as any[],
        evidence: [] as any[],
        tagBlocks: [] as ParsedTagBlock[],
      };

      for (const file of files) {
        const artifactType = this.artifactParser.getArtifactType(file.path);

        if (file.path === '.gxp/system_context.md') {
          artifacts.systemContext = this.artifactParser.parseSystemContext(
            file.content,
          );
        } else if (artifactType === 'requirement') {
          artifacts.requirements.push({
            ...this.artifactParser.parseRequirement(file.content, file.path),
            filePath: file.path,
          });
        } else if (artifactType === 'user_story') {
          artifacts.userStories.push({
            ...this.artifactParser.parseUserStory(file.content, file.path),
            filePath: file.path,
          });
        } else if (artifactType === 'spec') {
          artifacts.specs.push({
            ...this.artifactParser.parseSpec(file.content, file.path),
            filePath: file.path,
          });
        } else if (artifactType === 'evidence') {
          artifacts.evidence.push({
            ...this.artifactParser.parseEvidence(file.content, file.path),
            fileName: file.path.split('/').pop(),
            filePath: file.path,
          });
        }
      }

      this.logger.log(
        `[${scanId}] Parsed: ${artifacts.requirements.length} requirements, ${artifacts.userStories.length} user stories, ${artifacts.specs.length} specs, ${artifacts.evidence.length} evidence`,
      );

      // Phase 3.5: Parse source file tag blocks (@gxp-* JSDoc annotations)
      this.logger.log(`[${scanId}] Phase 3.5: Scanning source files for @gxp-* tag blocks`);
      if (onProgress) await onProgress(55, 'Scanning source file annotations');

      const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx'];
      const excludeDirs = ['node_modules/', 'dist/', '.gxp/'];
      const sourceFiles = tree.filter(
        (node) =>
          node.type === 'blob' &&
          sourceExtensions.some((ext) => node.path.endsWith(ext)) &&
          !excludeDirs.some((dir) => node.path.startsWith(dir) || node.path.includes(`/${dir}`)),
      );

      if (sourceFiles.length > 0) {
        const sourceFilePaths = sourceFiles.map((f) => f.path);
        const sourceContents = await this.githubClient.getFilesContent(
          owner,
          repo,
          sourceFilePaths,
          commitSha,
        );

        for (const file of sourceContents) {
          const parsed = this.parseTagBlocks(file.content, file.path);
          artifacts.tagBlocks.push(...parsed);
        }

        this.logger.log(
          `[${scanId}] Found ${artifacts.tagBlocks.length} tag blocks in ${sourceContents.length} source files`,
        );
      } else {
        this.logger.log(`[${scanId}] No source files found for tag block scanning`);
      }

      // Phase 4: Validate (basic validation - traceability in Phase 2)
      this.logger.log(`[${scanId}] Phase 4: Validate`);
      if (onProgress) await onProgress(60, 'Validating artifacts');
      if (!artifacts.systemContext) {
        throw new Error('Missing system_context.md');
      }

      // Phase 5: Persist
      this.logger.log(`[${scanId}] Phase 5: Persist`);
      if (onProgress) await onProgress(70, 'Persisting to database');
      const [scan] = await db.select().from(scans).where(eq(scans.id, scanId));

      // Insert or update system context (UPSERT)
      if (artifacts.systemContext) {
        await db
          .insert(systemContexts)
          .values({
            repositoryId: scan.repositoryId,
            scanId,
            ...artifacts.systemContext,
          })
          .onConflictDoUpdate({
            target: [systemContexts.repositoryId],
            set: {
              scanId,
              projectName: sql`excluded.project_name`,
              version: sql`excluded.version`,
              gxpRiskRating: sql`excluded.gxp_risk_rating`,
              validationStatus: sql`excluded.validation_status`,
              intendedUse: sql`excluded.intended_use`,
              regulatory: sql`excluded.regulatory`,
              systemOwner: sql`excluded.system_owner`,
              technicalContact: sql`excluded.technical_contact`,
              sections: sql`excluded.sections`,
            },
          });
      }

      // Insert or update requirements (UPSERT)
      const requirementRecords = await db
        .insert(requirements)
        .values(
          artifacts.requirements.map((r) => ({
            repositoryId: scan.repositoryId,
            scanId,
            gxpId: r.gxpId,
            title: r.title,
            description: r.description,
            gxpRiskRating: r.gxpRiskRating,
            acceptanceCriteria: r.acceptanceCriteria,
            filePath: r.filePath,
            rawContent: r.rawContent,
            metadata: r.metadata,
          })),
        )
        .onConflictDoUpdate({
          target: [requirements.repositoryId, requirements.gxpId],
          set: {
            scanId,
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            gxpRiskRating: sql`excluded.gxp_risk_rating`,
            acceptanceCriteria: sql`excluded.acceptance_criteria`,
            filePath: sql`excluded.file_path`,
            rawContent: sql`excluded.raw_content`,
            metadata: sql`excluded.metadata`,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Insert or update user stories (UPSERT)
      const userStoryRecords = await db
        .insert(userStories)
        .values(
          artifacts.userStories.map((us) => ({
            repositoryId: scan.repositoryId,
            scanId,
            gxpId: us.gxpId,
            parentId: us.parentId,
            title: us.title,
            description: us.description,
            asA: us.asA,
            iWant: us.iWant,
            soThat: us.soThat,
            acceptanceCriteria: us.acceptanceCriteria,
            status: us.status,
            filePath: us.filePath,
            rawContent: us.rawContent,
            metadata: us.metadata,
          })),
        )
        .onConflictDoUpdate({
          target: [userStories.repositoryId, userStories.gxpId],
          set: {
            scanId,
            parentId: sql`excluded.parent_id`,
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            asA: sql`excluded.as_a`,
            iWant: sql`excluded.i_want`,
            soThat: sql`excluded.so_that`,
            acceptanceCriteria: sql`excluded.acceptance_criteria`,
            status: sql`excluded.status`,
            filePath: sql`excluded.file_path`,
            rawContent: sql`excluded.raw_content`,
            metadata: sql`excluded.metadata`,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Insert or update specs (UPSERT)
      const specRecords = await db
        .insert(specs)
        .values(
          artifacts.specs.map((s) => ({
            repositoryId: scan.repositoryId,
            scanId,
            gxpId: s.gxpId,
            parentId: s.parentId,
            title: s.title,
            description: s.description,
            designApproach: s.designApproach,
            implementationNotes: s.implementationNotes,
            verificationTier: s.verificationTier,
            sourceFiles: s.sourceFiles,
            testFiles: s.testFiles,
            filePath: s.filePath,
            rawContent: s.rawContent,
            metadata: s.metadata,
          })),
        )
        .onConflictDoUpdate({
          target: [specs.repositoryId, specs.gxpId],
          set: {
            scanId,
            parentId: sql`excluded.parent_id`,
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            designApproach: sql`excluded.design_approach`,
            implementationNotes: sql`excluded.implementation_notes`,
            verificationTier: sql`excluded.verification_tier`,
            sourceFiles: sql`excluded.source_files`,
            testFiles: sql`excluded.test_files`,
            filePath: sql`excluded.file_path`,
            rawContent: sql`excluded.raw_content`,
            metadata: sql`excluded.metadata`,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Insert or update evidence (UPSERT)
      if (artifacts.evidence.length > 0) {
        await db
          .insert(evidence)
          .values(
            artifacts.evidence.map((e) => ({
              repositoryId: scan.repositoryId,
              scanId,
              gxpId: e.gxpId,
              fileName: e.fileName,
              filePath: e.filePath,
              verificationTier: e.verificationTier,
              jwsPayload: e.jwsPayload,
              jwsHeader: e.jwsHeader,
              signature: e.signature,
              testResults: e.testResults,
              systemState: e.systemState,
              timestamp: e.timestamp,
              rawContent: e.rawContent,
            })),
          )
          .onConflictDoUpdate({
            target: [evidence.repositoryId, evidence.gxpId],
            set: {
              scanId,
              fileName: sql`excluded.file_name`,
              filePath: sql`excluded.file_path`,
              verificationTier: sql`excluded.verification_tier`,
              jwsPayload: sql`excluded.jws_payload`,
              jwsHeader: sql`excluded.jws_header`,
              signature: sql`excluded.signature`,
              testResults: sql`excluded.test_results`,
              systemState: sql`excluded.system_state`,
              timestamp: sql`excluded.timestamp`,
              rawContent: sql`excluded.raw_content`,
            },
          });
      }

      // Phase 5.3: Insert tag blocks (UPSERT)
      if (artifacts.tagBlocks.length > 0) {
        await db
          .insert(tagBlocks)
          .values(
            artifacts.tagBlocks.map((tb) => ({
              repositoryId: scan.repositoryId,
              scanId,
              filePath: tb.filePath,
              gxpId: tb.gxpId,
              traces: tb.traces,
              gxpType: tb.gxpType,
              description: tb.description,
              line: tb.line,
              contentSha: tb.contentSha,
            })),
          )
          .onConflictDoUpdate({
            target: [tagBlocks.repositoryId, tagBlocks.filePath, tagBlocks.gxpId],
            set: {
              scanId,
              traces: sql`excluded.traces`,
              gxpType: sql`excluded.gxp_type`,
              description: sql`excluded.description`,
              line: sql`excluded.line`,
              contentSha: sql`excluded.content_sha`,
            },
          });
        this.logger.log(
          `[${scanId}] Persisted ${artifacts.tagBlocks.length} tag blocks`,
        );
      }

      // Phase 5.4: Update File Checksums
      this.logger.log(`[${scanId}] Phase 5.4: Updating file checksums`);
      if (onProgress) await onProgress(80, 'Updating file checksums');

      // Update checksums for changed files
      if (changedFiles.length > 0) {
        for (const file of changedFiles) {
          await db
            .insert(fileChecksums)
            .values({
              repositoryId: scanRecord.repositoryId,
              filePath: file.path,
              sha256Hash: file.sha, // GitHub blob SHA
              lastScannedAt: new Date(),
              // We'll link artifactId/artifactType in a future enhancement
            })
            .onConflictDoUpdate({
              target: [fileChecksums.repositoryId, fileChecksums.filePath],
              set: {
                sha256Hash: file.sha,
                lastScannedAt: new Date(),
                updatedAt: new Date(),
              },
            });
        }
        this.logger.log(
          `[${scanId}] Updated ${changedFiles.length} file checksums`,
        );
      }

      // Handle deleted files - remove their checksums
      if (deletedCount > 0) {
        for (const deletedFile of deletedFiles) {
          await db
            .delete(fileChecksums)
            .where(eq(fileChecksums.id, deletedFile.id));
        }
        this.logger.log(
          `[${scanId}] Removed ${deletedCount} checksums for deleted files`,
        );
      }

      // Phase 5.5: Build Traceability Graph
      this.logger.log(`[${scanId}] Phase 5.5: Building traceability graph`);
      if (onProgress) await onProgress(85, 'Building traceability graph');
      await this.traceabilityValidator.buildTraceabilityGraph(scan.repositoryId);

      // Detect broken links
      const brokenLinks = await this.traceabilityValidator.detectBrokenLinks(scan.repositoryId);
      if (brokenLinks.length > 0) {
        this.logger.warn(
          `[${scanId}] Found ${brokenLinks.length} broken traceability links`,
        );
      } else {
        this.logger.log(`[${scanId}] Traceability validation: all links valid`);
      }

      // Phase 5.6: Evidence Verification
      this.logger.log(`[${scanId}] Phase 5.6: Verifying evidence signatures`);
      if (onProgress) await onProgress(90, 'Verifying evidence');
      if (artifacts.evidence.length > 0) {
        let verifiedCount = 0;
        for (const evidenceArtifact of artifacts.evidence) {
          try {
            // JWS verification is already done during parsing in artifact-parser.service.ts
            // The isSignatureValid field is set during insertion
            // Here we just log the verification status
            if (evidenceArtifact.isSignatureValid) {
              verifiedCount++;
            }
          } catch (error) {
            this.logger.warn(
              `[${scanId}] Failed to verify evidence ${evidenceArtifact.fileName}: ${error.message}`,
            );
          }
        }
        this.logger.log(
          `[${scanId}] Evidence verification: ${verifiedCount}/${artifacts.evidence.length} valid signatures`,
        );
      } else {
        this.logger.log(
          `[${scanId}] No evidence artifacts to verify`,
        );
      }

      // Phase 6: Notify
      this.logger.log(`[${scanId}] Phase 6: Notify`);
      if (onProgress) await onProgress(95, 'Completing scan');
      const durationMs = Date.now() - startTime;

      // Update scan record
      await db
        .update(scans)
        .set({
          status: 'completed',
          commitSha,
          commitMessage: commit.commit.message,
          completedAt: new Date(),
          durationMs,
          artifactsFound: files.length,
          artifactsCreated:
            requirementRecords.length +
            userStoryRecords.length +
            specRecords.length +
            artifacts.evidence.length +
            artifacts.tagBlocks.length,
        })
        .where(eq(scans.id, scanId));

      // Update repository
      await this.repositoriesService.updateLastScan(
        scan.repositoryId,
        scanId,
        'completed',
      );

      // Invalidate all caches for this repository
      this.logger.log(`[${scanId}] Invalidating caches for repository`);
      await this.invalidateRepositoryCaches(scan.repositoryId);

      this.logger.log(
        `[${scanId}] Scan completed in ${durationMs}ms - ${requirementRecords.length + userStoryRecords.length + specRecords.length + artifacts.evidence.length + artifacts.tagBlocks.length} artifacts created (incl. ${artifacts.tagBlocks.length} tag blocks)`,
      );
    } catch (error) {
      this.logger.error(`[${scanId}] Scan failed:`, error);

      const durationMs = Date.now() - startTime;

      await db
        .update(scans)
        .set({
          status: 'failed',
          completedAt: new Date(),
          durationMs,
          errorMessage: error.message,
          errorStack: error.stack,
        })
        .where(eq(scans.id, scanId));

      const [scan] = await db.select().from(scans).where(eq(scans.id, scanId));
      await this.repositoriesService.updateLastScan(
        scan.repositoryId,
        scanId,
        'failed',
      );

      throw error;
    }
  }

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string) {
    const [scan] = await db.select().from(scans).where(eq(scans.id, scanId));

    if (!scan) {
      throw new NotFoundException(`Scan with ID ${scanId} not found`);
    }

    return scan;
  }

  /**
   * Get paginated scans for a repository
   *
   * @param repositoryId - Repository UUID
   * @param page - Page number (1-indexed, defaults to 1)
   * @param limit - Items per page (defaults to 20, max 100)
   * @returns Paginated scan results with metadata
   */
  async getRepositoryScans(
    repositoryId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<typeof scans.$inferSelect>> {
    // Validate pagination params
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(100, Math.max(1, limit));
    const offset = (validatedPage - 1) * validatedLimit;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scans)
      .where(eq(scans.repositoryId, repositoryId));

    const total = countResult?.count || 0;

    // Get paginated scans (ordered by most recent first)
    const scanRecords = await db
      .select()
      .from(scans)
      .where(eq(scans.repositoryId, repositoryId))
      .orderBy(desc(scans.createdAt))
      .limit(validatedLimit)
      .offset(offset);

    return createPaginatedResponse(scanRecords, total, validatedPage, validatedLimit);
  }

  /**
   * Parse JSDoc @gxp-* tag blocks from source file content
   */
  private parseTagBlocks(content: string, filePath: string): ParsedTagBlock[] {
    const blocks: ParsedTagBlock[] = [];
    const lines = content.split('\n');

    // Match JSDoc comment blocks containing @gxp-tag
    const jsdocBlockRegex = /\/\*\*[\s\S]*?\*\//g;
    let match: RegExpExecArray | null;

    while ((match = jsdocBlockRegex.exec(content)) !== null) {
      const block = match[0];

      // Only process blocks with @gxp-tag
      const gxpTagMatch = block.match(/@gxp-tag\s+\{?\s*([^\s}]+)\s*\}?/);
      if (!gxpTagMatch) continue;

      const gxpId = gxpTagMatch[1];

      // Calculate line number (1-indexed)
      const beforeBlock = content.substring(0, match.index);
      const line = beforeBlock.split('\n').length;

      // Extract @gxp-type or @test-type
      const typeMatch = block.match(/@(?:gxp-type|test-type)\s+\{?\s*([^\s}]+)\s*\}?/);
      const gxpType = typeMatch ? typeMatch[1] : null;

      // Extract @requirement or @traces references
      const traces: string[] = [];
      const tracesRegex = /@(?:requirement|traces)\s+\{?\s*([^\s}]+)\s*\}?/g;
      let traceMatch: RegExpExecArray | null;
      while ((traceMatch = tracesRegex.exec(block)) !== null) {
        traces.push(traceMatch[1]);
      }

      // Extract description: @description tag or first meaningful line after /**
      let description: string | null = null;
      const descMatch = block.match(/@description\s+(.+)/);
      if (descMatch) {
        description = descMatch[1].replace(/\*\/$/, '').trim();
      } else {
        // First line after /** that isn't a tag
        const blockLines = block.split('\n');
        for (const bLine of blockLines) {
          const cleaned = bLine.replace(/^\s*\/?\*+\s?/, '').trim();
          if (cleaned && !cleaned.startsWith('@') && cleaned !== '/') {
            description = cleaned;
            break;
          }
        }
      }

      // Compute SHA256 of the full JSDoc block
      const contentSha = createHash('sha256').update(block).digest('hex');

      blocks.push({
        filePath,
        gxpId,
        traces,
        gxpType,
        description,
        line,
        contentSha,
      });
    }

    return blocks;
  }

  /**
   * Invalidate all cached data for a repository
   * Called after scan completion to ensure fresh data
   */
  private async invalidateRepositoryCaches(repositoryId: string): Promise<void> {
    const cacheKeys = [
      `/api/v1/repositories/${repositoryId}/system-context`,
      `/api/v1/repositories/${repositoryId}/requirements`,
      `/api/v1/repositories/${repositoryId}/user-stories`,
      `/api/v1/repositories/${repositoryId}/specs`,
      `/api/v1/repositories/${repositoryId}/evidence`,
      `/api/v1/repositories/${repositoryId}/compliance/report`,
      `/api/v1/repositories/${repositoryId}/compliance/risk-assessment`,
      `/api/v1/repositories/${repositoryId}/tag-blocks`,
    ];

    for (const key of cacheKeys) {
      try {
        await this.cacheManager.del(key);
        this.logger.debug(`Invalidated cache for ${key}`);
      } catch (error) {
        // Log but don't fail if cache invalidation fails
        this.logger.warn(`Failed to invalidate cache for ${key}:`, error.message);
      }
    }
  }
}
