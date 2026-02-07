---
gxp_id: REQ-007
title: "REST API"
gxp_risk_rating: MEDIUM
description: |
  The system shall expose RESTful API endpoints for querying artifacts, triggering
  scans, and retrieving compliance reports. API shall support filtering, pagination,
  and full-text search capabilities.
acceptance_criteria:
  - Provide endpoints for all artifact types (requirements, user_stories, specs, evidence)
  - Support filtering by gxp_risk_rating, verification_tier, validation_status
  - Support querying artifacts by parent_id for traceability navigation
  - Return paginated results with total count
  - Support full-text search across title and description fields
  - Return consistent JSON response format
validation_status: DRAFT
assurance_status: DRAFT
---

## Rationale

**Risk Rating: MEDIUM**

REST API is the primary interface for programmatic access to compliance data. API errors can:

- **Incorrect filtering**: Return wrong artifacts, incomplete compliance picture
- **Missing pagination**: Slow performance for large repositories
- **Invalid query results**: Incorrect traceability analysis
- **No search capability**: Unusable for large artifact sets

However, API errors do not corrupt underlying data and are easily detectable through testing. Users can re-query with corrected parameters. This makes the API less critical than core validation logic, but still significant.

## Evidence Requirements (FDA CSA 2026)

**Risk Level: MEDIUM** — Unscripted or ad-hoc testing acceptable. Evidence MAY be captured as a Record of Testing (ROT) markdown file in `.gxp/evidence/`. Single-agent validation is acceptable.

## Regulatory Context

Supports 21 CFR Part 11 § 11.10(e) - Ability to generate accurate and complete copies of records. REST API enables regulated systems to retrieve compliance documentation programmatically for audit submissions.

## Acceptance Criteria Details

### AC-1: Artifact Endpoints
- GET /api/v1/repositories/{id}/system-context
- GET /api/v1/repositories/{id}/requirements
- GET /api/v1/repositories/{id}/requirements/{req_id}
- GET /api/v1/repositories/{id}/user-stories
- GET /api/v1/repositories/{id}/specs
- GET /api/v1/repositories/{id}/evidence

### AC-2: Filtering Support
- **By risk rating**: ?gxp_risk_rating=HIGH
- **By verification tier**: ?verification_tier=OQ
- **By validation status**: ?validation_status=DRAFT
- **By parent**: ?parent_id=REQ-001
- Multiple filters: AND logic

### AC-3: Parent Query Support
- GET /api/v1/repositories/{id}/user-stories?parent_id=REQ-001
- GET /api/v1/repositories/{id}/specs?parent_id=US-042
- Return all children of specified parent
- Support recursive queries (future)

### AC-4: Pagination
- Query params: ?page=1&limit=20
- Default: page=1, limit=100
- Response includes: `{ data: [...], pagination: { page, limit, total, total_pages } }`
- Use offset-based pagination (simple, sufficient for current scale)

### AC-5: Full-Text Search
- Query param: ?q=authentication
- Search fields: title, description, markdown content
- Use PostgreSQL tsvector with GIN index
- Return ranked results (most relevant first)

### AC-6: Consistent Response Format
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 127, "total_pages": 7 }
}
```

Error format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid repository ID",
    "timestamp": "2026-02-03T...",
    "request_id": "uuid"
  }
}
```

## API Design Principles

- **RESTful**: Use HTTP verbs correctly (GET for queries, POST for mutations)
- **Idempotent**: GET requests never modify state
- **Versioned**: /api/v1 prefix for future compatibility
- **Self-documenting**: OpenAPI 3.1 specification (future)
- **Consistent**: Same response structure across all endpoints

## Error Handling

- **404 Not Found**: Repository or artifact doesn't exist
- **400 Bad Request**: Invalid query parameters
- **500 Internal Server Error**: Database connection lost, unexpected errors
- **429 Too Many Requests**: Rate limiting (future)

## Child User Stories

- US-007-001: Filter Requirements by Risk Rating
- US-007-002: Query Artifacts by Parent ID

## Implementing Specifications

- SPEC-007-001: Repository Controller Implementation
- SPEC-007-002: Artifacts Controller Implementation

## Verification Method

**Operational Qualification (OQ):**
- Integration tests for all endpoints
- Filter/pagination/search tests
- Error handling tests

**Performance Qualification (PQ):**
- Query 1000 artifacts and verify <1 second response
- Full-text search with 10,000 artifacts and verify <2 second response
- User acceptance: Access API via frontend UI
