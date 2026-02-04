# ROSIE Middleware - Railway Deployment Guide

## Railway Architecture Requirements

### Required Services

You'll need **3 Railway services** for a complete deployment:

```
Railway Project: rosie-middleware
├── 1. PostgreSQL Database
├── 2. Backend API (NestJS)
└── 3. Frontend (React + Vite)
```

---

## 1. PostgreSQL Database

### Service Configuration

**Service Name:** `rosie-db`

**Railway Template:** PostgreSQL 16

**Settings:**
```yaml
Database: rosie_production
User: (auto-generated)
Password: (auto-generated)
Port: 5432
```

**Environment Variables (Auto-Generated):**
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
PGHOST=containers-us-west-xxx.railway.app
PGPORT=5432
PGUSER=postgres
PGPASSWORD=xxxxx
PGDATABASE=railway
```

**Volume:**
- ✅ **Persistent Volume:** Enabled (auto-configured)
- Path: `/var/lib/postgresql/data`
- Size: 1GB (free tier) or adjust as needed

**Backup Strategy:**
- Railway automatic backups (paid plans)
- Manual pg_dump weekly: `pg_dump $DATABASE_URL > backup.sql`

---

## 2. Backend API (NestJS)

### Service Configuration

**Service Name:** `rosie-backend`

**Source:** GitHub repository
- Repo: `yourusername/rosie-middleware`
- Branch: `main`
- Root Directory: `packages/backend`

**Build Settings:**
```yaml
Build Command: npm install && npm run build
Start Command: npm run start:prod
```

**Environment Variables:**
```bash
# Database (from PostgreSQL service)
DATABASE_URL=${{rosie-db.DATABASE_URL}}

# Application
NODE_ENV=production
PORT=3000

# GitHub Integration (Phase 1-2)
GITHUB_TOKEN=ghp_your_personal_access_token

# CORS (Frontend URL)
CORS_ORIGIN=https://rosie-frontend.up.railway.app

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info

# JWS Verification (Phase 3)
JWS_KEYSTORE_PATH=/app/keys
# Or inline keys:
JWS_PUBLIC_KEY_1=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# File Storage (for PDF exports)
STORAGE_TYPE=s3  # or 'local' for testing
AWS_S3_BUCKET=rosie-compliance-reports
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

**Health Check:**
```
Endpoint: /api/v1/health
Expected: 200 OK
```

**Networking:**
```yaml
Public Domain: rosie-backend-production.up.railway.app
Internal URL: rosie-backend.railway.internal:3000
```

**Resources (Adjust based on load):**
```yaml
CPU: 1 vCPU (free tier) or 2+ vCPUs (paid)
Memory: 512MB (free tier) or 1-2GB (paid)
```

---

## 3. Frontend (React + Vite)

### Service Configuration

**Service Name:** `rosie-frontend`

**Source:** GitHub repository
- Repo: `yourusername/rosie-middleware`
- Branch: `main`
- Root Directory: `packages/frontend`

**Build Settings:**
```yaml
Build Command: npm install && npm run build
Start Command: npm run preview
# Or use static hosting (see Static Deployment below)
```

**Environment Variables:**
```bash
# API URL (Backend service)
VITE_API_BASE_URL=https://rosie-backend-production.up.railway.app/api/v1

# Or use Railway's internal URL for lower latency
VITE_API_BASE_URL=${{rosie-backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1
```

**Static Hosting Option (Recommended):**
```yaml
# Use Railway's Nixpacks static server
nixpacks:
  phases:
    build:
      nixPkgs:
        - nodejs_18
      cmds:
        - npm install
        - npm run build
    start:
      cmd: npx serve -s dist -l $PORT
```

**Alternative: Use Cloudflare Pages**
```yaml
# Deploy frontend to Cloudflare Pages (better for static sites)
Build command: npm run build
Publish directory: dist
Environment: VITE_API_BASE_URL=https://rosie-backend-production.up.railway.app/api/v1
```

**Networking:**
```yaml
Public Domain: rosie-frontend.up.railway.app
```

---

## Railway Project Setup (Step-by-Step)

### Step 1: Create Railway Project

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init
# Project name: rosie-middleware

# Link to GitHub repo
railway link
```

### Step 2: Add PostgreSQL Service

**Via Railway Dashboard:**
1. Click "+ New Service"
2. Select "Database" → "PostgreSQL"
3. Name: `rosie-db`
4. Click "Add PostgreSQL"
5. ✅ Database provisioned with auto-generated credentials

**Via CLI:**
```bash
railway add --database postgres
```

### Step 3: Deploy Backend

**Via Railway Dashboard:**
1. Click "+ New Service"
2. Select "GitHub Repo"
3. Select `yourusername/rosie-middleware`
4. Set Root Directory: `packages/backend`
5. Add environment variables (see Backend section above)
6. Deploy

**Via CLI:**
```bash
# From project root
cd packages/backend
railway up

# Set environment variables
railway variables set DATABASE_URL=${{rosie-db.DATABASE_URL}}
railway variables set NODE_ENV=production
railway variables set GITHUB_TOKEN=ghp_xxxxx
railway variables set CORS_ORIGIN=https://rosie-frontend.up.railway.app
```

### Step 4: Run Database Migrations

**Option A: Railway CLI**
```bash
railway run npm run db:migrate
```

**Option B: One-off Script**
```bash
# Add to package.json scripts:
"railway:migrate": "railway run --service=rosie-backend npm run db:migrate"

# Run migration
npm run railway:migrate
```

**Option C: Automatic Migration on Deploy**
```yaml
# Add to railway.toml
[deploy]
startCommand = "npm run db:migrate && npm run start:prod"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Step 5: Deploy Frontend

**Via Railway Dashboard:**
1. Click "+ New Service"
2. Select "GitHub Repo"
3. Select `yourusername/rosie-middleware`
4. Set Root Directory: `packages/frontend`
5. Add environment variables:
   ```
   VITE_API_BASE_URL=https://rosie-backend-production.up.railway.app/api/v1
   ```
6. Deploy

**Via CLI:**
```bash
cd packages/frontend
railway up

railway variables set VITE_API_BASE_URL=https://rosie-backend-production.up.railway.app/api/v1
```

---

## Railway Configuration File

Create `railway.toml` in project root:

```toml
# Backend Service
[[services]]
name = "rosie-backend"
source = "packages/backend"

[services.build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[services.deploy]
startCommand = "npm run db:migrate && npm run start:prod"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 10

[services.networking]
serviceName = "rosie-backend"

# Frontend Service
[[services]]
name = "rosie-frontend"
source = "packages/frontend"

[services.build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[services.deploy]
startCommand = "npx serve -s dist -l $PORT"
restartPolicyType = "ON_FAILURE"

[services.networking]
serviceName = "rosie-frontend"
```

---

## Database Migrations Strategy

### Automatic Migrations (Recommended for Dev/Staging)

```typescript
// packages/backend/src/main.ts
import { runMigrations } from './db/migrate';

async function bootstrap() {
  // Run migrations on startup
  if (process.env.NODE_ENV !== 'production') {
    await runMigrations();
  }

  // Start application
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3000);
}
```

### Manual Migrations (Recommended for Production)

```bash
# Deploy new code WITHOUT migrations
railway up

# Run migrations separately
railway run npm run db:migrate

# Verify health
curl https://rosie-backend-production.up.railway.app/api/v1/health
```

---

## Environment-Specific Configurations

### Development
```bash
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/rosie_dev
LOG_LEVEL=debug
```

### Staging
```bash
NODE_ENV=staging
DATABASE_URL=${{rosie-db-staging.DATABASE_URL}}
LOG_LEVEL=info
```

### Production
```bash
NODE_ENV=production
DATABASE_URL=${{rosie-db.DATABASE_URL}}
LOG_LEVEL=warn
```

---

## Monitoring & Logging

### Railway Built-in Monitoring

**Metrics Available:**
- CPU usage
- Memory usage
- Network traffic
- Request count
- Response times

**Access Logs:**
```bash
# View live logs
railway logs

# View logs for specific service
railway logs --service=rosie-backend

# Follow logs
railway logs --follow
```

### External Monitoring (Recommended)

**Option 1: Sentry (Error Tracking)**
```typescript
// packages/backend/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**Option 2: Datadog (Full Observability)**
```bash
# Add environment variables
railway variables set DD_API_KEY=your_datadog_key
railway variables set DD_SITE=datadoghq.com
```

**Option 3: LogTail (Railway Integration)**
```bash
# Install LogTail integration from Railway marketplace
# Automatically forwards all logs
```

---

## Scaling Strategy

### Vertical Scaling (Single Instance)
```yaml
# Upgrade Railway plan for more resources
Hobby Plan:
  - 1 vCPU
  - 512MB RAM
  - $5/month

Pro Plan:
  - 8 vCPU
  - 8GB RAM
  - $20/month
```

### Horizontal Scaling (Multiple Instances)
```bash
# Railway supports replicas
railway service scale --replicas=3 rosie-backend

# Load balancer automatically configured
```

---

## Cost Estimation

### Free Tier (Hobby Development)
```
PostgreSQL: Free (500MB storage)
Backend: Free ($5 credit/month)
Frontend: Free (or use Cloudflare Pages)
Total: $0/month (within limits)
```

### Production Deployment
```
PostgreSQL: $10/month (2GB storage + backups)
Backend: $15/month (2 vCPU, 2GB RAM)
Frontend: $5/month (static hosting) OR Free (Cloudflare Pages)
Total: $25-30/month
```

### High-Traffic Production
```
PostgreSQL: $50/month (20GB + replicas)
Backend (3 replicas): $45/month (6 vCPU, 6GB RAM total)
Frontend: Free (Cloudflare Pages)
Redis Cache: $10/month (optional)
Total: $105/month
```

---

## Security Checklist

### Railway Security
- ✅ Enable 2FA on Railway account
- ✅ Use Railway's private networking for service communication
- ✅ Rotate database passwords quarterly
- ✅ Use Railway secrets for sensitive env vars
- ✅ Enable IP whitelisting (Enterprise plan)

### Application Security
- ⚠️ Implement authentication (JWT tokens)
- ⚠️ Configure CORS properly
- ⚠️ Enable HTTPS (Railway provides SSL certs)
- ⚠️ Rate limit API endpoints (already configured)
- ⚠️ Validate all inputs with DTOs (already implemented)
- ⚠️ Configure JWS keystore for evidence verification

---

## Backup & Disaster Recovery

### Database Backups

**Automated (Railway Pro):**
```
- Daily backups (7-day retention)
- Point-in-time recovery
```

**Manual Backups:**
```bash
# Weekly backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
railway run --service=rosie-db pg_dump $DATABASE_URL > backup_$TIMESTAMP.sql

# Upload to S3
aws s3 cp backup_$TIMESTAMP.sql s3://rosie-backups/
```

### Application Rollback

```bash
# Rollback to previous deployment
railway rollback

# Deploy specific commit
railway up --sha=abc123
```

---

## CI/CD Integration

### GitHub Actions + Railway

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Railway CLI
        run: npm i -g @railway/cli

      - name: Deploy Backend
        run: railway up --service=rosie-backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Run Migrations
        run: railway run --service=rosie-backend npm run db:migrate
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy Frontend
        run: railway up --service=rosie-frontend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All dependencies installed
- [ ] TypeScript compiles without errors
- [ ] Migration files consolidated (no duplicates)
- [ ] Environment variables documented
- [ ] Secrets stored in Railway (not in code)
- [ ] Integration tests pass locally
- [ ] Database backup completed

### Deployment
- [ ] Create Railway project
- [ ] Add PostgreSQL service
- [ ] Deploy backend service
- [ ] Run database migrations
- [ ] Verify backend health check
- [ ] Deploy frontend service
- [ ] Configure custom domains (optional)
- [ ] Set up monitoring

### Post-Deployment
- [ ] Test all API endpoints
- [ ] Verify frontend loads correctly
- [ ] Test repository scan
- [ ] Test evidence verification
- [ ] Test compliance report generation
- [ ] Test product catalog
- [ ] Set up automated backups
- [ ] Configure alerting

---

## Troubleshooting

### Common Deployment Issues

**Issue: "Module not found" error**
```bash
# Ensure package.json includes all dependencies
npm install
railway up --service=rosie-backend
```

**Issue: "Database connection refused"**
```bash
# Check DATABASE_URL is set correctly
railway variables --service=rosie-backend

# Test database connection
railway run --service=rosie-backend psql $DATABASE_URL -c "SELECT 1"
```

**Issue: "Health check failed"**
```bash
# Check logs
railway logs --service=rosie-backend --follow

# Test health endpoint
curl https://rosie-backend-production.up.railway.app/api/v1/health
```

**Issue: "Frontend can't connect to backend"**
```bash
# Verify CORS_ORIGIN includes frontend URL
railway variables set CORS_ORIGIN=https://rosie-frontend.up.railway.app --service=rosie-backend

# Check VITE_API_BASE_URL
railway variables --service=rosie-frontend
```

---

## Summary

### Minimum Railway Setup
```
✅ 1x PostgreSQL Database (512MB)
✅ 1x Backend Service (NestJS)
✅ 1x Frontend Service (React)
```

### Recommended Production Setup
```
✅ 1x PostgreSQL Database (2GB + backups)
✅ 3x Backend Service replicas (load balanced)
✅ 1x Frontend on Cloudflare Pages (or Railway static)
✅ 1x Redis Cache (optional, for performance)
✅ Monitoring (Sentry/Datadog)
```

### Estimated Costs
- **Development:** $0/month (free tier)
- **Production:** $25-30/month (Railway Hobby)
- **High-Traffic:** $100+/month (Railway Pro + replicas)

---

**Deployment Status:** ✅ Ready for Railway
**Estimated Setup Time:** 30-45 minutes
**Next Steps:** Run `railway init` and follow this guide
