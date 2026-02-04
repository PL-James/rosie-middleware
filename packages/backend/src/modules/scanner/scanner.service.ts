import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  db,
  scans,
  systemContexts,
  requirements,
  userStories,
  specs,
  evidence,
} from '@/db';
import { eq } from 'drizzle-orm';
import { GitHubApiClient } from '../github/github-api.client';
import { ArtifactParserService } from '../artifacts/artifact-parser.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { TraceabilityValidatorService } from '../traceability/traceability-validator.service';

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
   * Execute the 6-phase scan pipeline
   */
  private async executeScan(
    scanId: string,
    owner: string,
    repo: string,
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

      // Phase 2: Fetch
      this.logger.log(`[${scanId}] Phase 2: Fetch`);
      const filePaths = gxpFiles.map((f) => f.path);
      const files = await this.githubClient.getFilesContent(
        owner,
        repo,
        filePaths,
        commitSha,
      );

      this.logger.log(`[${scanId}] Fetched ${files.length} files`);

      // Phase 3: Parse
      this.logger.log(`[${scanId}] Phase 3: Parse`);
      const artifacts = {
        systemContext: null as any,
        requirements: [] as any[],
        userStories: [] as any[],
        specs: [] as any[],
        evidence: [] as any[],
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

      // Phase 4: Validate (basic validation - traceability in Phase 2)
      this.logger.log(`[${scanId}] Phase 4: Validate`);
      if (!artifacts.systemContext) {
        throw new Error('Missing system_context.md');
      }

      // Phase 5: Persist
      this.logger.log(`[${scanId}] Phase 5: Persist`);
      const [scan] = await db.select().from(scans).where(eq(scans.id, scanId));

      // Insert system context
      if (artifacts.systemContext) {
        await db.insert(systemContexts).values({
          repositoryId: scan.repositoryId,
          scanId,
          ...artifacts.systemContext,
        });
      }

      // Insert requirements
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
        .returning();

      // Insert user stories
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
        .returning();

      // Insert specs
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
        .returning();

      // Insert evidence
      if (artifacts.evidence.length > 0) {
        await db.insert(evidence).values(
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
        );
      }

      // Phase 5.5: Build Traceability Graph
      this.logger.log(`[${scanId}] Phase 5.5: Building traceability graph`);
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
            artifacts.evidence.length,
        })
        .where(eq(scans.id, scanId));

      // Update repository
      await this.repositoriesService.updateLastScan(
        scan.repositoryId,
        scanId,
        'completed',
      );

      this.logger.log(
        `[${scanId}] Scan completed in ${durationMs}ms - ${requirementRecords.length + userStoryRecords.length + specRecords.length + artifacts.evidence.length} artifacts created`,
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
   * Get all scans for a repository
   */
  async getRepositoryScans(repositoryId: string) {
    return db
      .select()
      .from(scans)
      .where(eq(scans.repositoryId, repositoryId))
      .orderBy(scans.createdAt);
  }
}
