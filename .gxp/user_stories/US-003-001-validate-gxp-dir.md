---
gxp_id: US-003-001
title: "Validate .gxp/ Directory Structure"
parent_id: REQ-003
as_a: "ROSIE Middleware System"
i_want: "to detect and validate the .gxp/ directory structure"
so_that: "I can determine if a repository is ROSIE RFC-001 compliant"
acceptance_criteria:
  - Search repository tree for .gxp/ directory at root level
  - Verify system_context.md exists (required)
  - Check for subdirectories (requirements/, user_stories/, specs/, evidence/)
  - Log warning if expected subdirectories missing
  - Return scan error if .gxp/ directory not found
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented in Scanner Service (`packages/backend/src/modules/scanner/scanner.service.ts`):

```typescript
async discoveryPhase(repositoryId: string): Promise<ArtifactDiscovery> {
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

  // Check for expected subdirectories
  const subdirs = ['requirements', 'user_stories', 'specs', 'evidence'];
  for (const subdir of subdirs) {
    const exists = tree.some((node) => node.path?.startsWith(`.gxp/${subdir}/`));
    if (!exists && subdir !== 'evidence') {
      this.logger.warn(`Missing .gxp/${subdir}/ directory`);
    }
  }

  return { systemContext, artifacts: tree };
}
```

## Validation Rules

**Required:**
- `.gxp/` directory must exist at repository root
- `.gxp/system_context.md` must exist

**Optional (warnings if missing):**
- `.gxp/requirements/` directory
- `.gxp/user_stories/` directory
- `.gxp/specs/` directory

**Always optional:**
- `.gxp/evidence/` directory (may be empty for draft systems)

## Test Scenarios

1. **Valid Structure**: Repository with all directories → Scan proceeds
2. **Missing .gxp/**: Repository without .gxp/ → Scan fails with error
3. **Missing system_context.md**: .gxp/ exists but no apex doc → Scan fails
4. **Partial Structure**: Missing user_stories/ → Logs warning, scan continues

## Implementing Specification

SPEC-003-001: Discovery Phase Implementation
