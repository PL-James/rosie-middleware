import { Module } from '@nestjs/common';
import { TagBlocksService } from './tag-blocks.service';
import { TagBlocksController } from './tag-blocks.controller';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  providers: [TagBlocksService],
  controllers: [TagBlocksController],
  exports: [TagBlocksService],
})
export class TagBlocksModule {}
