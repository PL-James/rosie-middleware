---
gxp_id: SPEC-INF-003
title: "Application Bootstrap"
parent_id: US-002-001
verification_tier: IQ
design_approach: |
  Bootstrap NestJS application with module configuration, dependency injection,
  environment variable validation, and GitHub API authentication. Application
  must fail-fast on startup if required configuration is missing.
source_files:
  - packages/backend/src/main.ts
  - packages/backend/src/app.module.ts
test_files: []
validation_status: DRAFT
assurance_status: DRAFT
---

## Installation Qualification (IQ)

This specification defines application startup and configuration. IQ verification ensures the application initializes correctly with valid configuration.

## Bootstrap Sequence

**main.ts:**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application running on http://localhost:${port}`);
}

bootstrap();
```

## Module Configuration

**app.module.ts:**
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const required = ['DATABASE_URL', 'GITHUB_TOKEN'];
        for (const key of required) {
          if (!config[key]) {
            throw new Error(`Missing required env var: ${key}`);
          }
        }
        return config;
      },
    }),
    DatabaseModule,
    RepositoriesModule,
    GitHubModule,
    ArtifactsModule,
    ScannerModule,
    HealthModule,
  ],
})
export class AppModule {}
```

## Environment Variables

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_TOKEN`: GitHub PAT for API access

**Optional:**
- `PORT`: Server port (default: 3000)
- `FRONTEND_URL`: CORS origin (default: http://localhost:5173)
- `NODE_ENV`: Environment (development, production)
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)

## Startup Validation

1. **Config Validation**: Verify all required env vars present
2. **Database Connection**: Verify PostgreSQL connection successful
3. **GitHub Authentication**: Verify GitHub token valid
4. **Module Initialization**: Verify all modules load without errors

## Error Handling

**Missing Configuration:**
```
Error: Missing required env var: GITHUB_TOKEN
    at AppModule.validate (app.module.ts:12:15)
Process exited with code 1
```

**Invalid Database URL:**
```
Error: Connection to PostgreSQL failed: ECONNREFUSED
    at DatabaseModule.onModuleInit (database.module.ts:15:12)
Process exited with code 1
```

## Verification Method

**Installation Qualification (IQ):**

1. **Valid Configuration:**
   - Set all required env vars
   - Start application
   - Verify HTTP server listening on port 3000
   - Verify logs show "Application running..."

2. **Missing Configuration:**
   - Remove GITHUB_TOKEN env var
   - Start application
   - Verify error thrown
   - Verify process exits with code 1

3. **Invalid Database:**
   - Set invalid DATABASE_URL
   - Start application
   - Verify connection error logged
   - Verify process exits

4. **Module Loading:**
   - Verify all 6 modules initialized
   - Check logs for module registration messages

## Implementation Files

- `packages/backend/src/main.ts`: Application entry point
- `packages/backend/src/app.module.ts`: Root module configuration
