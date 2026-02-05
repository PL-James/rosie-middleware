import { test as base, expect } from '@playwright/test';

/**
 * Custom test fixtures for ROSIE Middleware E2E tests.
 * Provides authenticated context and API helpers.
 */
export const test = base.extend<{
  apiBaseUrl: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  apiBaseUrl: async ({}, use) => {
    await use(process.env.API_BASE_URL || 'http://localhost:3000');
  },
});

export { expect };
