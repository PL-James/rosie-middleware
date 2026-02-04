import { Module } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { ArtifactsController } from './artifacts.controller';
import { GitHubModule } from '../github/github.module';

@Module({
  imports: [GitHubModule],
  providers: [RepositoriesService],
  controllers: [RepositoriesController, ArtifactsController],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
