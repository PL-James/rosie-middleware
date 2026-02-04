---
gxp_id: SPEC-004-003
title: "Artifact Type Detection Logic"
parent_id: US-003-002
verification_tier: OQ
design_approach: |
  Implement artifact type detection from file path patterns. Map file paths to
  database tables (requirements, user_stories, specs, evidence).
source_files:
  - packages/backend/src/modules/artifacts/artifact-parser.service.ts
test_files: []
validation_status: DRAFT
---

## Operational Qualification (OQ)

Verifies artifact type detection correctly categorizes files.

## Implementation

```typescript
detectArtifactType(path: string): ArtifactType | null {
  if (path === '.gxp/system_context.md') return 'system_context';
  if (path.match(/^\.gxp\/requirements\/REQ-.*\.md$/)) return 'requirement';
  if (path.match(/^\.gxp\/user_stories\/US-.*\.md$/)) return 'user_story';
  if (path.match(/^\.gxp\/specs\/SPEC-.*\.md$/)) return 'spec';
  if (path.match(/^\.gxp\/evidence\/.*\.jws$/)) return 'evidence';
  return null; // Ignore other files
}
```

## Verification Method

**Tests:**
- Valid requirement path → Returns 'requirement'
- Valid user story path → Returns 'user_story'
- Invalid path (README.md) → Returns null

## Implementation Files

- `packages/backend/src/modules/artifacts/artifact-parser.service.ts`
