# ROSIE RFC-001 Compliance Artifacts

This directory contains all GxP artifacts for the **ROSIE Middleware Platform** project, making it compliant with ROSIE RFC-001 specification.

## Overview

The rosie-middleware project is a **Phase 1 MVP** that scans other repositories for ROSIE compliance. This `.gxp/` directory ensures that the middleware itself is also ROSIE-compliant, resolving the ironic situation where a compliance validation system was not itself compliant.

## Artifact Summary

| Type | Count | Description |
|------|-------|-------------|
| System Context | 1 | Apex document defining system boundary, risk rating, and intended use |
| Requirements | 8 | High-level requirements with risk ratings (HIGH/MEDIUM/LOW) |
| User Stories | 18 | User stories mapped to requirements via parent_id |
| Specifications | 17 | Implementation specs mapped to user stories with verification tiers (IQ/OQ/PQ) |
| Evidence | 0 | Placeholder for future JWS test evidence files |
| **Total** | **44** | **Complete ROSIE RFC-001 compliant artifact set** |

## GxP Risk Rating: HIGH

**Rationale:**
- rosie-middleware validates compliance for other regulated systems
- False positives could certify non-compliant systems as validated
- False negatives could reject valid systems
- Direct impact on pharmaceutical software validation lifecycle

## Directory Structure

```
.gxp/
├── system_context.md              # Apex document (REQUIRED)
├── requirements/                  # 8 requirements (REQ-001 through REQ-008)
│   ├── REQ-001-repository-management.md (MEDIUM)
│   ├── REQ-002-github-integration.md (HIGH)
│   ├── REQ-003-artifact-discovery.md (HIGH)
│   ├── REQ-004-artifact-parsing.md (HIGH)
│   ├── REQ-005-data-persistence.md (HIGH)
│   ├── REQ-006-scan-orchestration.md (MEDIUM)
│   ├── REQ-007-rest-api.md (MEDIUM)
│   └── REQ-008-user-interface.md (LOW)
├── user_stories/                  # 18 user stories (US-001-001 through US-008-001)
│   ├── US-001-001-register-repository.md → REQ-001
│   ├── US-001-002-delete-repository.md → REQ-001
│   ├── US-002-001-github-auth.md → REQ-002
│   ├── US-002-002-fetch-tree.md → REQ-002
│   ├── US-002-003-batch-requests.md → REQ-002
│   ├── US-003-001-validate-gxp-dir.md → REQ-003
│   ├── US-003-002-detect-artifact-type.md → REQ-003
│   ├── US-004-001-parse-frontmatter.md → REQ-004
│   ├── US-004-002-parse-jws.md → REQ-004
│   ├── US-004-003-handle-malformed.md → REQ-004
│   ├── US-005-001-atomic-transactions.md → REQ-005
│   ├── US-005-002-foreign-keys.md → REQ-005
│   ├── US-005-003-audit-log.md → REQ-005
│   ├── US-006-001-trigger-scan.md → REQ-006
│   ├── US-006-002-record-metrics.md → REQ-006
│   ├── US-007-001-filter-requirements.md → REQ-007
│   ├── US-007-002-query-by-parent.md → REQ-007
│   └── US-008-001-dashboard-view.md → REQ-008
├── specs/                         # 17 specifications (SPEC-INF-001 through SPEC-008-003)
│   ├── SPEC-INF-001-database-schema.md (IQ) → US-005-002
│   ├── SPEC-INF-002-migrations.md (IQ) → US-005-001
│   ├── SPEC-INF-003-application-bootstrap.md (IQ) → US-002-001
│   ├── SPEC-001-001-repository-service.md (OQ) → US-001-001
│   ├── SPEC-002-001-github-client.md (OQ) → US-002-001
│   ├── SPEC-002-002-rate-limiting.md (PQ) → US-002-003
│   ├── SPEC-003-001-discovery-phase.md (OQ) → US-003-001
│   ├── SPEC-004-001-yaml-parser.md (OQ) → US-004-001
│   ├── SPEC-004-002-jws-parser.md (OQ) → US-004-002
│   ├── SPEC-004-003-type-detection.md (OQ) → US-003-002
│   ├── SPEC-005-001-atomic-transactions.md (OQ) → US-005-001
│   ├── SPEC-006-001-scan-orchestration.md (PQ) → US-006-001
│   ├── SPEC-007-001-repository-controller.md (OQ) → US-001-001
│   ├── SPEC-007-002-artifacts-controller.md (OQ) → US-007-001
│   ├── SPEC-008-001-dashboard-component.md (PQ) → US-008-001
│   ├── SPEC-008-002-detail-page.md (PQ) → US-008-001
│   └── SPEC-008-003-api-client.md (OQ) → US-008-001
└── evidence/
    └── .gitkeep                   # Placeholder - no tests exist yet
```

## Traceability Chain

All artifacts maintain proper parent-child relationships:

1. **Requirements (REQ)** → Define high-level system capabilities
2. **User Stories (US)** → Link to requirements via `parent_id: REQ-XXX`
3. **Specifications (SPEC)** → Link to user stories via `parent_id: US-XXX-XXX`
4. **Evidence (future)** → Will link to specs via `parent_id: SPEC-XXX-XXX`

Example traceability chain:
```
REQ-002 (GitHub Integration)
  └── US-002-001 (GitHub Authentication)
      └── SPEC-002-001 (GitHub API Client Implementation)
          └── packages/backend/src/modules/github/github-api.client.ts
```

## Risk Distribution

| Risk Level | Count | Percentage | Requirements |
|------------|-------|------------|--------------|
| HIGH | 4 | 50% | REQ-002, REQ-003, REQ-004, REQ-005 |
| MEDIUM | 3 | 37.5% | REQ-001, REQ-006, REQ-007 |
| LOW | 1 | 12.5% | REQ-008 |

**HIGH risk requirements** focus on core compliance logic:
- GitHub integration (REQ-002): Wrong commit SHA = validating wrong code
- Artifact discovery (REQ-003): Missing artifacts = incomplete compliance picture
- Artifact parsing (REQ-004): Parse errors = corrupted compliance database
- Data persistence (REQ-005): Transaction failures = partial data corruption

## Verification Tiers

| Tier | Count | Percentage | Description |
|------|-------|------------|-------------|
| IQ (Installation Qualification) | 3 | 17.6% | Database schema, migrations, bootstrap |
| OQ (Operational Qualification) | 11 | 64.7% | Core business logic verification |
| PQ (Performance Qualification) | 3 | 17.6% | End-user workflows and performance |

## Validation Status

**Current Status:** DRAFT

**Reason:** No evidence artifacts (JWS test results) exist yet because the project has no tests implemented.

**Path to VALIDATED Status:**
1. Implement unit tests for all modules
2. Implement integration tests for API endpoints
3. Implement E2E tests for UI workflows
4. Generate JWS evidence artifacts with cryptographic signatures
5. Conduct formal QA review
6. Update validation_status: VALIDATED in all artifacts

## Compliance Impact

By making rosie-middleware itself ROSIE-compliant:

### Self-Validation Capability
- The middleware can now scan **itself** and validate its own compliance
- Demonstrates dogfooding: "We use our own compliance validation system"
- Provides reference implementation for other projects

### Regulatory Context
Supports:
- **21 CFR Part 11**: Electronic records and electronic signatures
  - § 11.10(e): Generate complete, accurate, tamper-evident copies of records
  - § 11.10(c): Sequentially numbered audit trails
  - § 11.50: Non-repudiation through cryptographic signatures
- **EMA ePI Guidelines**: Traceability from requirements to implementation
- **ISO 13485**: Design control documentation and traceability

## Self-Scan Test

Once the `.gxp/` directory is committed, you can test self-scanning:

```bash
# Register rosie-middleware as a repository to itself
curl -X POST http://localhost:3000/api/v1/repositories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rosie-middleware-self",
    "gitUrl": "https://github.com/pharmaledger/rosie-middleware"
  }'

# Trigger scan
curl -X POST http://localhost:3000/api/v1/repositories/{id}/scan

# Check results
curl http://localhost:3000/api/v1/repositories/{id}/system-context
# Expected: projectName = "ROSIE Middleware Platform", version = "0.1.0", gxpRiskRating = "HIGH"

curl http://localhost:3000/api/v1/repositories/{id}/requirements
# Expected: 8 requirements returned

curl http://localhost:3000/api/v1/repositories/{id}/user-stories
# Expected: 18 user stories returned

curl http://localhost:3000/api/v1/repositories/{id}/specs
# Expected: 17 specs returned
```

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-03 | James Gannon | Initial ROSIE RFC-001 compliance artifacts |

## References

- **ROSIE RFC-001**: GxP Artifact Specification
- **21 CFR Part 11**: Electronic Records; Electronic Signatures
- **rosie-middleware/ARCHITECTURE.md**: System architecture documentation
- **rosie-middleware/PROJECT_SUMMARY.md**: Project overview and implementation status

---

**Note:** This directory makes rosie-middleware both a ROSIE validator AND a ROSIE-compliant project. The irony of a compliance validation system not being compliant is now resolved.
