# ROSIE Middleware Platform

A middleware platform for scanning, indexing, and exposing GxP artifacts from ROSIE-compliant GitHub repositories.

## Overview

ROSIE Middleware provides:
- **JWT Authentication** - Secure API access with role-based access control (RBAC)
- **Automated scanning** - GitHub repositories for GxP artifacts
- **Product catalog** - Multi-repository product aggregation
- **REST API** - Requirements, user stories, specs, and evidence
- **Traceability validation** - ROSIE RFC-001 compliance checking
- **JWS verification** - Evidence signature verification with configurable keystore
- **Compliance reporting** - 21 CFR Part 11 compliant audit trails and PDF export
- **Single-server deployment** - Backend serves both API and React frontend

## Architecture

- **Backend:** NestJS 11 + TypeScript
- **Database:** PostgreSQL 18 + Drizzle ORM
- **Queue:** BullMQ (Redis-backed)
- **Cache:** Redis/DragonflyDB
- **Frontend:** React 18 + TypeScript + TailwindCSS + shadcn/ui
- **Deployment:** Railway

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 18
- Redis 7+
- GitHub Personal Access Token (or GitHub App)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Environment Variables

See `packages/backend/.env.example` for complete reference.

**Required:**

```env
# Database (Required)
DATABASE_URL=postgresql://user:pass@localhost:5432/rosie

# GitHub API (Required)
GITHUB_TOKEN=ghp_your_personal_access_token

# JWT Authentication (Required for production)
JWT_SECRET=your-secret-key-change-in-production
AUTH_REQUIRED=false  # Set to 'true' in production
```

**Optional:**

```env
# Redis/Queue
REDIS_URL=redis://localhost:6379

# JWS Evidence Verification
JWS_PUBLIC_KEYS='["-----BEGIN PUBLIC KEY-----\nMII..."]'
# Or individual numbered keys:
# JWS_PUBLIC_KEY_1="-----BEGIN PUBLIC KEY-----\n..."
# JWS_PUBLIC_KEY_2="-----BEGIN PUBLIC KEY-----\n..."
JWS_LOG_FAILURES=true
# JWS_MAX_AGE_SECONDS=3600

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info
```

## Authentication

### JWT Authentication

The platform uses JWT (JSON Web Tokens) for authentication with role-based access control.

**Development mode** (default):
- `AUTH_REQUIRED=false` - API is accessible without authentication
- Default admin user: `admin@example.com` / `admin123`
- In-memory user store (not persisted)

**Production mode** (recommended):
- Set `AUTH_REQUIRED=true` in environment
- Set `JWT_SECRET` to a strong random value (32+ characters)
- `NODE_ENV=production` prevents auth bypass
- Replace in-memory user store with database authentication

**Endpoints:**

```bash
# Register a new user
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}

# Login and get JWT token
POST /api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}
# Returns: { "access_token": "eyJhbGc...", "user": {...} }

# Get current user (requires authentication)
GET /api/v1/auth/me
Authorization: Bearer eyJhbGc...
```

**Roles:**
- `admin` - Full access to all endpoints
- `user` - Standard access
- `viewer` - Read-only access

### JWS Evidence Verification

Evidence artifacts can be signed with JWS (JSON Web Signature) for cryptographic verification.

**Configuration:**

```bash
# Option 1: JSON array of public keys
JWS_PUBLIC_KEYS='["-----BEGIN PUBLIC KEY-----\nMIIBI...","-----BEGIN PUBLIC KEY-----\nMIIBI..."]'

# Option 2: Individual numbered keys (easier for multi-line)
JWS_PUBLIC_KEY_1="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"

JWS_PUBLIC_KEY_2="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
```

**Development:**
- A development RSA-2048 key is included for testing
- `allowUnsignedInDev: true` - Accepts unsigned JWS in development mode
- ⚠️ **NOT for production use**

**Production:**
- Populate keystore with real public keys
- Set `NODE_ENV=production` to disable unsigned JWS acceptance
- Implement key rotation strategy

## Project Structure

```
rosie-middleware/
├── packages/
│   ├── backend/          # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── scanner/      # Repository scanning
│   │   │   │   ├── github/       # GitHub API client
│   │   │   │   ├── artifacts/    # Artifact parsing
│   │   │   │   ├── traceability/ # Validation & graph
│   │   │   │   ├── evidence/     # JWS verification
│   │   │   │   └── compliance/   # Reporting
│   │   │   ├── db/               # Database schema
│   │   │   └── main.ts
│   │   └── package.json
│   └── frontend/         # React UI
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── lib/
│       │   └── App.tsx
│       └── package.json
└── package.json          # Root workspace config
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:3000/api/docs
- API Base: http://localhost:3000/api/v1

## Development

```bash
# Start backend only
npm run backend:dev

# Start frontend only
npm run frontend:dev

# Run both in parallel
npm run dev

# Run tests
npm run test

# Database operations
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

## Deployment

### Railway Deployment

The platform deploys to Railway via GitHub integration with automatic migrations.

**Deployment flow:**
1. Push to GitHub (main branch or PR)
2. Railway detects changes and builds Docker image
3. **Migrations run automatically** before app starts
4. Backend starts and serves both API and frontend
5. Health check at `/api/v1/health`

**Required Railway environment variables:**

```env
DATABASE_URL=postgresql://...  # Auto-created by Railway PostgreSQL addon
GITHUB_TOKEN=ghp_...           # Your GitHub PAT
JWT_SECRET=random-32-char-string
AUTH_REQUIRED=true             # Enable auth in production
NODE_ENV=production
```

**Optional Railway variables:**

```env
REDIS_URL=redis://...          # If using Redis addon
JWS_PUBLIC_KEY_1="-----BEGIN PUBLIC KEY-----\n..."
JWS_LOG_FAILURES=true
PORT=3000                      # Railway auto-assigns if not set
```

**Railway setup:**
1. Create new Railway project
2. Add PostgreSQL database (creates `DATABASE_URL` automatically)
3. Connect GitHub repository
4. Add environment variables listed above
5. Deploy!

**Dockerfile:**
- Multi-stage build (builder + production)
- Alpine Linux base (node:20-alpine)
- Pure JavaScript dependencies (no native compilation)
- Frontend built and served by backend
- Migrations run automatically on startup

**Architecture:**
- Backend runs on port specified by Railway's `PORT` variable
- Frontend static files served from backend at `/`
- API endpoints at `/api/v1/*`
- Swagger docs at `/api/docs`

See `RAILWAY_DEPLOYMENT.md` for detailed deployment guide.

## Database Migrations

### PostgreSQL Extensions

The initial migration (`0000_milky_stranger.sql`) automatically installs the `pgcrypto` extension required for UUID generation. This ensures the `gen_random_uuid()` function is available for all table primary keys.

**Extension installation is idempotent** — migrations can be run multiple times safely without errors.

```sql
-- Enabled automatically during first migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Verification:**
```bash
# Check if pgcrypto is installed
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'pgcrypto';"
```

## Security

### CSV Injection Prevention

The compliance report CSV export implements formula neutralization to prevent CSV injection attacks. All user-controlled fields are sanitized before export.

**Protected fields:**
- Audit log actions
- User IDs
- Request paths
- IP addresses
- Resource types

**Sanitization strategy:**
1. Detect formula-triggering characters (`=`, `+`, `-`, `@`, `\t`, `\r`)
2. Prepend single quote to neutralize formula interpretation
3. Escape double quotes per RFC 4180
4. Wrap cells containing commas/newlines in double quotes

**Example:**
```typescript
import { sanitizeCsv } from '@/common/utils/csv-sanitizer';

const headers = ['Timestamp', 'Action', 'User'];
const rows = [
  ['2026-02-04T10:00:00Z', 'CREATE_REQ', 'user@example.com'],
  ['2026-02-04T10:01:00Z', '=malicious', '@attacker'],
];

const csv = sanitizeCsv(headers, rows);
// Malicious formulas are neutralized: '=malicious becomes "'=malicious"
```

**Reference:** [OWASP CSV Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CSV_Injection_Prevention_Cheat_Sheet.html)

## Evidence Verification

### Batch Verification Resilience

The evidence verification service uses `Promise.allSettled()` for batch operations, ensuring all verifications complete even if some fail. This prevents cascading failures where one invalid artifact blocks verification of all others.

**Behavior:**
- Individual verification failures are logged as errors
- Failed verifications return `isValid: false` with error message
- Successful verifications continue unaffected
- Batch operation returns all results with individual status

**Example:**
```typescript
// Batch verify 3 evidence artifacts
const result = await evidenceService.batchVerifyEvidence('repo-id', [
  'ev-1', // Valid
  'ev-2', // Invalid signature
  'ev-3', // Valid
]);

// Result:
// {
//   totalProcessed: 3,
//   successCount: 2,
//   failureCount: 1,
//   results: [
//     { evidenceId: 'ev-1', isValid: true, ... },
//     { evidenceId: 'ev-2', isValid: false, error: 'Invalid signature' },
//     { evidenceId: 'ev-3', isValid: true, ... },
//   ]
// }
```

## GitHub Integration

### File Content Encoding Validation

The GitHub API client handles multiple encoding types returned by the GitHub API:

| Encoding | File Size | Handling |
|----------|-----------|----------|
| `base64` | < 1MB | Standard decoding via Buffer |
| `utf-8` / `utf8` | < 1MB | Direct use (already decoded) |
| `none` | > 1MB | Fetch via Git Blob API |

**Large file handling:**

When GitHub returns `encoding: "none"` for files larger than 1MB, the client automatically falls back to the Git Blob API to fetch the raw content.

```typescript
// Automatically handles all encoding types
const file = await githubClient.getFileContent('owner', 'repo', 'large-file.txt');
// Returns decoded UTF-8 content regardless of file size
```

**Error handling:**

Unsupported encodings throw descriptive errors:
```
Error: Unsupported encoding 'binary' for file test.bin. Expected: base64, utf-8, or none.
```

## Risk Assessment

### Traceability Chain Validation

The risk assessment service validates the proper ROSIE traceability chain:

**REQ → User Story → Spec → Evidence**

**Requirements Coverage:**

A requirement is considered "covered" only if it has:
1. At least one user story (`userStory.parentId === requirement.gxpId`)
2. That user story has at least one spec (`spec.parentId === userStory.gxpId`)

**Traceability Integrity:**

The integrity score validates:
1. All user stories reference valid requirement GxP IDs
2. All specs reference valid user story GxP IDs
3. No orphaned artifacts (missing parent references)

**Broken link detection:**
```
WARN: Broken link: User Story US-042 references non-existent requirement REQ-999
WARN: Broken link: Spec SPEC-001 has no parent user story
```

**Example:**
```typescript
// Full valid chain
REQ-001 → US-001 → SPEC-001 → EV-001  ✓ Covered, 100% integrity

// Broken chain (missing user story)
REQ-001 → SPEC-001  ✗ NOT covered (direct link invalid)

// Partial chain (user story but no spec)
REQ-001 → US-001  ✗ NOT covered (incomplete chain)
```

## API Endpoints

### Pagination

All list endpoints support pagination via query parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number (1-indexed) |
| `limit` | integer | 20 | 100 | Items per page |

**Example:**
```bash
# Get page 2 of scans (10 per page)
GET /api/v1/repositories/:id/scans?page=2&limit=10

# Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

**Pagination metadata:**
- `total`: Total number of items across all pages
- `totalPages`: Total number of pages
- `hasNext`: Whether there is a next page
- `hasPrevious`: Whether there is a previous page

**Validation:**
- `page` values < 1 are clamped to 1
- `limit` values > 100 are clamped to 100
- `limit` values < 1 are clamped to 1

## License

Proprietary - PharmaLedger Association
