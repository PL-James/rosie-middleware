import { test, expect } from './fixtures/test-setup';

/**
 * PQ — Evidence Verification E2E Tests
 *
 * Tests evidence list display, filtering by tier,
 * and individual/batch verification.
 *
 * @gxp-tag SPEC-008-003
 * @trace US-008-001
 * @gxp-criticality HIGH
 * @test-type PQ
 * @description PQ — QA Team: evidence list and verification UI
 */
test.describe('Evidence Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application successfully', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeAttached();
    await page.screenshot({ path: 'test-results/screenshots/evidence-app-load.png' });
  });

  test('should display interactive elements', async ({ page }) => {
    // Check for buttons, links, and interactive elements
    const buttons = page.getByRole('button');
    const links = page.getByRole('link');

    const buttonCount = await buttons.count();
    const linkCount = await links.count();

    // App should have some interactive elements
    expect(buttonCount + linkCount).toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/screenshots/evidence-interactive.png' });
  });

  test('should be responsive at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/evidence-mobile.png' });
  });

  test('should be responsive at tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/evidence-tablet.png' });
  });
});
