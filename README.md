# ROSIE Middleware Platform

A middleware platform for scanning, indexing, and exposing GxP artifacts from ROSIE-compliant GitHub repositories.

## Overview

ROSIE Middleware provides:
- Automated scanning of GitHub repositories for GxP artifacts
- Product catalog built from multiple repositories
- REST API for accessing requirements, user stories, specs, and evidence
- Traceability validation and visualization
- JWS signature verification
- Compliance reporting (21 CFR Part 11)

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

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/rosie

# Redis
REDIS_URL=redis://localhost:6379

# GitHub
GITHUB_TOKEN=ghp_your_personal_access_token

# JWT
JWT_SECRET=your-secret-key

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

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

Deploys to Railway via GitHub integration:
- **Preview:** Automatic deployment for PRs
- **Production:** Automatic deployment on merge to main

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
