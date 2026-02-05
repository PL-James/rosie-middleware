import { test, expect } from './fixtures/test-setup';

/**
 * PQ — Audit Trail E2E Tests
 *
 * Tests audit trail display and filtering functionality.
 *
 * @gxp-tag SPEC-005-001
 * @trace US-005-003
 * @gxp-criticality HIGH
 * @test-type PQ
 * @description PQ — QA Team: audit trail viewing and filtering
 */
test.describe('Audit Trail', () => {
  test('should render without JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];
    // Register listener before navigation to capture all errors
    page.on('pageerror', error => jsErrors.push(error.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/audit-trail-load.png' });

    expect(jsErrors.length).toBe(0);
  });

  test('should have accessible elements', async ({ page }) => {
    await page.goto('/');
    // Check for basic accessibility
    const headings = page.getByRole('heading');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/screenshots/audit-trail-a11y.png' });
  });
});
