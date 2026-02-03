---
gxp_id: US-001-001
title: "Register GitHub Repository"
parent_id: REQ-001
as_a: "Quality Assurance Engineer"
i_want: "to register a GitHub repository for compliance scanning"
so_that: "I can validate ROSIE RFC-001 compliance and generate audit reports"
acceptance_criteria:
  - POST /api/v1/repositories with name and git_url
  - System validates GitHub URL format
  - System extracts owner and repo from URL
  - System returns repository ID and status
  - System triggers initial scan automatically
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in Repository Service (`packages/backend/src/modules/repositories/repositories.service.ts`):

```typescript
async create(dto: CreateRepositoryDto): Promise<Repository> {
  const parsed = this.parseGitHubUrl(dto.gitUrl);
  const repository = await this.db.insert(repositories).values({
    name: dto.name,
    gitUrl: dto.gitUrl,
    owner: parsed.owner,
    repo: parsed.repo,
  });
  // Trigger scan automatically
  await this.scannerService.scanRepository(repository.id);
  return repository;
}
```

## Test Scenarios

1. **Valid Registration**: Submit valid GitHub URL → Returns 201 Created with repository ID
2. **Invalid URL**: Submit malformed URL → Returns 400 Bad Request with validation error
3. **Duplicate URL**: Submit existing repository URL → Returns 409 Conflict
4. **Private Repository**: Submit private repo URL → Validates credentials before accepting

## User Workflow

1. Navigate to dashboard
2. Click "Add Repository" button
3. Enter repository name (e.g., "Product Authentication System")
4. Enter GitHub URL (e.g., "https://github.com/pharmaledger/product-auth")
5. Click "Register" button
6. System validates URL and creates repository record
7. System automatically triggers initial scan
8. User redirected to repository detail page to monitor scan progress

## Implementing Specification

SPEC-001-001: Repository Service Implementation
