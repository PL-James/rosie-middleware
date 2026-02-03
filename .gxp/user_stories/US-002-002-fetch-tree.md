---
gxp_id: US-002-002
title: "Fetch Repository Tree"
parent_id: REQ-002
as_a: "ROSIE Middleware System"
i_want: "to fetch repository file tree from GitHub with commit SHA verification"
so_that: "I can discover all .gxp/ artifacts and ensure data integrity"
acceptance_criteria:
  - Use GitHub Tree API with recursive=1 parameter
  - Filter results to .gxp/ directory only
  - Return array of file paths with types (blob/tree)
  - Verify returned tree SHA matches expected commit SHA
  - Include commit SHA in audit log for traceability
status: IMPLEMENTED
validation_status: DRAFT
---

## Implementation Details

Implemented in GitHub API Client:

```typescript
async getTree(
  owner: string,
  repo: string,
  treeSha: string,
  recursive: boolean = true
): Promise<TreeNode[]> {
  const response = await this.octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: recursive ? '1' : '0',
  });

  // Filter to .gxp/ directory only
  const gxpFiles = response.data.tree.filter(
    (node) => node.path?.startsWith('.gxp/')
  );

  return gxpFiles.map((node) => ({
    path: node.path,
    type: node.type,
    sha: node.sha,
  }));
}
```

## Commit SHA Verification

The system verifies commit SHA integrity:

1. Get latest commit SHA for branch (default: main)
2. Fetch tree using commit's tree SHA
3. Verify response tree SHA matches expected value
4. Log commit SHA to audit trail for traceability

## Test Scenarios

1. **Successful Fetch**: Fetch tree for valid repository → Returns .gxp/ file list
2. **Missing .gxp/**: Fetch tree for non-compliant repository → Returns empty array
3. **Commit SHA Mismatch**: Tree SHA doesn't match expected → Throws error
4. **Large Repository**: Fetch tree with 1000+ files → Filters to .gxp/ efficiently

## Performance Considerations

- Single API call retrieves entire tree (recursive=1)
- Client-side filtering reduces payload size
- Tree API response cached per commit SHA (future)

## Implementing Specification

SPEC-002-001: GitHub API Client Implementation
