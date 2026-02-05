import { Controller, Get, Param, Query, NotFoundException, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  db,
  systemContexts,
  requirements,
  userStories,
  specs,
  evidence,
} from '@/db';
import { eq, and, desc, count } from 'drizzle-orm';
import { PaginationDto, createPaginatedResponse } from '@/common/pagination.dto';

@Controller('api/v1/repositories/:id')
@UseInterceptors(CacheInterceptor)
export class ArtifactsController {
  /**
   * Get system context (apex document)
   */
  @Get('system-context')
  @CacheTTL(600000) // Cache for 10 minutes
  async getSystemContext(@Param('id') repositoryId: string) {
    const [context] = await db
      .select()
      .from(systemContexts)
      .where(eq(systemContexts.repositoryId, repositoryId))
      .orderBy(desc(systemContexts.createdAt))
      .limit(1);

    if (!context) {
      throw new NotFoundException('System context not found');
    }

    return context;
  }

  /**
   * Get all requirements (with pagination)
   */
  @Get('requirements')
  @CacheTTL(300000) // Cache for 5 minutes
  async getRequirements(
    @Param('id') repositoryId: string,
    @Query() pagination: PaginationDto,
    @Query('risk_rating') riskRating?: string,
  ) {
    const conditions = [eq(requirements.repositoryId, repositoryId)];

    if (riskRating) {
      conditions.push(eq(requirements.gxpRiskRating, riskRating as any));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(requirements)
      .where(and(...conditions));

    // Get paginated data
    const data = await db
      .select()
      .from(requirements)
      .where(and(...conditions))
      .orderBy(requirements.gxpId)
      .limit(pagination.limit)
      .offset(pagination.skip);

    return createPaginatedResponse(data, total, pagination.page, pagination.limit);
  }

  /**
   * Get requirement by GXP ID
   */
  @Get('requirements/:gxpId')
  async getRequirement(
    @Param('id') repositoryId: string,
    @Param('gxpId') gxpId: string,
  ) {
    const [requirement] = await db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.repositoryId, repositoryId),
          eq(requirements.gxpId, gxpId),
        ),
      );

    if (!requirement) {
      throw new NotFoundException(`Requirement ${gxpId} not found`);
    }

    return requirement;
  }

  /**
   * Get all user stories (with pagination)
   */
  @Get('user-stories')
  async getUserStories(
    @Param('id') repositoryId: string,
    @Query() pagination: PaginationDto,
    @Query('parent_id') parentId?: string,
  ) {
    const conditions = [eq(userStories.repositoryId, repositoryId)];

    if (parentId) {
      conditions.push(eq(userStories.parentId, parentId));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(userStories)
      .where(and(...conditions));

    // Get paginated data
    const data = await db
      .select()
      .from(userStories)
      .where(and(...conditions))
      .orderBy(userStories.gxpId)
      .limit(pagination.limit)
      .offset(pagination.skip);

    return createPaginatedResponse(data, total, pagination.page, pagination.limit);
  }

  /**
   * Get user story by GXP ID
   */
  @Get('user-stories/:gxpId')
  async getUserStory(
    @Param('id') repositoryId: string,
    @Param('gxpId') gxpId: string,
  ) {
    const [userStory] = await db
      .select()
      .from(userStories)
      .where(
        and(
          eq(userStories.repositoryId, repositoryId),
          eq(userStories.gxpId, gxpId),
        ),
      );

    if (!userStory) {
      throw new NotFoundException(`User story ${gxpId} not found`);
    }

    return userStory;
  }

  /**
   * Get all specs (with pagination)
   */
  @Get('specs')
  async getSpecs(
    @Param('id') repositoryId: string,
    @Query() pagination: PaginationDto,
    @Query('parent_id') parentId?: string,
    @Query('tier') tier?: string,
  ) {
    const conditions = [eq(specs.repositoryId, repositoryId)];

    if (parentId) {
      conditions.push(eq(specs.parentId, parentId));
    }

    if (tier) {
      conditions.push(eq(specs.verificationTier, tier as any));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(specs)
      .where(and(...conditions));

    // Get paginated data
    const data = await db
      .select()
      .from(specs)
      .where(and(...conditions))
      .orderBy(specs.gxpId)
      .limit(pagination.limit)
      .offset(pagination.skip);

    return createPaginatedResponse(data, total, pagination.page, pagination.limit);
  }

  /**
   * Get spec by GXP ID
   */
  @Get('specs/:gxpId')
  async getSpec(
    @Param('id') repositoryId: string,
    @Param('gxpId') gxpId: string,
  ) {
    const [spec] = await db
      .select()
      .from(specs)
      .where(
        and(eq(specs.repositoryId, repositoryId), eq(specs.gxpId, gxpId)),
      );

    if (!spec) {
      throw new NotFoundException(`Spec ${gxpId} not found`);
    }

    return spec;
  }

  /**
   * Get all evidence (with pagination)
   */
  @Get('evidence')
  async getEvidence(
    @Param('id') repositoryId: string,
    @Query() pagination: PaginationDto,
    @Query('tier') tier?: string,
  ) {
    const conditions = [eq(evidence.repositoryId, repositoryId)];

    if (tier) {
      conditions.push(eq(evidence.verificationTier, tier as any));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(evidence)
      .where(and(...conditions));

    // Get paginated data
    const data = await db
      .select()
      .from(evidence)
      .where(and(...conditions))
      .orderBy(evidence.createdAt)
      .limit(pagination.limit)
      .offset(pagination.skip);

    return createPaginatedResponse(data, total, pagination.page, pagination.limit);
  }

  /**
   * Get evidence by ID
   */
  @Get('evidence/:evidenceId')
  async getEvidenceById(
    @Param('id') repositoryId: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    const [evidenceRecord] = await db
      .select()
      .from(evidence)
      .where(
        and(
          eq(evidence.repositoryId, repositoryId),
          eq(evidence.id, evidenceId),
        ),
      );

    if (!evidenceRecord) {
      throw new NotFoundException(`Evidence ${evidenceId} not found`);
    }

    return evidenceRecord;
  }
}
