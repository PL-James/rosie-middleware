---
gxp_id: US-008-001
title: "Dashboard Repository List View"
parent_id: REQ-008
as_a: "Quality Assurance Engineer"
i_want: "to see a dashboard with all registered repositories and their status"
so_that: "I can quickly assess compliance status across multiple projects"
acceptance_criteria:
  - Display repository cards/table with name, status, last_scanned_at
  - Show status indicators (green=VALIDATED, yellow=DRAFT, red=ERROR)
  - Provide "Add Repository" button
  - Provide quick actions (Trigger Scan, View Details, Delete)
  - Support search/filter by repository name
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented in Dashboard component (`packages/frontend/src/pages/Dashboard.tsx`):

```tsx
export function Dashboard() {
  const { data: repositories } = useRepositories();

  return (
    <div className="dashboard">
      <header>
        <h1>ROSIE Middleware - Compliance Dashboard</h1>
        <button onClick={handleAddRepository}>Add Repository</button>
      </header>

      <div className="repository-grid">
        {repositories.map((repo) => (
          <RepositoryCard key={repo.id} repository={repo} />
        ))}
      </div>
    </div>
  );
}

function RepositoryCard({ repository }: { repository: Repository }) {
  const statusColor = getStatusColor(repository.validationStatus);

  return (
    <div className="card">
      <div className="card-header">
        <h3>{repository.name}</h3>
        <StatusBadge color={statusColor} status={repository.validationStatus} />
      </div>

      <div className="card-body">
        <p>Last scanned: {formatDate(repository.lastScannedAt)}</p>
        <p>Artifacts: {repository.artifactCount}</p>
      </div>

      <div className="card-actions">
        <button onClick={() => triggerScan(repository.id)}>Scan</button>
        <Link to={`/repositories/${repository.id}`}>View Details</Link>
        <button onClick={() => deleteRepository(repository.id)}>Delete</button>
      </div>
    </div>
  );
}
```

## Status Indicators

| Status | Color | Badge | Meaning |
|--------|-------|-------|---------|
| VALIDATED | Green | ✓ VALIDATED | All requirements validated, evidence collected |
| DRAFT | Yellow | ⚠ DRAFT | Documentation complete, no evidence yet |
| ERROR | Red | ✗ ERROR | Last scan failed or parse errors detected |

## Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│ ROSIE Middleware - Compliance Dashboard  [+Add Repo]│
├─────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│ │ Product    │ │ Sales Demo │ │ HelixOps   │       │
│ │ Auth       │ │            │ │            │       │
│ │ ✓ VALIDATED│ │ ⚠ DRAFT   │ │ ⚠ DRAFT   │       │
│ │            │ │            │ │            │       │
│ │ 127 artifact│ │ 43 artifact│ │ 89 artifact│      │
│ │ Scanned 2h │ │ Never      │ │ Scanned 1d │      │
│ │            │ │            │ │            │       │
│ │ [Scan] [→] │ │ [Scan] [→] │ │ [Scan] [→] │      │
│ └────────────┘ └────────────┘ └────────────┘       │
└─────────────────────────────────────────────────────┘
```

## User Workflows

**Workflow 1: Add New Repository**
1. Click "Add Repository" button
2. Modal opens with form fields (name, GitHub URL)
3. Submit form → Repository registered, scan triggered
4. Dashboard refreshes, new card appears with status "Scanning..."

**Workflow 2: View Repository Details**
1. Click "View Details" on repository card
2. Navigate to /repositories/{id}
3. See full artifact list, traceability graph, scan history

**Workflow 3: Trigger Scan**
1. Click "Scan" button on repository card
2. Button shows loading spinner
3. Card updates in real-time as scan progresses
4. Completion notification displayed

## Test Scenarios

1. **Empty State**: No repositories → Show "No repositories yet. Add one to get started."
2. **Repository List**: 3 repositories → Display 3 cards
3. **Status Colors**: Repository with VALIDATED status → Green badge
4. **Search**: Type "Product" in search → Filter to matching repositories
5. **Quick Scan**: Click Scan button → Trigger scan, show progress

## Implementing Specification

SPEC-008-001: Dashboard Component Implementation
