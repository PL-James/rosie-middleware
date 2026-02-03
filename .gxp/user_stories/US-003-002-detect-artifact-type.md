---
gxp_id: US-003-002
title: "Detect Artifact Types from Paths"
parent_id: REQ-003
as_a: "ROSIE Middleware System"
i_want: "to automatically categorize artifacts by file path patterns"
so_that: "I can apply the correct parser and database table for each artifact"
acceptance_criteria:
  - Detect requirements from .gxp/requirements/REQ-*.md pattern
  - Detect user stories from .gxp/user_stories/US-*.md pattern
  - Detect specs from .gxp/specs/SPEC-*.md pattern
  - Detect evidence from .gxp/evidence/*.jws pattern
  - Ignore non-matching files (README.md, .gitkeep)
  - Return structured list with type and path
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in Artifacts Module (`packages/backend/src/modules/artifacts/artifact-parser.service.ts`):

```typescript
detectArtifactType(path: string): ArtifactType | null {
  // System context (apex document)
  if (path === '.gxp/system_context.md') {
    return 'system_context';
  }

  // Requirements
  if (path.match(/^\.gxp\/requirements\/REQ-.*\.md$/)) {
    return 'requirement';
  }

  // User stories
  if (path.match(/^\.gxp\/user_stories\/US-.*\.md$/)) {
    return 'user_story';
  }

  // Specifications
  if (path.match(/^\.gxp\/specs\/SPEC-.*\.md$/)) {
    return 'spec';
  }

  // Evidence (JWS files)
  if (path.match(/^\.gxp\/evidence\/.*\.jws$/)) {
    return 'evidence';
  }

  // Ignore other files
  return null;
}
```

## Pattern Matching Rules

| Pattern | Example | Type |
|---------|---------|------|
| `.gxp/system_context.md` | system_context.md | system_context |
| `.gxp/requirements/REQ-*.md` | REQ-001-auth.md | requirement |
| `.gxp/user_stories/US-*.md` | US-042-login.md | user_story |
| `.gxp/specs/SPEC-*.md` | SPEC-042-001-impl.md | spec |
| `.gxp/evidence/*.jws` | TEST-001.jws | evidence |

## Files Ignored

- `.gxp/README.md` - Documentation
- `.gxp/requirements/.gitkeep` - Placeholder
- `.gxp/requirements/TEMPLATE.md` - Template file
- `.gxp/requirements/REQ-001.pdf` - Wrong extension

## Test Scenarios

1. **Valid Requirement**: `.gxp/requirements/REQ-001-auth.md` → Type: requirement
2. **Valid User Story**: `.gxp/user_stories/US-042-login.md` → Type: user_story
3. **Valid Spec**: `.gxp/specs/SPEC-042-001-impl.md` → Type: spec
4. **Valid Evidence**: `.gxp/evidence/TEST-001.jws` → Type: evidence
5. **Ignored File**: `.gxp/README.md` → Type: null (ignored)
6. **Wrong Extension**: `.gxp/requirements/REQ-001.pdf` → Type: null (ignored)

## Implementing Specification

SPEC-004-003: Artifact Type Detection Logic
