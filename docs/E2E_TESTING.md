# E2E Testing (PQ Tier)

End-to-end tests serve as Performance Qualification (PQ) evidence in the ROSIE framework. They verify the system against its intended use by exercising the full stack through a browser.

## Tech Stack

- **Playwright** (test runner and browser automation)
- **Chromium** (default browser project)
- **Vite dev server** (auto-started for local runs)

## Setup

### Install Playwright browsers

```bash
cd packages/frontend
npx playwright install chromium --with-deps
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:5173` | Frontend URL for tests |
| `API_BASE_URL` | `http://localhost:3000` | Backend API URL for fixtures |
| `CI` | (unset) | When set, disables auto-start web server and sets retries=2, workers=1 |

## Playwright Configuration

File: `packages/frontend/playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  outputDir: 'test-results',
});
```

Key settings:
- `screenshot: 'on'` -- captures screenshots for every test (used as PQ evidence)
- `trace: 'on-first-retry'` -- captures traces on first retry (used for debugging)
- JSON reporter writes `test-results/e2e-results.json` for evidence pipeline ingestion
- In CI, the web server is started externally; locally, Playwright starts `npm run dev` automatically

## Writing PQ Tests

### File location

```
packages/frontend/e2e/
  fixtures/
    test-setup.ts          # Custom test fixtures
    api-helpers.ts          # Backend API helper functions
  repository-management.spec.ts
  evidence-verification.spec.ts
  traceability-verification.spec.ts
  compliance-reporting.spec.ts
  audit-trail.spec.ts
```

### GxP Annotations

Every E2E test file MUST include a GxP annotation block with `@test-type PQ`:

```typescript
/**
 * PQ -- Repository Management E2E Tests
 *
 * @gxp-tag SPEC-001-001
 * @trace US-001-001
 * @gxp-criticality HIGH
 * @test-type PQ
 * @description PQ -- QA Team: repository CRUD and scan workflow
 */
```

### Test Structure

Import the custom test fixture (not the bare Playwright `test`):

```typescript
import { test, expect } from './fixtures/test-setup';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the dashboard', async ({ page }) => {
    await expect(page).toHaveTitle(/ROSIE/i);
    // Capture screenshot for PQ evidence
    await page.screenshot({
      path: 'test-results/screenshots/dashboard-initial.png'
    });
  });
});
```

### Screenshot Conventions

Screenshots are collected as PQ evidence artifacts. Follow these conventions:

- Save to `test-results/screenshots/` with descriptive names
- Capture at multiple viewports for responsive verification:

```typescript
test('should be responsive at mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'test-results/screenshots/feature-mobile.png'
  });
});

test('should be responsive at tablet viewport', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'test-results/screenshots/feature-tablet.png'
  });
});
```

### Trace Collection

Traces are captured on first retry (configured in `playwright.config.ts`). To replay:

```bash
npx playwright show-trace test-results/trace.zip
```

Traces include:
- DOM snapshots at each action
- Network requests and responses
- Console logs
- Screenshots at each step

## Test Fixtures

### test-setup.ts

Extends the base Playwright `test` with custom fixtures:

```typescript
import { test as base, expect } from '@playwright/test';

export const test = base.extend<{
  apiBaseUrl: string;
}>({
  apiBaseUrl: async ({}, use) => {
    await use(process.env.API_BASE_URL || 'http://localhost:3000');
  },
});

export { expect };
```

### api-helpers.ts

Utility functions for seeding and cleaning test data via the backend API:

```typescript
import { APIRequestContext } from '@playwright/test';

// Seed a repository for testing
export async function seedRepository(request: APIRequestContext, data?: Partial<{
  name: string;
  gitUrl: string;
  description: string;
}>): Promise<any>;

// Delete all repositories (cleanup)
export async function deleteAllRepositories(request: APIRequestContext): Promise<void>;

// Trigger a scan on a repository
export async function triggerScan(request: APIRequestContext, repoId: string): Promise<any>;
```

## Running E2E Tests

### Local development

```bash
# Start the backend first (in a separate terminal)
npm run backend:dev

# Run E2E tests (auto-starts frontend dev server)
cd packages/frontend
npx playwright test

# Run a specific test file
npx playwright test e2e/evidence-verification.spec.ts

# Run in headed mode (visible browser)
npx playwright test --headed

# Run in debug mode (step through tests)
npx playwright test --debug
```

### View HTML report

```bash
cd packages/frontend
npx playwright show-report
```

## CI/CD Integration

E2E tests run as part of `.github/workflows/test-and-evidence.yml`:

```yaml
- name: Run E2E tests (PQ)
  if: success()
  env:
    DATABASE_URL: postgresql://user:password@localhost:5432/rosie_test
  run: |
    # Start backend in background
    npm run backend:dev &
    sleep 5
    # Run Playwright tests
    cd packages/frontend && npx playwright test --reporter=json 2>&1 | tee ../../e2e-results.json || true
```

The pipeline:
1. Installs Playwright browsers (`npx playwright install chromium --with-deps`)
2. Runs backend in background
3. Executes Playwright tests with JSON reporter
4. Collects screenshots and traces as evidence
5. Uploads `packages/frontend/test-results/` as GitHub artifacts (90-day retention)
6. PQ evidence packages are created from the E2E results with screenshots and traces included

## Current Test Coverage

| Test File | Spec | Tests | Focus |
|-----------|------|-------|-------|
| `repository-management.spec.ts` | SPEC-001-001 | 4 | Dashboard display, empty state, add repo, navigation |
| `evidence-verification.spec.ts` | SPEC-008-003 | 4 | App load, interactive elements, mobile/tablet responsive |
| `traceability-verification.spec.ts` | SPEC-008-002 | 3 | Layout, navigation, routing |
| `compliance-reporting.spec.ts` | SPEC-007-002 | 4 | Page load, navigation, data tables, error handling |
| `audit-trail.spec.ts` | SPEC-005-001 | 2 | Render without errors, accessibility |

Total: 17 PQ tests across 5 spec areas.
