import { Injectable, Logger } from '@nestjs/common';
import {
  db,
  requirements,
  userStories,
  specs,
  evidence,
  traceabilityLinks,
} from '@/db';
import { eq, and } from 'drizzle-orm';

export interface BrokenLink {
  sourceId: string;
  targetId: string;
  linkType: string;
  reason: string;
}

export interface TraceabilityChain {
  documentId: string;
  upstream: string[];
  downstream: string[];
}

@Injectable()
export class TraceabilityValidatorService {
  private readonly logger = new Logger(TraceabilityValidatorService.name);

  /**
   * Build traceability links for a repository
   * Creates entries in traceability_links table
   */
  async buildTraceabilityGraph(repositoryId: string): Promise<void> {
    this.logger.log(`Building traceability graph for repository ${repositoryId}`);

    // 1. Get all user stories and link to requirements
    const stories = await db
      .select()
      .from(userStories)
      .where(eq(userStories.repositoryId, repositoryId));

    for (const story of stories) {
      if (story.parentId) {
        // Find the requirement by gxpId
        const [requirement] = await db
          .select()
          .from(requirements)
          .where(
            and(
              eq(requirements.repositoryId, repositoryId),
              eq(requirements.gxpId, story.parentId),
            ),
          )
          .limit(1);

        const isValid = !!requirement;

        // Insert traceability link
        await db
          .insert(traceabilityLinks)
          .values({
            repositoryId,
            parentId: requirement?.id || story.parentId,
            parentGxpId: story.parentId,
            parentType: 'requirement',
            childId: story.id,
            childGxpId: story.gxpId,
            childType: 'user_story',
            isValid,
            validationMessage: isValid
              ? null
              : `Parent requirement ${story.parentId} not found`,
          })
          .onConflictDoNothing();
      }
    }

    // 2. Get all specs and link to user stories
    const allSpecs = await db
      .select()
      .from(specs)
      .where(eq(specs.repositoryId, repositoryId));

    for (const spec of allSpecs) {
      if (spec.parentId) {
        // Find the user story by gxpId
        const [userStory] = await db
          .select()
          .from(userStories)
          .where(
            and(
              eq(userStories.repositoryId, repositoryId),
              eq(userStories.gxpId, spec.parentId),
            ),
          )
          .limit(1);

        const isValid = !!userStory;

        // Insert traceability link
        await db
          .insert(traceabilityLinks)
          .values({
            repositoryId,
            parentId: userStory?.id || spec.parentId,
            parentGxpId: spec.parentId,
            parentType: 'user_story',
            childId: spec.id,
            childGxpId: spec.gxpId,
            childType: 'spec',
            isValid,
            validationMessage: isValid
              ? null
              : `Parent user story ${spec.parentId} not found`,
          })
          .onConflictDoNothing();
      }
    }

    // 3. Get all evidence and link to specs
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(eq(evidence.repositoryId, repositoryId));

    for (const ev of evidenceList) {
      if (ev.gxpId) {
        // Find the spec by gxpId
        const [spec] = await db
          .select()
          .from(specs)
          .where(
            and(
              eq(specs.repositoryId, repositoryId),
              eq(specs.gxpId, ev.gxpId),
            ),
          )
          .limit(1);

        const isValid = !!spec;

        // Insert traceability link
        await db
          .insert(traceabilityLinks)
          .values({
            repositoryId,
            parentId: spec?.id || ev.gxpId,
            parentGxpId: ev.gxpId,
            parentType: 'spec',
            childId: ev.id,
            childGxpId: ev.fileName,
            childType: 'evidence',
            isValid,
            validationMessage: isValid
              ? null
              : `Parent spec ${ev.gxpId} not found`,
          })
          .onConflictDoNothing();
      }
    }

    this.logger.log(
      `Traceability graph built: ${stories.length} user stories, ${allSpecs.length} specs, ${evidenceList.length} evidence`,
    );
  }

  /**
   * Detect broken links (orphan artifacts)
   */
  async detectBrokenLinks(repositoryId: string): Promise<BrokenLink[]> {
    const brokenLinks = await db
      .select()
      .from(traceabilityLinks)
      .where(
        and(
          eq(traceabilityLinks.repositoryId, repositoryId),
          eq(traceabilityLinks.isValid, false),
        ),
      );

    return brokenLinks.map((link) => ({
      sourceId: link.parentGxpId,
      targetId: link.childGxpId,
      linkType: `${link.parentType}_to_${link.childType}`,
      reason: link.validationMessage || `Parent artifact ${link.parentGxpId} not found`,
    }));
  }

  /**
   * Get full traceability chain for a document
   */
  async getTraceabilityChain(
    repositoryId: string,
    documentId: string,
  ): Promise<TraceabilityChain> {
    const upstream = await this.getUpstreamLinks(repositoryId, documentId);
    const downstream = await this.getDownstreamLinks(repositoryId, documentId);

    return {
      documentId,
      upstream,
      downstream,
    };
  }

  /**
   * Get upstream links (parents) recursively
   */
  private async getUpstreamLinks(
    repositoryId: string,
    documentId: string,
  ): Promise<string[]> {
    const links = await db
      .select()
      .from(traceabilityLinks)
      .where(
        and(
          eq(traceabilityLinks.repositoryId, repositoryId),
          eq(traceabilityLinks.childGxpId, documentId),
        ),
      );

    const upstream: string[] = [];
    for (const link of links) {
      upstream.push(link.parentGxpId);
      // Recursively get upstream
      const parentUpstream = await this.getUpstreamLinks(
        repositoryId,
        link.parentGxpId,
      );
      upstream.push(...parentUpstream);
    }

    return [...new Set(upstream)]; // Deduplicate
  }

  /**
   * Get downstream links (children) recursively
   */
  private async getDownstreamLinks(
    repositoryId: string,
    documentId: string,
  ): Promise<string[]> {
    const links = await db
      .select()
      .from(traceabilityLinks)
      .where(
        and(
          eq(traceabilityLinks.repositoryId, repositoryId),
          eq(traceabilityLinks.parentGxpId, documentId),
        ),
      );

    const downstream: string[] = [];
    for (const link of links) {
      downstream.push(link.childGxpId);
      // Recursively get downstream
      const childDownstream = await this.getDownstreamLinks(
        repositoryId,
        link.childGxpId,
      );
      downstream.push(...childDownstream);
    }

    return [...new Set(downstream)]; // Deduplicate
  }
}
