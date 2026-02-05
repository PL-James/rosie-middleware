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
        // Check if Redis is configured
        const redisHost = configService.get('REDIS_HOST');
        const redisPort = configService.get('REDIS_PORT');
        const redisPassword = configService.get('REDIS_PASSWORD');

        // If Redis is not configured, use in-memory cache as fallback
        if (!redisHost) {
          console.warn(
            'Redis not configured - using in-memory cache (not recommended for production)',
          );
          return {
            ttl: 300000, // 5 minutes default in milliseconds
            max: 100, // Max 100 items in memory
          };
        }

        // Build Redis connection URL
        const redisUrl = redisPassword
          ? `redis://:${redisPassword}@${redisHost}:${redisPort || 6379}`
          : `redis://${redisHost}:${redisPort || 6379}`;

        console.log(`Connecting to Redis at ${redisHost}:${redisPort || 6379} for caching`);

        // Use Keyv with Redis store
        const keyv = new Keyv({
          store: new KeyvRedis(redisUrl),
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
