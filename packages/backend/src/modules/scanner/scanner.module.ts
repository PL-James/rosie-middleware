import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';
import { GitHubModule } from '../github/github.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { TraceabilityModule } from '../traceability/traceability.module';

@Module({
  imports: [
    GitHubModule,
    ArtifactsModule,
    RepositoriesModule,
    TraceabilityModule,
  ],
  providers: [ScannerService],
  controllers: [ScannerController],
  exports: [ScannerService],
})
export class ScannerModule {}
