import { Module, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScannerProcessor } from './processors/scanner.processor';
import { ScannerModule } from '@/modules/scanner/scanner.module';
import { WebSocketModule } from '@/websocket/websocket.module';

@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    // Check if Redis is configured via environment variable
    const redisHost = process.env.REDIS_HOST;

    if (!redisHost) {
      console.warn(
        '⚠️  Redis not configured (REDIS_HOST not set) - BullMQ queue disabled. Scans will run synchronously.',
      );
      console.warn(
        '   To enable async scanning with BullMQ, set REDIS_HOST environment variable.',
      );

      // Return minimal module without BullMQ
      return {
        module: QueueModule,
        imports: [ScannerModule, WebSocketModule],
        providers: [],
        exports: [],
      };
    }

    // Redis is configured - enable BullMQ
    console.log(
      `✅ Redis configured at ${redisHost} - BullMQ queue enabled for async scanning`,
    );

    return {
      module: QueueModule,
      imports: [
        // Configure BullMQ with Redis connection
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            connection: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              // Optional: Add password if Redis requires auth
              password: configService.get('REDIS_PASSWORD'),
              // Retry strategy for connection failures
              retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
              },
            },
          }),
          inject: [ConfigService],
        }),
        // Register the scanner queue
        BullModule.registerQueue({
          name: 'scanner',
          defaultJobOptions: {
            attempts: 3, // Retry failed jobs 3 times
            backoff: {
              type: 'exponential',
              delay: 5000, // Start with 5 second delay
            },
            removeOnComplete: {
              age: 3600, // Keep completed jobs for 1 hour
              count: 1000, // Keep max 1000 completed jobs
            },
            removeOnFail: {
              age: 86400, // Keep failed jobs for 24 hours
              count: 5000, // Keep max 5000 failed jobs
            },
          },
        }),
        // Import ScannerModule to access ScannerService
        ScannerModule,
        // Import WebSocketModule to access ScanProgressGateway
        WebSocketModule,
      ],
      providers: [ScannerProcessor],
      exports: [BullModule],
    };
  }
}
