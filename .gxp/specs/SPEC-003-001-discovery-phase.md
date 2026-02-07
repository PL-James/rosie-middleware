---
gxp_id: SPEC-003-001
title: "Discovery Phase Implementation"
parent_id: US-003-001
verification_tier: OQ
design_approach: |
  Implement discovery phase of scanning pipeline. Detect .gxp/ directory,
  validate structure, and categorize artifacts by file path patterns.
source_files:
  - packages/backend/src/modules/scanner/phases/discovery.phase.ts
  - packages/backend/src/modules/scanner/scanner.service.ts
test_files: []
validation_status: DRAFT
assurance_status: DRAFT
---

## Operational Qualification (OQ)

Verifies discovery logic correctly identifies ROSIE-compliant repositories and artifact types.

## Implementation

```typescript
async discoveryPhase(owner: string, repo: string, treeSha: string): Promise<ArtifactDiscovery> {
  const tree = await this.githubClient.getTree(owner, repo, treeSha, true);

  // Check for .gxp/ directory
  const gxpDir = tree.find((node) => node.path === '.gxp' && node.type === 'tree');
  if (!gxpDir) {
    throw new Error('No .gxp/ directory found - repository not ROSIE compliant');
  }

  // Check for system_context.md (required)
  const systemContext = tree.find((node) => node.path === '.gxp/system_context.md');
  if (!systemContext) {
    throw new Error('Missing .gxp/system_context.md - required apex document');
  }

  // Categorize artifacts
  const artifacts = {
    systemContext: systemContext.path,
    requirements: tree.filter((n) => n.path?.match(/^\.gxp\/requirements\/REQ-.*\.md$/)).map((n) => n.path),
    userStories: tree.filter((n) => n.path?.match(/^\.gxp\/user_stories\/US-.*\.md$/)).map((n) => n.path),
    specs: tree.filter((n) => n.path?.match(/^\.gxp\/specs\/SPEC-.*\.md$/)).map((n) => n.path),
    evidence: tree.filter((n) => n.path?.match(/^\.gxp\/evidence\/.*\.jws$/)).map((n) => n.path),
  };

  return artifacts;
}
```

## Validation Rules

**Required:**
- `.gxp/` directory exists
- `.gxp/system_context.md` exists

**Optional (warnings if missing):**
- `.gxp/requirements/` directory
- `.gxp/user_stories/` directory
- `.gxp/specs/` directory
- `.gxp/evidence/` directory

## Verification Method

**Tests:**
- Valid repository → Returns artifact counts
- Missing .gxp/ → Throws error
- Missing system_context.md → Throws error
- Partial structure → Logs warnings

## Implementation Files

- `packages/backend/src/modules/scanner/phases/discovery.phase.ts`
