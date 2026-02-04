---
gxp_id: SPEC-007-002
title: "Artifacts Controller REST API"
parent_id: US-007-001
verification_tier: OQ
design_approach: |
  Implement REST API endpoints for querying artifacts with filtering, pagination,
  and parent_id navigation.
source_files:
  - packages/backend/src/modules/artifacts/artifacts.controller.ts
test_files: []
validation_status: DRAFT
---

## Operational Qualification (OQ)

Verifies artifact query endpoints support filtering and pagination.

## Implementation

```typescript
@Controller('repositories/:id')
export class ArtifactsController {
  @Get('requirements')
  async getRequirements(
    @Param('id') id: string,
    @Query('gxp_risk_rating') riskRating?: string
  ): Promise<Requirement[]> {
    return await this.artifactsService.getRequirements(id, { riskRating });
  }

  @Get('user-stories')
  async getUserStories(
    @Param('id') id: string,
    @Query('parent_id') parentId?: string
  ): Promise<UserStory[]> {
    return await this.artifactsService.getUserStories(id, { parentId });
  }

  @Get('specs')
  async getSpecs(
    @Param('id') id: string,
    @Query('parent_id') parentId?: string
  ): Promise<Spec[]> {
    return await this.artifactsService.getSpecs(id, { parentId });
  }
}
```

## Verification Method

**Tests:**
- GET /requirements?gxp_risk_rating=HIGH → Returns filtered results
- GET /user-stories?parent_id=REQ-001 → Returns children

## Implementation Files

- `packages/backend/src/modules/artifacts/artifacts.controller.ts`
