---
gxp_id: REQ-008
title: "User Interface"
gxp_risk_rating: LOW
description: |
  The system shall provide a React-based web interface for repository management,
  scan monitoring, and artifact visualization. UI shall support dashboard view,
  repository detail pages, and artifact browsing.
acceptance_criteria:
  - Display dashboard with repository list and status indicators
  - Show repository detail page with system context and artifact counts
  - Provide tabbed interface for browsing artifact types
  - Support manual scan triggering with progress indication
  - Display scan history and error logs
  - Responsive design for desktop and tablet
validation_status: DRAFT
assurance_status: DRAFT
---

## Rationale

**Risk Rating: LOW**

User interface presents compliance data but does not participate in validation logic. UI errors can:

- **Display wrong data**: Confuse users, but underlying data is correct
- **Missing features**: Reduced usability, but API access still available
- **Visual bugs**: Cosmetic issues, no impact on validation

UI errors do not corrupt data, break traceability chains, or produce false compliance reports. Users can access all functionality via REST API as backup. This makes the UI the lowest risk component.

## Evidence Requirements (FDA CSA 2026)

**Risk Level: LOW** — Ad-hoc testing sufficient. A simple Record of Testing recording who tested, when, and pass/fail result MUST be maintained. Formal JWS evidence is OPTIONAL.

## Regulatory Context

Supports 21 CFR Part 11 § 11.10(b) - Computer-generated, time-stamped audit trail. UI displays audit trail and scan history for human review, but does not generate or modify audit data.

## Acceptance Criteria Details

### AC-1: Dashboard View
- List all registered repositories in table/card view
- Display: name, status (active/archived/error), last scan date
- Status indicators: green (validated), yellow (draft), red (error)
- Quick actions: Trigger Scan, View Details, Delete
- Search bar for filtering repositories by name

### AC-2: Repository Detail Page
- Header: Repository name, GitHub URL, last scan date
- System context card: project_name, version, gxp_risk_rating, intended_use
- Artifact counts: requirements (8), user_stories (18), specs (16), evidence (0)
- Tabs: Overview, Requirements, User Stories, Specs, Evidence, Scan History

### AC-3: Tabbed Artifact Interface
- **Overview Tab**: System context, compliance summary, traceability graph (future)
- **Requirements Tab**: Table with columns: gxp_id, title, risk_rating, validation_status
- **User Stories Tab**: Table with columns: gxp_id, title, parent_id, status
- **Specs Tab**: Table with columns: gxp_id, title, parent_id, verification_tier
- **Evidence Tab**: Table with columns: gxp_id, title, parent_id, signature_verified
- **Scan History Tab**: Timeline with scan date, status, duration, artifacts_found

### AC-4: Manual Scan Triggering
- Button: "Trigger Scan" in repository detail header
- Progress modal: "Scanning repository... 67% complete"
- Real-time updates: Phase name and progress bar (future: WebSocket)
- Completion notification: "Scan completed. Found 43 artifacts."

### AC-5: Scan History Display
- Timeline view: Most recent scan at top
- Each entry: date, commit_sha, status, duration, artifacts_found
- Expandable error logs for failed scans
- Link to GitHub commit for traceability

### AC-6: Responsive Design
- Desktop: Full table view with all columns
- Tablet: Condensed table with essential columns
- Mobile: Card view (future)
- Minimum supported resolution: 1024x768

## UI Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (optional)
- **State Management**: React Context API (no Redux needed for MVP)
- **HTTP Client**: Fetch API with custom wrapper

## User Workflows

**Workflow 1: Register and Scan Repository**
1. Navigate to dashboard
2. Click "Add Repository" button
3. Enter name and GitHub URL
4. Click "Register" → Scan triggers automatically
5. Navigate to repository detail page
6. Monitor scan progress
7. View artifacts when scan completes

**Workflow 2: Browse Artifacts**
1. Navigate to repository detail page
2. Click "Requirements" tab
3. View table of requirements
4. Click requirement row → Modal with full details
5. Click parent_id link → Navigate to child artifacts

**Workflow 3: Re-scan Repository**
1. Navigate to repository detail page
2. Click "Trigger Scan" button
3. Monitor progress modal
4. View updated artifact counts

## Child User Stories

- US-008-001: Dashboard Repository List View

## Implementing Specifications

- SPEC-008-001: Dashboard Component Implementation
- SPEC-008-002: Repository Detail Page Implementation
- SPEC-008-003: API Client Library

## Verification Method

**Performance Qualification (PQ):**
- User acceptance testing: Register repository, trigger scan, browse artifacts
- Usability testing: Non-technical users can navigate interface
- Browser compatibility: Chrome, Firefox, Safari, Edge (latest versions)
