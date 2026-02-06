# ADR-003: BullMQ + Redis for Job Queue

## Status
Accepted

## Context
The ROSIE Middleware Platform's scanning pipeline (REQ-006) currently executes synchronously — when a scan is triggered via `POST /api/v1/repositories/:id/scan`, the 6-phase pipeline runs in the request handler thread, blocking the NestJS event loop until completion. This creates several problems at scale:

1. **Request timeout**: Large repositories with hundreds of artifacts may exceed HTTP timeout limits (30-60 seconds on Railway).
2. **No concurrent scans**: The synchronous execution blocks the API server, preventing other requests from being served during a scan.
3. **No retry logic**: If a scan fails mid-pipeline (e.g., GitHub API rate limit), the entire scan must be manually re-triggered.
4. **No progress visibility**: Clients cannot poll for scan progress — they receive the result only when the full pipeline completes or fails.
5. **No scan scheduling**: Automated periodic re-scans (e.g., nightly compliance checks) are not possible.

The system needs an asynchronous job processing solution to decouple scan triggering from scan execution, enable retries, and support future features like scheduled scans and WebSocket progress updates.

## Decision
We chose **BullMQ** backed by **Redis** as the job queue for asynchronous scan processing.

Key factors in the decision:

- **NestJS native integration**: The `@nestjs/bullmq` package provides first-class support with decorators (`@Processor`, `@Process`, `@OnQueueEvent`) that fit naturally into the NestJS module system established in ADR-001.
- **Job lifecycle management**: BullMQ provides built-in states (waiting, active, completed, failed, delayed) that map directly to scan status tracking required by REQ-006 AC-2.
- **Retry with backoff**: Configurable retry strategies with exponential backoff align with GitHub API rate limit handling (REQ-002 AC-4). Failed scans can automatically retry without user intervention.
- **Progress reporting**: BullMQ's `job.updateProgress()` API enables real-time scan progress updates that can be forwarded to clients via WebSocket (future Phase 5 feature).
- **Concurrency control**: BullMQ's concurrency setting prevents parallel scans of the same repository, directly supporting REQ-006 AC-5's concurrent scan prevention requirement.
- **Redis as backing store**: Redis provides the persistence and pub/sub capabilities BullMQ needs, while also serving as a future caching layer for API responses (ARCHITECTURE.md Performance Considerations).

## Consequences

**Positive:**
- Scan requests return immediately with a `scanId`, unblocking the API server. Clients poll for status or receive WebSocket updates.
- Automatic retry on failure — configurable retry count and backoff strategy handles transient GitHub API errors and rate limits without manual intervention.
- Job priority and scheduling — future support for nightly scheduled scans and prioritized on-demand scans.
- Progress tracking — each pipeline phase can report progress (e.g., "Phase 3: Parsing 45/60 artifacts"), enabling real-time UI updates.
- Concurrency control — `limiter` configuration prevents the same repository from being scanned concurrently, avoiding duplicate artifact insertion.
- Redis serves dual purpose — job queue backing store now, API response cache later, reducing infrastructure complexity.

**Negative:**
- Additional infrastructure dependency — Redis must be provisioned and maintained alongside PostgreSQL on Railway. Increases operational surface area.
- Eventual consistency — scan results are no longer immediately available after the API call returns. Clients must handle the asynchronous pattern (polling or WebSocket).
- Redis memory management — large numbers of queued/completed jobs consume Redis memory. Requires configured job retention policies (e.g., remove completed jobs after 24 hours).
- Debugging complexity — asynchronous job failures are harder to trace than synchronous request failures. Mitigated by BullMQ's built-in job event logging and structured error capture.

## Alternatives Considered

### PostgreSQL-based Queue (pg-boss)
Job queue backed by PostgreSQL, eliminating the need for Redis.

- **Rejected because:** While pg-boss eliminates the Redis dependency, it adds polling overhead to PostgreSQL (repeated `SELECT ... FOR UPDATE SKIP LOCKED` queries). For a system already performing complex transactional writes during the Persist phase, additional queue polling load on the same database is undesirable. pg-boss also lacks BullMQ's progress reporting API and NestJS-native integration.

### AWS SQS / Cloud Queue
Managed message queue service for job processing.

- **Rejected because:** Introduces cloud vendor lock-in and network latency for job dispatch. Railway deployment does not natively integrate with AWS services. The ROSIE Middleware is designed to run as a self-contained platform on Railway — external cloud dependencies contradict the deployment simplicity goal. Also adds cost complexity for a system that processes relatively low job volumes (tens of scans per day, not thousands).

### In-Process Queue (Custom Implementation)
Simple in-memory queue using Node.js `setTimeout` or `setImmediate` with a custom job processor.

- **Rejected because:** No persistence — queued jobs are lost on process restart. No retry logic, no progress tracking, no concurrency control. Would require building all of these features from scratch. BullMQ provides them out of the box with battle-tested reliability.

### RabbitMQ / NATS
Enterprise message brokers for asynchronous communication.

- **Rejected because:** Disproportionate operational complexity for the current scale. RabbitMQ requires its own cluster management, and NATS is optimized for pub/sub patterns rather than job queue semantics (retry, progress, concurrency limiting). BullMQ + Redis provides sufficient capability with lower operational overhead for a single-application deployment.
