import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true, // Make cache available globally
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Check if Redis is configured (via REDIS_URL or individual variables)
        const redisUrl = configService.get('REDIS_URL');
        const redisHost = configService.get('REDIS_HOST');

        // If Redis is not configured, use in-memory cache as fallback
        if (!redisUrl && !redisHost) {
          console.warn(
            '⚠️  Redis not configured (REDIS_URL or REDIS_HOST not set) - using in-memory cache',
          );
          console.warn('   For production, set REDIS_URL environment variable');
          return {
            ttl: 300000, // 5 minutes default in milliseconds
            max: 100, // Max 100 items in memory
          };
        }

        // Build Redis connection URL
        let connectionUrl: string;
        if (redisUrl) {
          connectionUrl = redisUrl;
          console.log(`✅ Connecting to Redis via REDIS_URL for caching`);
        } else {
          const redisPort = configService.get('REDIS_PORT', 6379);
          const redisPassword = configService.get('REDIS_PASSWORD');
          connectionUrl = redisPassword
            ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
            : `redis://${redisHost}:${redisPort}`;
          console.log(`✅ Connecting to Redis at ${redisHost}:${redisPort} for caching`);
        }

        // Use Keyv with Redis store
        const keyv = new Keyv({
          store: new KeyvRedis(connectionUrl),
          ttl: 300000, // 5 minutes default TTL in milliseconds
        });

        // Handle connection errors
        keyv.on('error', (err) => {
          console.error('Keyv Redis connection error:', err);
        });

        return {
          store: keyv,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppCacheModule {}
