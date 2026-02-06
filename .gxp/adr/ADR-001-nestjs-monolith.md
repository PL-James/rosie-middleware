# ADR-001: NestJS Modular Monolith over Microservices

## Status
Accepted

## Context
The ROSIE Middleware Platform requires a backend architecture to orchestrate a 6-phase scanning pipeline (Discovery, Fetch, Parse, Validate, Persist, Notify), manage GitHub API integration, persist artifacts to PostgreSQL, and expose 15+ REST API endpoints. The system must support 21 CFR Part 11 compliance validation for pharmaceutical software repositories.

Two primary architectural patterns were evaluated:

1. **Microservices** — Separate deployable services for scanning, parsing, persistence, and API gateway.
2. **Modular monolith** — Single deployable application with well-defined internal module boundaries.

The team needed a pattern that supports a small team (1-2 engineers), rapid iteration during the MVP phase, straightforward debugging of a multi-phase pipeline, and a single audit artifact for regulatory compliance documentation.

## Decision
We chose a **NestJS 11 modular monolith** architecture. The application is structured as a single deployable NestJS application with 5 well-bounded modules (Repositories, Scanner, Artifacts, GitHub, Health), each with its own service, controller, and DTOs. Modules communicate via direct dependency injection rather than network calls.

NestJS was selected specifically because:

- **Module system**: NestJS modules enforce boundaries between concerns (each module declares its imports, exports, providers, and controllers), giving the structural benefits of microservices without network overhead.
- **TypeScript native**: Full type safety across the scanning pipeline, from GitHub API responses through database persistence.
- **Decorator-driven DI**: Dependency injection via decorators (`@Injectable`, `@Module`) produces testable, loosely coupled code that can be refactored into separate services later if needed.
- **Built-in pipeline middleware**: Global exception filters, validation pipes, throttlers, and interceptors handle cross-cutting concerns (error formatting, input validation, rate limiting) without custom framework code.
- **Swagger integration**: Auto-generated OpenAPI 3.1 documentation from decorators supports regulatory auditability.

## Consequences

**Positive:**
- Single deployable unit simplifies Railway deployment (one service, one container, one health check).
- Single audit artifact for 21 CFR Part 11 compliance — all scanning, parsing, persistence, and API logic in one codebase with unified version control.
- In-process module communication eliminates network latency between pipeline phases. The 6-phase scan executes as sequential method calls rather than HTTP/message-queue hops.
- Shared database transaction context — atomic persistence across all artifact types in a single transaction is straightforward without distributed transaction coordination.
- Lower operational complexity — no service mesh, no API gateway, no distributed tracing required for MVP.
- Straightforward debugging — a scan failure produces a single stack trace through the entire pipeline.

**Negative:**
- Vertical scaling only — cannot independently scale the scanning module under heavy load. Accepted for MVP scale (tens of repositories, not thousands).
- Module coupling risk — without discipline, modules can develop tight coupling via shared services. Mitigated by NestJS module boundary enforcement and code review.
- Single point of failure — if the NestJS process crashes, all functionality is unavailable. Mitigated by Railway auto-restart and health check endpoint.

## Alternatives Considered

### Microservices (NestJS + RabbitMQ/NATS)
Separate services for API Gateway, Scanner, Parser, and Persistence communicating via message queue.

- **Rejected because:** Operational complexity (4+ services, message broker, distributed tracing) is disproportionate to team size and MVP scope. Distributed transactions across services would complicate atomic artifact persistence required by REQ-005. Regulatory audit would span multiple codebases.

### Express.js (Minimal Framework)
Lightweight Express server with manual module organization.

- **Rejected because:** No built-in module system, dependency injection, or validation pipeline. Would require building framework-level concerns (DI container, exception filters, request validation) from scratch. NestJS provides these out of the box with TypeScript type safety.

### Fastify (Performance-Optimized)
Fastify with fastify-plugin for modularization.

- **Rejected because:** While faster in raw benchmarks, the performance difference is negligible for the middleware's I/O-bound workload (GitHub API calls and PostgreSQL queries dominate latency, not request parsing). NestJS's richer ecosystem (Swagger, class-validator, TypeORM/Drizzle integration) provides more value for this use case.
