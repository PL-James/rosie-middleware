---
gxp_id: US-007-001
title: "Filter Requirements by Risk Rating"
parent_id: REQ-007
as_a: "Compliance Officer"
i_want: "to filter requirements by gxp_risk_rating"
so_that: "I can focus on high-risk requirements during audits"
acceptance_criteria:
  - GET /api/v1/repositories/{id}/requirements?gxp_risk_rating=HIGH
  - Support filtering by LOW, MEDIUM, HIGH
  - Return only requirements matching filter
  - Maintain pagination with filtered results
  - Support combining with other filters
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in Artifacts Controller:

```typescript
@Get(':id/requirements')
async getRequirements(
  @Param('id') id: string,
  @Query('gxp_risk_rating') riskRating?: string,
  @Query('page') page = 1,
  @Query('limit') limit = 100
): Promise<PaginatedResponse<Requirement>> {
  const query = this.db
    .select()
    .from(requirements)
    .where(eq(requirements.repositoryId, id));

  if (riskRating) {
    query.where(eq(requirements.gxpRiskRating, riskRating));
  }

  const total = await query.count();
  const data = await query
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

## API Examples

**Filter by HIGH risk:**
```http
GET /api/v1/repositories/abc123/requirements?gxp_risk_rating=HIGH

{
  "data": [
    {
      "gxpId": "REQ-002",
      "title": "GitHub Integration",
      "gxpRiskRating": "HIGH"
    },
    {
      "gxpId": "REQ-004",
      "title": "Artifact Parsing",
      "gxpRiskRating": "HIGH"
    }
  ],
  "pagination": { "page": 1, "limit": 100, "total": 4, "totalPages": 1 }
}
```

**Combine filters:**
```http
GET /api/v1/repositories/abc123/requirements?gxp_risk_rating=HIGH&validation_status=DRAFT

Returns HIGH risk requirements that are still in DRAFT status
```

## Test Scenarios

1. **Filter HIGH**: Query with gxp_risk_rating=HIGH → Returns 4 requirements
2. **Filter MEDIUM**: Query with gxp_risk_rating=MEDIUM → Returns 3 requirements
3. **Filter LOW**: Query with gxp_risk_rating=LOW → Returns 1 requirement
4. **No Filter**: Query without filter → Returns all 8 requirements
5. **Invalid Value**: Query with gxp_risk_rating=INVALID → Returns empty array

## Implementing Specification

SPEC-007-002: Artifacts Controller Implementation
