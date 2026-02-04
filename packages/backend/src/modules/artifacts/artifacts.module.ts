import { Module } from '@nestjs/common';
import { ArtifactParserService } from './artifact-parser.service';

@Module({
  providers: [ArtifactParserService],
  exports: [ArtifactParserService],
})
export class ArtifactsModule {}
