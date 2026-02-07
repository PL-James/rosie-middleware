---
gxp_id: SPEC-004-001
title: "YAML Frontmatter Parser Implementation"
parent_id: US-004-001
verification_tier: OQ
design_approach: |
  Implement YAML frontmatter parser using gray-matter library. Extract metadata
  fields and normalize to snake_case for database storage.
source_files:
  - packages/backend/src/modules/artifacts/artifact-parser.service.ts
test_files: []
validation_status: DRAFT
assurance_status: DRAFT
---

## Operational Qualification (OQ)

Verifies YAML parsing correctly extracts metadata and handles malformed content.

## Implementation

```typescript
parseMarkdown(fileContent: string): ParsedArtifact {
  const result = matter(fileContent);
  const data = this.normalizeFieldNames(result.data);
  return { data, content: result.content };
}

private normalizeFieldNames(data: any): any {
  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    normalized[snakeKey] = value;
  }
  return normalized;
}
```

## Verification Method

**Tests:**
- Valid YAML → Returns parsed object
- Missing frontmatter → Returns empty data
- Malformed YAML → Throws error (caught by caller)
- camelCase fields → Normalized to snake_case

## Implementation Files

- `packages/backend/src/modules/artifacts/artifact-parser.service.ts`
