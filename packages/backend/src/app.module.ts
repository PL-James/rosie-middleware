import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { GitHubModule } from './modules/github/github.module';
import { ArtifactsModule } from './modules/artifacts/artifacts.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { TraceabilityModule } from './modules/traceability/traceability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    HealthModule,
    GitHubModule,
    ArtifactsModule,
    RepositoriesModule,
    ScannerModule,
    TraceabilityModule,
  ],
})
export class AppModule {}
