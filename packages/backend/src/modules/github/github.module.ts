import { Module } from '@nestjs/common';
import { GitHubApiClient } from './github-api.client';

@Module({
  providers: [GitHubApiClient],
  exports: [GitHubApiClient],
})
export class GitHubModule {}
