import { Injectable, Logger } from '@nestjs/common';
import {
  db,
  productRepositories,
  requirements,
  userStories,
  specs,
  evidence,
  traceabilityLinks,
  repositories,
} from '@/db';
import { eq, and, inArray } from 'drizzle-orm';

export interface AggregatedArtifact {
  type: 'requirement' | 'user_story' | 'spec' | 'evidence';
  gxpId: string;
  title: string;
  repositoryId: string;
  repositoryName: string;
  riskRating?: string;
  verificationTier?: string;
}

export interface ComplianceSummary {
  totalRequirements: number;
  totalUserStories: number;
  totalSpecs: number;
  totalEvidence: number;
  coveragePercentage: number;
  highRiskItems: number;
  mediumRiskItems: number;
  lowRiskItems: number;
  repositories: {
    id: string;
    name: string;
    artifactCount: number;
  }[];
}

export interface RiskAssessment {
  overallRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  riskByRepository: {
    repositoryId: string;
    repositoryName: string;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  }[];
}

export interface CrossRepoTraceability {
  isValid: boolean;
  totalLinks: number;
  brokenLinks: number;
  duplicateArtifacts: {
    gxpId: string;
    repositories: string[];
  }[];
  orphanedArtifacts: {
    gxpId: string;
    type: string;
    repositoryId: string;
  }[];
}

@Injectable()
export class ProductAggregationService {
  private readonly logger = new Logger(ProductAggregationService.name);

  /**
   * Get all linked repository IDs for a product
   */
  private async getLinkedRepositoryIds(productId: string): Promise<string[]> {
    const links = await db
      .select({ repositoryId: productRepositories.repositoryId })
      .from(productRepositories)
      .where(eq(productRepositories.productId, productId));

    return links.map((l) => l.repositoryId);
  }

  /**
   * Aggregate all artifacts from linked repositories
   */
  async aggregateArtifacts(productId: string): Promise<AggregatedArtifact[]> {
    const repoIds = await this.getLinkedRepositoryIds(productId);

    if (repoIds.length === 0) {
      return [];
    }

    const aggregated: AggregatedArtifact[] = [];

    // Get all repositories info
    const repos = await db
      .select()
      .from(repositories)
      .where(inArray(repositories.id, repoIds));

    const repoMap = new Map(repos.map((r) => [r.id, r.name]));

    // Aggregate requirements
    const reqs = await db
      .select()
      .from(requirements)
      .where(inArray(requirements.repositoryId, repoIds));

    for (const req of reqs) {
      aggregated.push({
        type: 'requirement',
        gxpId: req.gxpId,
        title: req.title,
        repositoryId: req.repositoryId,
        repositoryName: repoMap.get(req.repositoryId) || 'Unknown',
        riskRating: req.gxpRiskRating || undefined,
      });
    }

    // Aggregate user stories
    const stories = await db
      .select()
      .from(userStories)
      .where(inArray(userStories.repositoryId, repoIds));

    for (const story of stories) {
      aggregated.push({
        type: 'user_story',
        gxpId: story.gxpId,
        title: story.title,
        repositoryId: story.repositoryId,
        repositoryName: repoMap.get(story.repositoryId) || 'Unknown',
      });
    }

    // Aggregate specs
    const allSpecs = await db
      .select()
      .from(specs)
      .where(inArray(specs.repositoryId, repoIds));

    for (const spec of allSpecs) {
      aggregated.push({
        type: 'spec',
        gxpId: spec.gxpId,
        title: spec.title,
        repositoryId: spec.repositoryId,
        repositoryName: repoMap.get(spec.repositoryId) || 'Unknown',
        verificationTier: spec.verificationTier || undefined,
      });
    }

    // Aggregate evidence
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(inArray(evidence.repositoryId, repoIds));

    for (const ev of evidenceList) {
      aggregated.push({
        type: 'evidence',
        gxpId: ev.gxpId || ev.fileName,
        title: ev.fileName,
        repositoryId: ev.repositoryId,
        repositoryName: repoMap.get(ev.repositoryId) || 'Unknown',
        verificationTier: ev.verificationTier || undefined,
      });
    }

    this.logger.log(
      `Aggregated ${aggregated.length} artifacts across ${repoIds.length} repositories for product ${productId}`,
    );

    return aggregated;
  }

  /**
   * Get consolidated compliance summary across all linked repos
   */
  async aggregateCompliance(productId: string): Promise<ComplianceSummary> {
    const repoIds = await this.getLinkedRepositoryIds(productId);

    if (repoIds.length === 0) {
      return {
        totalRequirements: 0,
        totalUserStories: 0,
        totalSpecs: 0,
        totalEvidence: 0,
        coveragePercentage: 0,
        highRiskItems: 0,
        mediumRiskItems: 0,
        lowRiskItems: 0,
        repositories: [],
      };
    }

    const repos = await db
      .select()
      .from(repositories)
      .where(inArray(repositories.id, repoIds));

    const repoMap = new Map(repos.map((r) => [r.id, r]));

    // Count artifacts by type
    const reqs = await db
      .select()
      .from(requirements)
      .where(inArray(requirements.repositoryId, repoIds));

    const stories = await db
      .select()
      .from(userStories)
      .where(inArray(userStories.repositoryId, repoIds));

    const allSpecs = await db
      .select()
      .from(specs)
      .where(inArray(specs.repositoryId, repoIds));

    const evidenceList = await db
      .select()
      .from(evidence)
      .where(inArray(evidence.repositoryId, repoIds));

    // Risk counts
    const highRiskItems = reqs.filter(
      (r) => r.gxpRiskRating === 'HIGH',
    ).length;
    const mediumRiskItems = reqs.filter(
      (r) => r.gxpRiskRating === 'MEDIUM',
    ).length;
    const lowRiskItems = reqs.filter((r) => r.gxpRiskRating === 'LOW').length;

    // Coverage calculation (specs with evidence / total specs)
    const specsWithEvidence = new Set(
      evidenceList.filter((e) => e.specId).map((e) => e.specId),
    ).size;
    const coveragePercentage =
      allSpecs.length > 0
        ? Math.round((specsWithEvidence / allSpecs.length) * 100)
        : 0;

    // Per-repository artifact counts
    const repositorySummary = repos.map((repo) => {
      const repoArtifacts = [
        ...reqs.filter((r) => r.repositoryId === repo.id),
        ...stories.filter((s) => s.repositoryId === repo.id),
        ...allSpecs.filter((s) => s.repositoryId === repo.id),
        ...evidenceList.filter((e) => e.repositoryId === repo.id),
      ];

      return {
        id: repo.id,
        name: repo.name,
        artifactCount: repoArtifacts.length,
      };
    });

    return {
      totalRequirements: reqs.length,
      totalUserStories: stories.length,
      totalSpecs: allSpecs.length,
      totalEvidence: evidenceList.length,
      coveragePercentage,
      highRiskItems,
      mediumRiskItems,
      lowRiskItems,
      repositories: repositorySummary,
    };
  }

  /**
   * Validate cross-repository traceability
   * Detects duplicates and orphaned artifacts
   */
  async validateCrossRepoTraceability(
    productId: string,
  ): Promise<CrossRepoTraceability> {
    const repoIds = await this.getLinkedRepositoryIds(productId);

    if (repoIds.length === 0) {
      return {
        isValid: true,
        totalLinks: 0,
        brokenLinks: 0,
        duplicateArtifacts: [],
        orphanedArtifacts: [],
      };
    }

    // Get all traceability links across repos
    const links = await db
      .select()
      .from(traceabilityLinks)
      .where(inArray(traceabilityLinks.repositoryId, repoIds));

    const brokenLinks = links.filter((l) => !l.isValid).length;

    // Detect duplicate GXP IDs across repositories
    const artifacts = await this.aggregateArtifacts(productId);
    const gxpIdMap = new Map<string, string[]>();

    for (const artifact of artifacts) {
      if (!gxpIdMap.has(artifact.gxpId)) {
        gxpIdMap.set(artifact.gxpId, []);
      }
      gxpIdMap.get(artifact.gxpId)!.push(artifact.repositoryName);
    }

    const duplicateArtifacts = Array.from(gxpIdMap.entries())
      .filter(([_, repos]) => repos.length > 1)
      .map(([gxpId, repos]) => ({
        gxpId,
        repositories: [...new Set(repos)],
      }));

    // Detect orphaned artifacts (no upstream links)
    const orphanedArtifacts: CrossRepoTraceability['orphanedArtifacts'] = [];

    for (const artifact of artifacts) {
      if (artifact.type === 'requirement') continue; // Requirements are root

      const hasUpstream = links.some((l) => l.childGxpId === artifact.gxpId);

      if (!hasUpstream) {
        orphanedArtifacts.push({
          gxpId: artifact.gxpId,
          type: artifact.type,
          repositoryId: artifact.repositoryId,
        });
      }
    }

    const isValid =
      brokenLinks === 0 &&
      duplicateArtifacts.length === 0 &&
      orphanedArtifacts.length === 0;

    this.logger.log(
      `Cross-repo traceability validation for product ${productId}: ${isValid ? 'PASSED' : 'FAILED'}`,
    );

    return {
      isValid,
      totalLinks: links.length,
      brokenLinks,
      duplicateArtifacts,
      orphanedArtifacts,
    };
  }

  /**
   * Aggregate risk assessment across all repositories
   */
  async aggregateRisk(productId: string): Promise<RiskAssessment> {
    const repoIds = await this.getLinkedRepositoryIds(productId);

    if (repoIds.length === 0) {
      return {
        overallRisk: 'LOW',
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        riskByRepository: [],
      };
    }

    const repos = await db
      .select()
      .from(repositories)
      .where(inArray(repositories.id, repoIds));

    const repoMap = new Map(repos.map((r) => [r.id, r.name]));

    // Get all requirements with risk ratings
    const reqs = await db
      .select()
      .from(requirements)
      .where(inArray(requirements.repositoryId, repoIds));

    const highRiskCount = reqs.filter(
      (r) => r.gxpRiskRating === 'HIGH',
    ).length;
    const mediumRiskCount = reqs.filter(
      (r) => r.gxpRiskRating === 'MEDIUM',
    ).length;
    const lowRiskCount = reqs.filter((r) => r.gxpRiskRating === 'LOW').length;

    // Determine overall risk
    let overallRisk: 'HIGH' | 'MEDIUM' | 'LOW';
    if (highRiskCount > 0) {
      overallRisk = 'HIGH';
    } else if (mediumRiskCount > 0) {
      overallRisk = 'MEDIUM';
    } else {
      overallRisk = 'LOW';
    }

    // Per-repository risk breakdown
    const riskByRepository = repos.map((repo) => {
      const repoReqs = reqs.filter((r) => r.repositoryId === repo.id);

      return {
        repositoryId: repo.id,
        repositoryName: repo.name,
        highRisk: repoReqs.filter((r) => r.gxpRiskRating === 'HIGH').length,
        mediumRisk: repoReqs.filter((r) => r.gxpRiskRating === 'MEDIUM')
          .length,
        lowRisk: repoReqs.filter((r) => r.gxpRiskRating === 'LOW').length,
      };
    });

    return {
      overallRisk,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      riskByRepository,
    };
  }
}
