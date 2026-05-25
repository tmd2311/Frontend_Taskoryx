/**
 * TEST SUITE: Permission & Access Control
 *
 * Covers:
 * - TC-PERM-001: User không có quyền không thể truy cập route restricted
 * - TC-PERM-002: Admin truy cập được tất cả route
 * - TC-PERM-003: Logout clear session và block access
 */
import { test, expect, browser } from '@playwright/test';
import { TEST_USERS, ADMIN_AUTH_FILE } from '../fixtures/test-data';
import { loginViaUI } from '../helpers/auth.helper';
import { waitForSpinner } from '../helpers/wait.helper';

test('TC-PERM-001: Truy cập /admin/* khi không có ADMIN_ACCESS thì redirect hoặc hiện lỗi', async ({ page }) => {
  test.skip(true, 'Cần tài khoản viewer riêng — configure TEST_USERS.viewer credentials');

  await loginViaUI(page, TEST_USERS.viewer);
  await page.goto('/admin/users');
  await waitForSpinner(page);

  await expect(page).not.toHaveURL(/\/admin\/users/, { timeout: 5000 });
});

// TC-PERM-002: dùng test riêng với storageState admin
const adminTest = test.extend<{}>({});
adminTest.use({ storageState: ADMIN_AUTH_FILE });

adminTest('TC-PERM-002: Admin truy cập được /admin/users', async ({ page }) => {
  await page.goto('/admin/users');
  await waitForSpinner(page);

  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.locator('.ant-table, .ant-list').first()).toBeVisible({ timeout: 8000 });
});

test('TC-PERM-003: Unauthenticated user bị redirect về /login', async ({ browser }) => {
  // Tạo context mới không có storageState để đảm bảo chưa đăng nhập
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  const protectedRoutes = ['/dashboard', '/tasks', '/projects', '/profile'];

  for (const route of protectedRoutes) {
    await page.goto(process.env.BASE_URL ? `${process.env.BASE_URL}${route}` : route);
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  }

  await context.close();
});
