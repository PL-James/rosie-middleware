import { Injectable, Logger } from '@nestjs/common';
import { db, requirements, userStories, specs, evidence } from '@/db';
import { eq } from 'drizzle-orm';

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  rationale: string;
}

export interface RiskAssessment {
  repositoryId: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number; // 0-100
  riskLevel: string;
  breakdown: {
    requirementsCoverage: number;
    evidenceQuality: number;
    verificationCompleteness: number;
    traceabilityIntegrity: number;
  };
  factors: RiskFactor[];
  recommendations: string[];
  assessedAt: Date;
}

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  /**
   * Calculate comprehensive risk assessment for a repository
   */
  async calculateRisk(repositoryId: string): Promise<RiskAssessment> {
    this.logger.log(`Calculating risk assessment for repository ${repositoryId}`);

    // Get all requirements
    const requirementsList = await db
      .select()
      .from(requirements)
      .where(eq(requirements.repositoryId, repositoryId));

    // Get all user stories (needed for proper traceability chain)
    const userStoriesList = await db
      .select()
      .from(userStories)
      .where(eq(userStories.repositoryId, repositoryId));

    // Get all specs
    const specsList = await db
      .select()
      .from(specs)
      .where(eq(specs.repositoryId, repositoryId));

    // Get all evidence
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(eq(evidence.repositoryId, repositoryId));

    // Calculate individual risk factors
    const factors: RiskFactor[] = [];

    // Factor 1: Requirements Coverage (30% weight)
    const requirementsCoverage = this.calculateRequirementsCoverage(
      requirementsList,
      userStoriesList,
      specsList,
    );
    factors.push({
      factor: 'Requirements Coverage',
      weight: 0.3,
      score: requirementsCoverage,
      rationale: `${requirementsList.length} requirements traced through ${userStoriesList.length} user stories to ${specsList.length} specifications`,
    });

    // Factor 2: Evidence Quality (30% weight)
    const evidenceQuality = this.calculateEvidenceQuality(evidenceList);
    factors.push({
      factor: 'Evidence Quality',
      weight: 0.3,
      score: evidenceQuality,
      rationale: `${evidenceList.filter((e) => e.isSignatureValid).length}/${evidenceList.length} evidence artifacts with valid signatures`,
    });

    // Factor 3: Verification Completeness (25% weight)
    const verificationCompleteness = this.calculateVerificationCompleteness(
      specsList,
      evidenceList,
    );
    factors.push({
      factor: 'Verification Completeness',
      weight: 0.25,
      score: verificationCompleteness,
      rationale: `${evidenceList.length} evidence artifacts for ${specsList.length} specifications`,
    });

    // Factor 4: Traceability Integrity (15% weight)
    const traceabilityIntegrity = this.calculateTraceabilityIntegrity(
      requirementsList,
      userStoriesList,
      specsList,
    );
    factors.push({
      factor: 'Traceability Integrity',
      weight: 0.15,
      score: traceabilityIntegrity,
      rationale: 'REQ → User Story → Spec traceability chain validated',
    });

    // Calculate weighted risk score
    const riskScore = factors.reduce(
      (sum, factor) => sum + factor.score * factor.weight,
      0,
    );

    // Determine overall risk level
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 80) {
      overallRisk = 'LOW';
    } else if (riskScore >= 60) {
      overallRisk = 'MEDIUM';
    } else if (riskScore >= 40) {
      overallRisk = 'HIGH';
    } else {
      overallRisk = 'CRITICAL';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      factors,
      requirementsList,
      specsList,
      evidenceList,
    );

    return {
      repositoryId,
      overallRisk,
      riskScore: Math.round(riskScore),
      riskLevel: `${overallRisk} (Score: ${Math.round(riskScore)}/100)`,
      breakdown: {
        requirementsCoverage: Math.round(requirementsCoverage),
        evidenceQuality: Math.round(evidenceQuality),
        verificationCompleteness: Math.round(verificationCompleteness),
        traceabilityIntegrity: Math.round(traceabilityIntegrity),
      },
      factors,
      recommendations,
      assessedAt: new Date(),
    };
  }

  /**
   * Calculate requirements coverage score (0-100)
   *
   * Traverses proper ROSIE traceability chain: REQ → User Story → Spec
   * A requirement is considered covered if it has at least one user story,
   * and that user story has at least one spec.
   */
  private calculateRequirementsCoverage(
    requirementsList: any[],
    userStoriesList: any[],
    specsList: any[],
  ): number {
    if (requirementsList.length === 0) return 0;

    let coveredCount = 0;

    for (const req of requirementsList) {
      // Step 1: Find user stories for this requirement
      const userStoriesForReq = userStoriesList.filter(
        (us) => us.parentId === req.gxpId,
      );

      if (userStoriesForReq.length === 0) {
        // No user stories for this requirement → not covered
        continue;
      }

      // Step 2: Find specs for those user stories
      const specsForReq = specsList.filter((spec) =>
        userStoriesForReq.some((us) => us.gxpId === spec.parentId),
      );

      if (specsForReq.length > 0) {
        // Requirement has full chain: REQ → US → Spec
        coveredCount++;
      }
    }

    return (coveredCount / requirementsList.length) * 100;
  }

  /**
   * Calculate evidence quality score (0-100)
   */
  private calculateEvidenceQuality(evidenceList: any[]): number {
    if (evidenceList.length === 0) return 0;

    const validSignatures = evidenceList.filter(
      (e) => e.isSignatureValid === true,
    ).length;

    // Base score on signature validity
    const signatureScore = (validSignatures / evidenceList.length) * 100;

    return signatureScore;
  }

  /**
   * Calculate verification completeness score (0-100)
   */
  private calculateVerificationCompleteness(
    specsList: any[],
    evidenceList: any[],
  ): number {
    if (specsList.length === 0) return 100; // No specs to verify

    // Count specs with evidence
    const specsWithEvidence = new Set(
      evidenceList.map((e) => e.gxpId).filter(Boolean),
    );

    const verifiedCount = specsList.filter((s) =>
      specsWithEvidence.has(s.gxpId),
    ).length;

    return (verifiedCount / specsList.length) * 100;
  }

  /**
   * Calculate traceability integrity score (0-100)
   *
   * Validates the full ROSIE traceability chain: REQ → User Story → Spec
   *
   * Integrity checks:
   * 1. All user stories must reference valid requirement GxP IDs
   * 2. All specs must reference valid user story GxP IDs
   * 3. All specs must have a complete chain back to a requirement
   */
  private calculateTraceabilityIntegrity(
    requirementsList: any[],
    userStoriesList: any[],
    specsList: any[],
  ): number {
    // If no artifacts, consider integrity perfect (nothing to break)
    if (userStoriesList.length === 0 && specsList.length === 0) return 100;

    let brokenLinks = 0;
    let totalLinks = 0;

    // Valid GxP ID sets for quick lookup
    const validReqIds = new Set(requirementsList.map((r) => r.gxpId));
    const validUserStoryIds = new Set(userStoriesList.map((us) => us.gxpId));

    // Check 1: Validate user story → requirement links
    for (const us of userStoriesList) {
      totalLinks++;
      if (us.parentId && !validReqIds.has(us.parentId)) {
        brokenLinks++;
        this.logger.warn(
          `Broken link: User Story ${us.gxpId} references non-existent requirement ${us.parentId}`,
        );
      } else if (!us.parentId) {
        brokenLinks++;
        this.logger.warn(
          `Broken link: User Story ${us.gxpId} has no parent requirement`,
        );
      }
    }

    // Check 2: Validate spec → user story links
    for (const spec of specsList) {
      totalLinks++;
      if (spec.parentId && !validUserStoryIds.has(spec.parentId)) {
        brokenLinks++;
        this.logger.warn(
          `Broken link: Spec ${spec.gxpId} references non-existent user story ${spec.parentId}`,
        );
      } else if (!spec.parentId) {
        brokenLinks++;
        this.logger.warn(
          `Broken link: Spec ${spec.gxpId} has no parent user story`,
        );
      }
    }

    // If no links to validate, return 100%
    if (totalLinks === 0) return 100;

    // Return percentage of valid links
    const validLinks = totalLinks - brokenLinks;
    return (validLinks / totalLinks) * 100;
  }

  /**
   * Generate actionable recommendations based on risk factors
   */
  private generateRecommendations(
    factors: RiskFactor[],
    requirementsList: any[],
    specsList: any[],
    evidenceList: any[],
  ): string[] {
    const recommendations: string[] = [];

    // Check each factor for low scores
    factors.forEach((factor) => {
      if (factor.score < 60) {
        switch (factor.factor) {
          case 'Requirements Coverage':
            recommendations.push(
              `Create specifications for uncovered requirements (${Math.round(100 - factor.score)}% gap)`,
            );
            break;
          case 'Evidence Quality':
            recommendations.push(
              'Improve test evidence quality by ensuring all JWS artifacts are properly signed',
            );
            break;
          case 'Verification Completeness':
            recommendations.push(
              `Generate test evidence for ${specsList.length - evidenceList.length} unverified specifications`,
            );
            break;
          case 'Traceability Integrity':
            recommendations.push(
              'Fix broken traceability links between requirements and specifications',
            );
            break;
        }
      }
    });

    // High-risk requirements specific recommendations
    const highRiskReqs = requirementsList.filter(
      (r) => r.gxpRiskRating === 'HIGH',
    );
    if (highRiskReqs.length > 0) {
      recommendations.push(
        `Prioritize verification for ${highRiskReqs.length} HIGH-risk requirements`,
      );
    }

    // Evidence gap recommendations
    if (evidenceList.length === 0) {
      recommendations.push(
        'CRITICAL: No test evidence found. Implement automated testing with JWS evidence generation',
      );
    }

    return recommendations.length > 0
      ? recommendations
      : ['System meets all compliance thresholds'];
  }
}
