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
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      console.warn(
        '⚠️  Redis not configured (REDIS_URL or REDIS_HOST not set) - BullMQ queue disabled. Scans will run synchronously.',
      );
      console.warn(
        '   To enable async scanning with BullMQ, set REDIS_URL environment variable.',
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
      `✅ Redis configured ${redisUrl ? 'via REDIS_URL' : `at ${redisHost}`} - BullMQ queue enabled for async scanning`,
    );

    return {
      module: QueueModule,
      imports: [
        // Configure BullMQ with Redis connection
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const url = configService.get('REDIS_URL');

            // If REDIS_URL is provided, use it directly
            if (url) {
              // Parse redis://[:password@]host[:port][/db-number]
              const redisUrlObj = new URL(url);
              return {
                connection: {
                  host: redisUrlObj.hostname,
                  port: parseInt(redisUrlObj.port || '6379', 10),
                  password: redisUrlObj.password || undefined,
                  db: redisUrlObj.pathname ? parseInt(redisUrlObj.pathname.slice(1), 10) : 0,
                  retryStrategy: (times: number) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                  },
                },
              };
            }

            // Fallback to individual REDIS_HOST/PORT/PASSWORD variables
            return {
              connection: {
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD'),
                retryStrategy: (times: number) => {
                  const delay = Math.min(times * 50, 2000);
                  return delay;
                },
              },
            };
          },
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
