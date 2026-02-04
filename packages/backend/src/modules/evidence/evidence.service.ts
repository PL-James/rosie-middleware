import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db, evidence } from '@/db';
import { eq, and } from 'drizzle-orm';
import { JwsVerificationService } from './jws-verification.service';

export interface VerificationStatusSummary {
  totalEvidence: number;
  verifiedCount: number;
  unverifiedCount: number;
  verificationRate: number;
  byTier: {
    IQ: { total: number; verified: number };
    OQ: { total: number; verified: number };
    PQ: { total: number; verified: number };
  };
}

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(private jwsVerificationService: JwsVerificationService) {}

  /**
   * Verify a single evidence artifact
   */
  async verifyEvidence(repositoryId: string, evidenceId: string) {
    this.logger.log(
      `Verifying evidence ${evidenceId} for repository ${repositoryId}`,
    );

    // Get evidence record
    const [evidenceRecord] = await db
      .select()
      .from(evidence)
      .where(
        and(
          eq(evidence.id, evidenceId),
          eq(evidence.repositoryId, repositoryId),
        ),
      );

    if (!evidenceRecord) {
      throw new NotFoundException(
        `Evidence ${evidenceId} not found in repository ${repositoryId}`,
      );
    }

    if (!evidenceRecord.rawContent) {
      throw new Error('Evidence has no raw content to verify');
    }

    // Verify JWS signature
    const verificationResult = await this.jwsVerificationService.verifySignature(
      evidenceRecord.rawContent,
    );

    // Update evidence record with verification result
    const [_updatedEvidence] = await db
      .update(evidence)
      .set({
        isSignatureValid: verificationResult.isValid,
        signatureVerifiedAt: new Date(),
        jwsPayload: verificationResult.payload,
        jwsHeader: verificationResult.header,
      })
      .where(eq(evidence.id, evidenceId))
      .returning();

    this.logger.log(
      `Evidence ${evidenceId} verification ${verificationResult.isValid ? 'succeeded' : 'failed'}`,
    );

    return {
      evidenceId,
      isValid: verificationResult.isValid,
      verifiedAt: new Date(),
      payload: verificationResult.payload,
      error: verificationResult.error,
    };
  }

  /**
   * Batch verify multiple evidence artifacts
   *
   * Uses Promise.allSettled() to ensure all verifications complete even if some fail.
   * This prevents cascading failures where one invalid artifact blocks all others.
   */
  async batchVerifyEvidence(repositoryId: string, evidenceIds: string[]) {
    this.logger.log(
      `Batch verifying ${evidenceIds.length} evidence artifacts for repository ${repositoryId}`,
    );

    // Use Promise.allSettled() instead of Promise.all() for graceful failure handling
    const settledResults = await Promise.allSettled(
      evidenceIds.map((id) => this.verifyEvidence(repositoryId, id)),
    );

    // Transform settled results into verification results
    const results = settledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Log verification failure
        this.logger.error(
          `Evidence verification failed for ${evidenceIds[index]}: ${result.reason?.message}`,
        );

        // Return error result instead of throwing
        return {
          evidenceId: evidenceIds[index],
          isValid: false,
          verifiedAt: new Date(),
          error: result.reason?.message || 'Verification failed',
        };
      }
    });

    const successCount = results.filter((r) => r.isValid).length;
    this.logger.log(
      `Batch verification complete: ${successCount}/${evidenceIds.length} valid`,
    );

    return {
      totalProcessed: evidenceIds.length,
      successCount,
      failureCount: evidenceIds.length - successCount,
      results,
    };
  }

  /**
   * Get verification status summary for a repository
   */
  async getVerificationStatus(
    repositoryId: string,
  ): Promise<VerificationStatusSummary> {
    const evidenceRecords = await db
      .select()
      .from(evidence)
      .where(eq(evidence.repositoryId, repositoryId));

    const totalEvidence = evidenceRecords.length;
    const verifiedCount = evidenceRecords.filter(
      (e) => e.isSignatureValid === true,
    ).length;
    const unverifiedCount = totalEvidence - verifiedCount;

    // Count by verification tier
    const byTier = {
      IQ: { total: 0, verified: 0 },
      OQ: { total: 0, verified: 0 },
      PQ: { total: 0, verified: 0 },
    };

    for (const e of evidenceRecords) {
      if (e.verificationTier) {
        byTier[e.verificationTier].total++;
        if (e.isSignatureValid) {
          byTier[e.verificationTier].verified++;
        }
      }
    }

    return {
      totalEvidence,
      verifiedCount,
      unverifiedCount,
      verificationRate:
        totalEvidence > 0 ? (verifiedCount / totalEvidence) * 100 : 0,
      byTier,
    };
  }

  /**
   * Get verified evidence for a repository (optionally filtered by tier)
   */
  async getVerifiedEvidence(repositoryId: string, tier?: 'IQ' | 'OQ' | 'PQ') {
    const query = db
      .select()
      .from(evidence)
      .where(
        and(
          eq(evidence.repositoryId, repositoryId),
          eq(evidence.isSignatureValid, true),
        ),
      );

    const results = await query;

    // Filter by tier if specified
    if (tier) {
      return results.filter((e) => e.verificationTier === tier);
    }

    return results;
  }

  /**
   * Update verification status for an evidence artifact
   */
  async updateVerificationStatus(
    evidenceId: string,
    result: { isValid: boolean; error?: string },
  ) {
    const [updated] = await db
      .update(evidence)
      .set({
        isSignatureValid: result.isValid,
        signatureVerifiedAt: new Date(),
      })
      .where(eq(evidence.id, evidenceId))
      .returning();

    return updated;
  }

  /**
   * Get all evidence for a repository
   */
  async getAllEvidence(repositoryId: string) {
    return db
      .select()
      .from(evidence)
      .where(eq(evidence.repositoryId, repositoryId));
  }
}
