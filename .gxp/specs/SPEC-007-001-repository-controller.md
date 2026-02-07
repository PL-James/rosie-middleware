---
gxp_id: SPEC-007-001
title: "Repository Controller REST API"
parent_id: US-001-001
verification_tier: OQ
design_approach: |
  Implement REST API controller for repository CRUD operations. Expose endpoints
  for listing, creating, viewing, and deleting repositories.
source_files:
  - packages/backend/src/modules/repositories/repositories.controller.ts
test_files: []
validation_status: DRAFT
assurance_status: DRAFT
---

## Operational Qualification (OQ)

Verifies REST API endpoints work correctly.

## Implementation

```typescript
@Controller('repositories')
export class RepositoriesController {
  @Get()
  async findAll(): Promise<Repository[]> {
    return await this.repositoriesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Repository> {
    return await this.repositoriesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateRepositoryDto): Promise<Repository> {
    return await this.repositoriesService.create(dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return await this.repositoriesService.delete(id);
  }

  @Post(':id/scan')
  async triggerScan(@Param('id') id: string): Promise<{ scanId: string }> {
    const scanId = await this.scannerService.scanRepository(id);
    return { scanId };
  }
}
```

## Verification Method

**Tests:**
- GET /repositories → Returns array
- POST /repositories → Returns created repository
- DELETE /repositories/:id → Deletes repository

## Implementation Files

- `packages/backend/src/modules/repositories/repositories.controller.ts`
