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

## License

Proprietary - PharmaLedger Association
