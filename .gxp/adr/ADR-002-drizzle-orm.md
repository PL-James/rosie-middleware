# ADR-002: Drizzle ORM over TypeORM and Prisma

## Status
Accepted

## Context
The ROSIE Middleware Platform requires an ORM to manage 9 PostgreSQL tables (repositories, scans, system_contexts, requirements, user_stories, specs, evidence, traceability_links, audit_log) with complex foreign key relationships, atomic transactions, and performance indexes. The ORM must support:

- **Atomic transactions** (REQ-005): All artifact inserts wrapped in a single transaction with rollback on failure.
- **Foreign key constraints** (REQ-005): Enforced parent-child relationships for traceability chains (REQ -> US -> SPEC -> Evidence).
- **Type-safe queries**: TypeScript compile-time validation of query shapes to prevent runtime SQL errors.
- **Migration management**: Version-controlled, deterministic schema migrations for Railway PostgreSQL deployments.
- **Performance**: Efficient queries with proper indexing for artifact retrieval and full-text search.

Three ORM options were evaluated: Drizzle ORM, TypeORM, and Prisma.

## Decision
We chose **Drizzle ORM** as the data access layer for the ROSIE Middleware Platform.

Key factors in the decision:

- **SQL-first philosophy**: Drizzle schema definitions map directly to SQL DDL. The `pgTable()` function produces schemas that read like the underlying SQL, making it straightforward for developers and auditors to verify that the database schema matches the specification (SPEC-INF-001).
- **Zero-overhead type safety**: Drizzle generates TypeScript types directly from schema definitions — no separate type generation step (unlike Prisma's `prisma generate`). Schema changes produce compile-time errors immediately.
- **Transparent query generation**: Drizzle's query builder generates predictable SQL. For a compliance system, understanding exactly what SQL executes is critical for audit trail integrity and performance analysis.
- **Lightweight runtime**: Drizzle has no query engine or runtime proxy. It compiles to thin SQL strings over the `pg` driver, resulting in minimal memory overhead and fast cold starts on Railway.
- **First-class transaction support**: `db.transaction()` provides a straightforward API for wrapping multi-table inserts in atomic transactions, directly supporting REQ-005's atomic persistence requirement.

## Consequences

**Positive:**
- Schema-as-code in TypeScript provides a single source of truth for database structure, queryable at compile time.
- Deterministic migration generation via `drizzle-kit generate` produces SQL migration files that can be version-controlled and reviewed before deployment.
- No runtime overhead — queries compile to parameterized SQL strings, eliminating the performance overhead of runtime query engines.
- Atomic transactions via `db.transaction()` directly support REQ-005 with minimal boilerplate.
- Relational queries (`db.query.requirements.findMany({ with: { userStories: true } })`) support traceability chain navigation without manual JOINs.
- Foreign key definitions in schema enforce referential integrity at both application and database level.

**Negative:**
- Smaller ecosystem compared to TypeORM and Prisma — fewer community plugins, middleware, and tutorials available.
- Less mature — Drizzle reached v1.0 more recently than TypeORM or Prisma, so edge cases in complex query patterns may surface.
- No built-in seeding tool — seed scripts must be written manually. Acceptable since seeding is minimal for this system.
- Migration squashing requires manual intervention for long-lived branches with many migrations.

## Alternatives Considered

### TypeORM
The most established TypeScript ORM with decorator-based entity definitions.

- **Rejected because:** TypeORM's decorator-based entity definitions (`@Entity`, `@Column`, `@ManyToOne`) produce a layer of abstraction that obscures the underlying SQL. For a compliance system subject to audit, transparent SQL generation is preferred. TypeORM also has known issues with transaction isolation and migration determinism that could impact REQ-005's atomic transaction requirement. Active Record pattern encourages entity-level business logic that blurs the boundary between data access and domain logic.

### Prisma
Widely adopted ORM with schema-first approach and auto-generated client.

- **Rejected because:** Prisma requires a separate schema file (`.prisma`) and a code generation step (`prisma generate`) that introduces a build-time dependency and potential drift between schema and types. The Prisma query engine runs as a separate binary process, adding memory overhead and cold start latency on Railway. Prisma's transaction API (`$transaction`) has limitations with interactive transactions that could complicate the multi-table atomic inserts required by REQ-005. Additionally, Prisma's migration engine sometimes generates non-deterministic migration files, which is problematic for regulated environments requiring reproducible deployments.

### Raw SQL (pg driver)
Direct SQL queries using the `pg` PostgreSQL driver without an ORM.

- **Rejected because:** While maximally transparent, raw SQL sacrifices type safety and requires manual result mapping. The maintenance burden of writing and maintaining parameterized queries for 9 tables with complex joins outweighs the transparency benefit. Drizzle provides equivalent transparency with compile-time type checking.
