/**
 * Auth Setup — runs once before all tests.
 * Saves authenticated browser storage state so individual tests
 * don't need to log in each time (major speed win).
 */
import { test as setup, expect } from '@playwright/test';
import { TEST_USERS, AUTH_FILE, ADMIN_AUTH_FILE } from './fixtures/test-data';

setup('authenticate as regular user', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#login_email').waitFor({ state: 'visible', timeout: 30000 });

  await page.locator('#login_email').fill(TEST_USERS.admin.email);
  await page.locator('#login_password').fill(TEST_USERS.admin.password);
  await page.locator('button[type="submit"]').first().click();

  await expect(page).toHaveURL(/\/(dashboard|projects|boards)/, { timeout: 15000 });

  await page.context().storageState({ path: AUTH_FILE });
});

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#login_email').waitFor({ state: 'visible', timeout: 30000 });

  await page.locator('#login_email').fill(TEST_USERS.admin.email);
  await page.locator('#login_password').fill(TEST_USERS.admin.password);
  await page.locator('button[type="submit"]').first().click();

  await expect(page).toHaveURL(/\/(dashboard|projects|boards)/, { timeout: 15000 });

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
