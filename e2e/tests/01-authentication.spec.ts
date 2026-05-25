/**
 * TEST SUITE: Authentication
 *
 * Covers:
 * - TC-AUTH-001: Login thành công với credentials hợp lệ
 * - TC-AUTH-002: Login thất bại với password sai
 * - TC-AUTH-003: Login thất bại với email không tồn tại
 * - TC-AUTH-004: Validation bắt buộc nhập email và password
 * - TC-AUTH-005: Redirect về login khi chưa đăng nhập
 * - TC-AUTH-006: Logout xóa session
 * - TC-AUTH-007: Remember session sau khi reload trang
 */
import { test, expect } from '@playwright/test';
import { TEST_USERS, AUTH_FILE } from '../fixtures/test-data';
import { loginViaUI, clearSession } from '../helpers/auth.helper';

// TC-AUTH-001
test('TC-AUTH-001: Login thành công với credentials hợp lệ', async ({ page }) => {
  await loginViaUI(page, TEST_USERS.admin);
  await expect(page).toHaveURL(/\/(dashboard)/, { timeout: 10000 });
  // Kiểm tra layout chính đã render
  await expect(page.locator('.ant-layout-sider, aside, nav').first()).toBeVisible();
});

// TC-AUTH-002
test('TC-AUTH-002: Login thất bại với password sai', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#login_email').waitFor({ state: 'visible', timeout: 30000 });

  await page.locator('#login_email').fill(TEST_USERS.admin.email);
  await page.locator('#login_password').fill('WrongPassword!999');
  await page.locator('button[type="submit"]').first().click();

  // Vẫn ở trang login
  await expect(page).toHaveURL(/\/login/);
  // Hiện thông báo lỗi
  await expect(
    page.locator('.ant-message-error, .ant-alert-error, [class*="error"]').first(),
  ).toBeVisible({ timeout: 5000 });
});

// TC-AUTH-003
test('TC-AUTH-003: Login thất bại với email không tồn tại', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#login_email').waitFor({ state: 'visible', timeout: 30000 });

  await page.locator('#login_email').fill('nonexistent@notreal.xyz');
  await page.locator('#login_password').fill('SomePassword@123');
  await page.locator('button[type="submit"]').first().click();

  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.locator('.ant-message-error, .ant-alert-error').first(),
  ).toBeVisible({ timeout: 5000 });
});

// TC-AUTH-004
test('TC-AUTH-004: Validation bắt buộc nhập fields', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Click submit mà không nhập gì
  await page.locator('button[type="submit"]').first().click();

  // Ant Design hiện validate message dưới input
  const validationMessages = page.locator('.ant-form-item-explain-error');
  await expect(validationMessages.first()).toBeVisible({ timeout: 3000 });
  expect(await validationMessages.count()).toBeGreaterThanOrEqual(1);
});

// TC-AUTH-005
test('TC-AUTH-005: Redirect về /login khi chưa đăng nhập', async ({ browser }) => {
  // Tạo context mới hoàn toàn không có session
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 8000 });

  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login/, { timeout: 8000 });

  await context.close();
});

// TC-AUTH-006
test('TC-AUTH-006: Logout xóa session và redirect về login', async ({ page }) => {
  await loginViaUI(page, TEST_USERS.admin);
  await expect(page).toHaveURL(/\/dashboard/);

  // Tìm avatar/user menu trong header
  const headerAvatar = page.locator('.ant-layout-header .ant-avatar, .ant-layout-header [class*="user"], .ant-layout-header [class*="avatar"]').first();
  await headerAvatar.click();

  const logoutItem = page.getByText('Đăng xuất').or(page.getByText('Logout')).first();
  await logoutItem.waitFor({ state: 'visible', timeout: 5000 });
  await logoutItem.click();

  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

  // Sau logout, truy cập dashboard phải bị redirect
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
});

// TC-AUTH-007
test('TC-AUTH-007: Session được giữ sau khi reload trang', async ({ page }) => {
  await loginViaUI(page, TEST_USERS.admin);
  await expect(page).toHaveURL(/\/dashboard/);

  // Reload
  await page.reload({ waitUntil: 'networkidle' });

  // Vẫn ở dashboard, không bị redirect login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  await expect(page.locator('.ant-layout-sider, aside').first()).toBeVisible();
});
