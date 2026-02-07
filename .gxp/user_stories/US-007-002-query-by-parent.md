---
gxp_id: US-007-002
title: "Query Artifacts by Parent ID"
parent_id: REQ-007
as_a: "Quality Assurance Engineer"
i_want: "to query artifacts by parent_id for traceability navigation"
so_that: "I can drill down from requirements to user stories to specs"
acceptance_criteria:
  - GET /api/v1/repositories/{id}/user-stories?parent_id=REQ-001
  - GET /api/v1/repositories/{id}/specs?parent_id=US-042
  - Return all children of specified parent
  - Return empty array if parent has no children
  - Support pagination for large result sets
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented in Artifacts Controller:

```typescript
@Get(':id/user-stories')
async getUserStories(
  @Param('id') id: string,
  @Query('parent_id') parentId?: string
): Promise<UserStory[]> {
  const query = this.db
    .select()
    .from(userStories)
    .where(eq(userStories.repositoryId, id));

  if (parentId) {
    query.where(eq(userStories.parentId, parentId));
  }

  return await query;
}

@Get(':id/specs')
async getSpecs(
  @Param('id') id: string,
  @Query('parent_id') parentId?: string
): Promise<Spec[]> {
  const query = this.db
    .select()
    .from(specs)
    .where(eq(specs.repositoryId, id));

  if (parentId) {
    query.where(eq(specs.parentId, parentId));
  }

  return await query;
}
```

## API Examples

**Get user stories for REQ-001:**
```http
GET /api/v1/repositories/abc123/user-stories?parent_id=REQ-001

{
  "data": [
    {
      "gxpId": "US-001-001",
      "title": "Register GitHub Repository",
      "parentId": "REQ-001"
    },
    {
      "gxpId": "US-001-002",
      "title": "Delete Repository with Cascade",
      "parentId": "REQ-001"
    }
  ]
}
```

**Get specs for US-042:**
```http
GET /api/v1/repositories/abc123/specs?parent_id=US-042

{
  "data": [
    {
      "gxpId": "SPEC-042-001",
      "title": "Login Component Implementation",
      "parentId": "US-042"
    }
  ]
}
```

## Traceability Navigation Workflow

1. **Start at Requirement**: GET /requirements → List all requirements
2. **Click Requirement**: GET /user-stories?parent_id=REQ-001 → Show child user stories
3. **Click User Story**: GET /specs?parent_id=US-001-001 → Show child specs
4. **Click Spec**: GET /evidence?parent_id=SPEC-001-001 → Show evidence (test results)

## Test Scenarios

1. **Valid Parent**: Query with parent_id=REQ-001 → Returns 2 user stories
2. **No Children**: Query with parent_id=REQ-999 → Returns empty array
3. **Multiple Children**: Query requirement with 5 user stories → Returns all 5
4. **Invalid Parent**: Query with non-existent parent_id → Returns empty array

## Implementing Specification

SPEC-007-002: Artifacts Controller Implementation
