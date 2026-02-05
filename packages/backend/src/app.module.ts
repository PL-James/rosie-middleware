import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HealthModule } from './modules/health/health.module';
import { GitHubModule } from './modules/github/github.module';
import { ArtifactsModule } from './modules/artifacts/artifacts.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { TraceabilityModule } from './modules/traceability/traceability.module';
import { ManufacturersModule } from './modules/manufacturers/manufacturers.module';
import { ProductsModule } from './modules/products/products.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AuthModule } from './modules/auth/auth.module';
import { QueueModule } from './queue/queue.module';
import { AppCacheModule } from './cache/cache.module';
import { WebSocketModule } from './websocket/websocket.module';

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
    // Serve frontend static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../..', 'frontend', 'dist'),
      exclude: ['/api*'],
      serveRoot: '/',
    }),
    HealthModule,
    AuthModule,
    QueueModule.forRoot(), // Conditionally enables BullMQ if Redis is configured
    AppCacheModule,
    WebSocketModule,
    GitHubModule,
    ArtifactsModule,
    RepositoriesModule,
    ScannerModule,
    TraceabilityModule,
    EvidenceModule,
    ComplianceModule,
    ManufacturersModule,
    ProductsModule,
  ],
})
export class AppModule {}
