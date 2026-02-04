# ROSIE Middleware - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Interface Layer                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  React Frontend (http://localhost:5173)                           │ │
│  │                                                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │ │
│  │  │  Dashboard   │  │  Repository  │  │  Add Repository      │    │ │
│  │  │  Page        │  │  Detail Page │  │  Modal               │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘    │ │
│  │                                                                     │ │
│  │  API Client (Axios + TanStack Query)                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP/REST
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                                │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  NestJS Application (http://localhost:3000)                       │ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │  API Routes (/api/v1)                                        │  │ │
│  │  │  - Global Exception Filter                                   │  │ │
│  │  │  - Validation Pipe (class-validator)                         │  │ │
│  │  │  - Throttler (rate limiting)                                 │  │ │
│  │  │  - CORS (frontend whitelist)                                 │  │ │
│  │  │  - Swagger Documentation (/api/docs)                         │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Business Logic Layer                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  NestJS Modules                                                    │ │
│  │                                                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │ │
│  │  │ Repositories │  │  Scanner     │  │  Artifacts           │    │ │
│  │  │ Module       │  │  Module      │  │  Module              │    │ │
│  │  │              │  │              │  │                      │    │ │
│  │  │ - Service    │  │ - Service    │  │ - Parser Service     │    │ │
│  │  │ - Controller │  │ - Controller │  │ - YAML frontmatter   │    │ │
│  │  │ - DTOs       │  │              │  │ - JWS parser         │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘    │ │
│  │                                                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐                               │ │
│  │  │  GitHub      │  │  Health      │                               │ │
│  │  │  Module      │  │  Module      │                               │ │
│  │  │              │  │              │                               │ │
│  │  │ - API Client │  │ - Controller │                               │ │
│  │  │ - Rate Limit │  │              │                               │ │
│  │  └──────────────┘  └──────────────┘                               │ │
│  │                                                                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                  │                                  │
                  │                                  │
                  ▼                                  ▼
┌─────────────────────────────┐    ┌───────────────────────────────────┐
│  External Services          │    │  Data Layer                       │
│                             │    │                                   │
│  ┌────────────────────────┐ │    │  ┌─────────────────────────────┐ │
│  │  GitHub API            │ │    │  │  PostgreSQL 18              │ │
│  │  (api.github.com)      │ │    │  │  (localhost:5432)           │ │
│  │                        │ │    │  │                             │ │
│  │  - Tree API            │ │    │  │  Tables:                    │ │
│  │  - Contents API        │ │    │  │  - repositories             │ │
│  │  - Commits API         │ │    │  │  - scans                    │ │
│  │  - Repository API      │ │    │  │  - system_contexts          │ │
│  │                        │ │    │  │  - requirements             │ │
│  │  Rate Limits:          │ │    │  │  - user_stories             │ │
│  │  - PAT: 5K req/hr      │ │    │  │  - specs                    │ │
│  │  - App: 15K req/hr     │ │    │  │  - evidence                 │ │
│  └────────────────────────┘ │    │  │  - traceability_links       │ │
│                             │    │  │  - audit_log                │ │
└─────────────────────────────┘    │  │                             │ │
                                   │  │  Drizzle ORM:               │ │
                                   │  │  - Type-safe queries        │ │
                                   │  │  - Relations                │ │
                                   │  │  - Migrations               │ │
                                   │  └─────────────────────────────┘ │
                                   │                                   │
                                   └───────────────────────────────────┘
```

---

## Scanning Pipeline (6 Phases)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SCAN ORCHESTRATION                               │
│  POST /api/v1/repositories/:id/scan                                      │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │  Create Scan Record                              │
        │  - status: pending                               │
        │  - repositoryId: :id                             │
        │  - timestamp: now()                              │
        └──────────────────────────────────────────────────┘
                                   │
                                   ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         PHASE 1: DISCOVERY                               ║
╚══════════════════════════════════════════════════════════════════════════╝
│  1. Get latest commit SHA (GitHub API)                                   │
│  2. Fetch repository tree (recursive)                                    │
│  3. Filter for .gxp/* files                                              │
│  4. Validate ROSIE compliance (.gxp/system_context.md exists)            │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         PHASE 2: FETCH                                   ║
╚══════════════════════════════════════════════════════════════════════════╝
│  1. Extract file paths from tree                                         │
│  2. Batch file requests (10 files/batch)                                 │
│  3. Fetch file contents (GitHub Contents API)                            │
│  4. Base64 decode → UTF-8                                                │
│  5. Handle rate limits (429 → exponential backoff)                       │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         PHASE 3: PARSE                                   ║
╚══════════════════════════════════════════════════════════════════════════╝
│  For each file:                                                           │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Artifact Type Detection                                         │    │
│  │  - .gxp/system_context.md → SystemContext                        │    │
│  │  - .gxp/requirements/*.md → Requirement                          │    │
│  │  - .gxp/user_stories/*.md → UserStory                            │    │
│  │  - .gxp/specs/*.md → Spec                                        │    │
│  │  - .gxp/evidence/*.jws → Evidence                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                       │
│                                   ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Parser Selection                                                │    │
│  │                                                                   │    │
│  │  Markdown (.md):                                                 │    │
│  │  - gray-matter (YAML frontmatter extraction)                     │    │
│  │  - Extract: gxp_id, title, description, parent_id, metadata      │    │
│  │                                                                   │    │
│  │  JWS (.jws):                                                     │    │
│  │  - Split on '.' (header.payload.signature)                       │    │
│  │  - base64url decode header and payload                           │    │
│  │  - Extract: verification_tier, test_results, system_state        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         PHASE 4: VALIDATE                                ║
╚══════════════════════════════════════════════════════════════════════════╝
│  Basic Validation (MVP):                                                 │
│  - ✅ system_context.md exists                                           │
│  - ✅ Required fields present (project_name, version, risk_rating)       │
│  - ✅ Valid enum values (risk_rating, validation_status)                 │
│                                                                           │
│  Advanced Validation (Phase 2):                                          │
│  - ⏳ Traceability chain validation (REQ → US → SPEC)                    │
│  - ⏳ Broken link detection                                              │
│  - ⏳ Orphan artifact detection                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         PHASE 5: PERSIST                                 ║
╚══════════════════════════════════════════════════════════════════════════╝
│  Atomic Database Transaction:                                            │
│                                                                           │
│  1. INSERT system_contexts (1 record)                                    │
│  2. INSERT requirements (RETURNING id, gxp_id)                           │
│  3. INSERT user_stories (RETURNING id, gxp_id, parent_id)                │
│  4. INSERT specs (RETURNING id, gxp_id, parent_id)                       │
│  5. INSERT evidence (link to specs via gxp_id)                           │
│                                                                           │
│  6. UPDATE scans SET:                                                    │
│     - status = 'completed'                                               │
│     - completedAt = now()                                                │
│     - durationMs = elapsed                                               │
│     - artifactsCreated = count                                           │
│                                                                           │
│  7. UPDATE repositories SET:                                             │
│     - lastScanId = scanId                                                │
│     - lastScanAt = now()                                                 │
│     - lastScanStatus = 'completed'                                       │
│                                                                           │
│  On Error:                                                               │
│  - ROLLBACK transaction                                                  │
│  - UPDATE scan status = 'failed'                                         │
│  - Store error message and stack trace                                   │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         PHASE 6: NOTIFY                                  ║
╚══════════════════════════════════════════════════════════════════════════╝
│  Current (MVP):                                                           │
│  - ✅ Update scan status in database                                     │
│  - ✅ Log completion metrics                                             │
│                                                                           │
│  Future (Phase 5):                                                        │
│  - ⏳ WebSocket broadcast to connected clients                           │
│  - ⏳ Invalidate Redis cache                                             │
│  - ⏳ Trigger webhook (if configured)                                    │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │  Return Scan ID to Client                        │
        │  { scanId: "uuid", message: "Scan initiated" }   │
        └──────────────────────────────────────────────────┘
```

---

## Data Flow: Repository Creation

```
┌──────────┐     POST /api/v1/repositories              ┌──────────────┐
│  React   │────────────────────────────────────────────▶│  NestJS      │
│  UI      │     { name, gitUrl, description }          │  Controller  │
└──────────┘                                             └──────────────┘
                                                                │
                                                                ▼
                                                         ┌──────────────┐
                                                         │  Validation  │
                                                         │  (Zod/DTOs)  │
                                                         └──────────────┘
                                                                │
                                                                ▼
                                                         ┌──────────────┐
                                                         │  GitHub      │
                                                         │  Client      │
                                                         └──────────────┘
                                                                │
                    ┌───────────────────────────────────────────┤
                    │                                           │
                    ▼                                           ▼
            ┌───────────────┐                          ┌────────────────┐
            │  Parse URL    │                          │  Get Repo Info │
            │  owner/repo   │                          │  (GitHub API)  │
            └───────────────┘                          └────────────────┘
                    │                                           │
                    └───────────────────┬───────────────────────┘
                                        ▼
                                ┌────────────────┐
                                │  Check ROSIE   │
                                │  Compliance    │
                                │  (.gxp exists) │
                                └────────────────┘
                                        │
                                        ▼
                                ┌────────────────┐
                                │  INSERT INTO   │
                                │  repositories  │
                                └────────────────┘
                                        │
                                        ▼
                                ┌────────────────┐
                                │  Return        │
                                │  Repository    │
                                │  Object        │
                                └────────────────┘
                                        │
                                        ▼
┌──────────┐     200 OK                              ┌──────────────┐
│  React   │◀────────────────────────────────────────│  NestJS      │
│  UI      │     { id, name, gitUrl, ... }           │  Controller  │
└──────────┘                                          └──────────────┘
     │
     ▼
┌──────────────────────────────┐
│  TanStack Query:             │
│  - Invalidate repositories   │
│  - Refetch list              │
│  - Update UI                 │
└──────────────────────────────┘
```

---

## Database Schema Relationships

```
┌────────────────────┐
│   repositories     │
│                    │
│ PK  id             │──┐
│     name           │  │
│     gitUrl         │  │
│     owner          │  │
│     repo           │  │
│     lastScanId     │──┼──────────────┐
│     lastScanStatus │  │              │
│     isRosieCompliant│ │              │
└────────────────────┘  │              │
                        │              │
                        │              │
            ┌───────────┘              │
            │                          │
            ▼                          │
┌────────────────────┐                 │
│      scans         │                 │
│                    │                 │
│ PK  id             │◀────────────────┘
│ FK  repositoryId   │──┐
│     status         │  │
│     commitSha      │  │
│     startedAt      │  │
│     completedAt    │  │
│     durationMs     │  │
│     artifactsFound │  │
│     errorMessage   │  │
└────────────────────┘  │
                        │
            ┌───────────┴───────────┬───────────┬───────────┐
            │                       │           │           │
            ▼                       ▼           ▼           ▼
┌──────────────────┐  ┌──────────────┐  ┌─────────┐  ┌──────────┐
│ system_contexts  │  │ requirements │  │ user    │  │ specs    │
│                  │  │              │  │ stories │  │          │
│ PK id            │  │ PK id        │  │         │  │ PK id    │
│ FK repositoryId  │  │ FK repositoryId│ │ PK id   │  │ FK repositoryId
│ FK scanId        │  │ FK scanId    │  │ FK repositoryId │ FK scanId
│    projectName   │  │    gxpId     │  │ FK scanId│  │ FK userStoryId
│    version       │  │    title     │  │    gxpId │  │    gxpId
│    gxpRiskRating │  │    parentId  │◀─┼────┘    │  │    parentId
│    validationStatus│ │    description│ │    title│  │    title
│    intendedUse   │  │    gxpRiskRating│    parentId│ │    designApproach
│    sections      │  │    acceptanceCriteria       │ │    verificationTier
└──────────────────┘  └──────────────┘  └─────────┘  └──────────┘
                                             │              │
                                             │              │
                                             └──────┬───────┘
                                                    │
                                                    ▼
                                         ┌─────────────────┐
                                         │   evidence      │
                                         │                 │
                                         │ PK id           │
                                         │ FK repositoryId │
                                         │ FK scanId       │
                                         │ FK specId       │
                                         │    gxpId        │
                                         │    fileName     │
                                         │    jwsPayload   │
                                         │    jwsHeader    │
                                         │    signature    │
                                         │    isSignatureValid
                                         │    testResults  │
                                         └─────────────────┘
```

---

## API Request Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│  Client Request                                                        │
│  GET /api/v1/repositories/:id/requirements?risk_rating=HIGH            │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  NestJS Middleware Chain                                               │
│                                                                         │
│  1. CORS Check (origin whitelist)                                     │
│  2. Throttler (rate limiting)                                          │
│  3. Logger (request ID, timestamp)                                     │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Route Matching                                                        │
│  ArtifactsController.getRequirements(@Param, @Query)                   │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Parameter Validation                                                  │
│  - :id → UUID validation                                               │
│  - ?risk_rating → Enum validation (HIGH/MEDIUM/LOW)                    │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Database Query (Drizzle ORM)                                          │
│                                                                         │
│  SELECT * FROM requirements                                            │
│  WHERE repository_id = :id                                             │
│    AND gxp_risk_rating = 'HIGH'                                        │
│  ORDER BY gxp_id                                                       │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Response Serialization                                                │
│  - Transform DB entities → DTOs                                        │
│  - Remove internal fields (if any)                                     │
│  - JSON.stringify                                                      │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  HTTP Response                                                         │
│  200 OK                                                                │
│  Content-Type: application/json                                        │
│  [                                                                     │
│    { id, gxpId: "REQ-001", title: "...", gxpRiskRating: "HIGH" },     │
│    { id, gxpId: "REQ-005", title: "...", gxpRiskRating: "HIGH" }      │
│  ]                                                                     │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Client (React)                                                        │
│  - TanStack Query receives data                                        │
│  - Cache result (default 5min)                                         │
│  - Update UI                                                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
                    ┌─────────────────┐
                    │  Error Occurs   │
                    └─────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐  ┌──────────┐  ┌──────────────┐
    │ Validation   │  │ Database │  │ GitHub API   │
    │ Error        │  │ Error    │  │ Error        │
    └──────────────┘  └──────────┘  └──────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            ▼
                    ┌─────────────────┐
                    │ Exception       │
                    │ Filter          │
                    │ (Global)        │
                    └─────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐  ┌──────────┐  ┌──────────────┐
    │ BadRequest   │  │ NotFound │  │ Internal     │
    │ Exception    │  │ Exception│  │ Error        │
    │ (400)        │  │ (404)    │  │ (500)        │
    └──────────────┘  └──────────┘  └──────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            ▼
                ┌─────────────────────────┐
                │ Format Error Response   │
                │                         │
                │ {                       │
                │   error: {              │
                │     code: "...",        │
                │     message: "...",     │
                │     details: {...},     │
                │     timestamp: "...",   │
                │     request_id: "..."   │
                │   }                     │
                │ }                       │
                └─────────────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │ Log Error       │
                    │ (Console/File)  │
                    └─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │ Return to       │
                    │ Client          │
                    └─────────────────┘
```

---

## Deployment Architecture (Railway)

```
┌────────────────────────────────────────────────────────────────────────┐
│                            Railway Platform                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Project: rosie-middleware                                       │ │
│  │                                                                   │ │
│  │  ┌────────────────────┐         ┌──────────────────────────┐    │ │
│  │  │  Service:          │         │  Service:                │    │ │
│  │  │  rosie-middleware  │────────▶│  PostgreSQL 18           │    │ │
│  │  │                    │         │                          │    │ │
│  │  │  - Build: nixpacks │         │  - Auto-provisioned      │    │ │
│  │  │  - Node 20         │         │  - DATABASE_URL env      │    │ │
│  │  │  - Port: 3000      │         │  - Persistent volume     │    │ │
│  │  │  - Health: /api/v1/health    │  - Automatic backups     │    │ │
│  │  │  - Auto-deploy     │         │                          │    │ │
│  │  └────────────────────┘         └──────────────────────────┘    │ │
│  │           │                                                       │ │
│  │           ▼                                                       │ │
│  │  ┌────────────────────┐                                          │ │
│  │  │  Environment Vars  │                                          │ │
│  │  │  - GITHUB_TOKEN    │                                          │ │
│  │  │  - JWT_SECRET      │                                          │ │
│  │  │  - NODE_ENV=prod   │                                          │ │
│  │  │  - DATABASE_URL    │ (injected)                               │ │
│  │  └────────────────────┘                                          │ │
│  │                                                                   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Domain: rosie-middleware-production.up.railway.app                    │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Users (HTTPS)      │
                    │  - Frontend UI      │
                    │  - REST API         │
                    │  - Swagger Docs     │
                    └─────────────────────┘
```

---

## Security Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Security Layers                               │
└────────────────────────────────────────────────────────────────────────┘

    Layer 1: Network
    ┌──────────────────────────────────────┐
    │  HTTPS (TLS 1.3)                     │
    │  CORS (origin whitelist)             │
    │  Rate Limiting (100 req/min)         │
    └──────────────────────────────────────┘
                    │
                    ▼
    Layer 2: Authentication (Future - Phase 6)
    ┌──────────────────────────────────────┐
    │  JWT Tokens                          │
    │  API Keys (SHA-256 hashed)           │
    │  Session Management                  │
    └──────────────────────────────────────┘
                    │
                    ▼
    Layer 3: Authorization (Future - Phase 6)
    ┌──────────────────────────────────────┐
    │  RBAC (reader, scanner, admin)       │
    │  Resource-level permissions          │
    │  Repository access control           │
    └──────────────────────────────────────┘
                    │
                    ▼
    Layer 4: Input Validation
    ┌──────────────────────────────────────┐
    │  Zod schemas (TypeScript)            │
    │  class-validator (DTOs)              │
    │  SQL injection prevention (ORM)      │
    │  Path traversal checks               │
    └──────────────────────────────────────┘
                    │
                    ▼
    Layer 5: Data Protection
    ┌──────────────────────────────────────┐
    │  Parameterized queries (Drizzle)     │
    │  Environment secrets (.env)          │
    │  GitHub token rotation               │
    │  Audit logging (immutable)           │
    └──────────────────────────────────────┘
```

---

## Performance Considerations

### Current Bottlenecks (MVP)

1. **Synchronous Scanning**
   - Blocks API server during scan
   - No concurrent scans
   - Solution: BullMQ in Phase 5

2. **GitHub API Rate Limits**
   - PAT: 5,000 requests/hour
   - Large repos consume many requests
   - Solution: GitHub App (15K req/hr) + incremental scanning

3. **Database Query Performance**
   - No caching layer
   - Repeated queries hit database
   - Solution: Redis cache in Phase 5

4. **Memory Usage**
   - Entire repo loaded into memory during scan
   - Large repos (1000+ artifacts) may cause issues
   - Solution: Streaming parser + incremental processing

### Optimization Strategies (Implemented)

1. **Batched API Requests**
   - Fetch 10 files per batch
   - Reduces total round-trips

2. **Database Indexes**
   - Foreign key indexes
   - GXP ID unique indexes
   - Status/timestamp indexes

3. **Atomic Transactions**
   - Single transaction per scan
   - Rollback on failure
   - Prevents partial data

---

## Monitoring & Observability (Future)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Metrics (Prometheus)                                                  │
│  - Request count by endpoint                                           │
│  - Request duration (p50, p95, p99)                                    │
│  - Error rate by type                                                  │
│  - Scan duration by repository size                                    │
│  - GitHub API rate limit remaining                                     │
│  - Database connection pool usage                                      │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Logs (Structured JSON)                                                │
│  - timestamp, level, message, context                                  │
│  - request_id, user_id, action                                         │
│  - error stack traces                                                  │
│  - Scan progress events                                                │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Tracing (Distributed)                                                 │
│  - Request → Scanner → GitHub API                                      │
│  - Database query duration                                             │
│  - External service latency                                            │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Alerting (Sentry, Email)                                              │
│  - Error rate > 5%                                                     │
│  - Scan failure                                                        │
│  - GitHub API rate limit exhausted                                     │
│  - Database connection failures                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

*Last Updated: 2026-02-03*
