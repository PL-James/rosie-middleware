import { Injectable } from '@nestjs/common';
import { db, tagBlocks } from '@/db';
import { eq, asc, sql } from 'drizzle-orm';
import { createPaginatedResponse, PaginatedResponse } from '@/common/pagination.dto';

@Injectable()
export class TagBlocksService {
  async getTagBlocks(
    repositoryId: string,
    page: number = 1,
    limit: number = 100,
  ): Promise<PaginatedResponse<typeof tagBlocks.$inferSelect>> {
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(100, Math.max(1, limit));
    const offset = (validatedPage - 1) * validatedLimit;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tagBlocks)
      .where(eq(tagBlocks.repositoryId, repositoryId));

    const total = countResult?.count || 0;

    const data = await db
      .select()
      .from(tagBlocks)
      .where(eq(tagBlocks.repositoryId, repositoryId))
      .orderBy(asc(tagBlocks.filePath), asc(tagBlocks.gxpId))
      .limit(validatedLimit)
      .offset(offset);

    return createPaginatedResponse(data, total, validatedPage, validatedLimit);
  }
}
