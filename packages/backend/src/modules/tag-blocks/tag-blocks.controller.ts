import { Controller, Get, Param, Query } from '@nestjs/common';
import { TagBlocksService } from './tag-blocks.service';
import { RepositoriesService } from '../repositories/repositories.service';

@Controller('api/v1/repositories/:id')
export class TagBlocksController {
  constructor(
    private readonly tagBlocksService: TagBlocksService,
    private readonly repositoriesService: RepositoriesService,
  ) {}

  @Get('tag-blocks')
  async getTagBlocks(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Validates repository exists (throws 404 if not)
    await this.repositoriesService.findOne(id);

    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 100)) : 100;

    return this.tagBlocksService.getTagBlocks(id, pageNum, limitNum);
  }
}
