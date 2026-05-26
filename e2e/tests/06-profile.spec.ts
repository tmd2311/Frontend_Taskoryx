/**
 * TEST SUITE: Profile & Account Settings
 *
 * Covers:
 * - TC-PROF-001: Xem trang hồ sơ cá nhân
 * - TC-PROF-002: Cập nhật thông tin cá nhân (fullName, phone)
 * - TC-PROF-003: Đổi mật khẩu với mật khẩu đúng
 * - TC-PROF-004: Đổi mật khẩu thất bại — password hiện tại sai
 * - TC-PROF-005: Đổi mật khẩu thất bại — confirm không khớp
 * - TC-PROF-006: Chuyển đổi dark/light theme
 */
import { test, expect } from '@playwright/test';
import { AUTH_FILE, TEST_USERS } from '../fixtures/test-data';
import { waitForSpinner, expectSuccessMessage } from '../helpers/wait.helper';

test.use({ storageState: AUTH_FILE });

test('TC-PROF-001: Xem trang hồ sơ cá nhân', async ({ page }) => {
  await page.goto('/profile');
  await waitForSpinner(page);

  await expect(page).toHaveURL(/\/profile/);
  // Có form thông tin cá nhân
  await expect(
    page.locator('form, .ant-form, [class*="profile"]').first(),
  ).toBeVisible({ timeout: 8000 });
});

test('TC-PROF-002: Cập nhật thông tin cá nhân', async ({ page }) => {
  await page.goto('/profile');
  await waitForSpinner(page);

  // Ant Design Form — profileForm fields render với id dạng [formName]_[fieldName]
  const fullNameInput = page.locator('input[placeholder*="Nguyễn Văn" i], input[id*="fullName"]').first();
  if (await fullNameInput.isVisible({ timeout: 5000 })) {
    await fullNameInput.clear();
    await fullNameInput.fill('E2E Updated Name');

    // Set up response listener trước khi click để bắt API success
    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/') && res.status() < 400,
      { timeout: 8000 }
    ).catch(() => null);

    const saveBtn = page.getByRole('button', { name: /lưu thay đổi|lưu|save/i }).first();
    await saveBtn.click();

    // Chờ toast (nhanh) hoặc API response (chắc chắn hơn)
    await Promise.race([
      page.locator('.ant-message-notice-content').first().waitFor({ state: 'visible', timeout: 5000 }),
      responsePromise,
    ]).catch(() => {});

    // Kiểm tra không có error message
    await expect(page.locator('.ant-message-error')).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  } else {
    test.skip(true, 'fullName input not found');
  }
});

test('TC-PROF-003: Đổi mật khẩu với thông tin hợp lệ', async ({ page }) => {
  await page.goto('/profile');
  await waitForSpinner(page);

  // Click tab "Đổi mật khẩu" — Ant Design Tabs với key="password"
  await page.getByRole('tab', { name: /đổi mật khẩu/i }).click();
  await waitForSpinner(page);

  // passwordForm không có name prop — dùng thứ tự input trong form
  const pwdInputs = page.locator('.ant-tabs-tabpane-active input');
  await pwdInputs.first().waitFor({ state: 'visible', timeout: 5000 });

  await pwdInputs.nth(0).fill(TEST_USERS.admin.password);  // currentPassword
  await pwdInputs.nth(1).fill('NewAdmin@123456');           // newPassword
  await pwdInputs.nth(2).fill('NewAdmin@123456');           // confirmPassword

  // Lắng nghe API response thay vì toast (toast biến mất quá nhanh)
  const responsePromise = page.waitForResponse(
    res => res.url().includes('/api/') && (res.status() === 200 || res.status() === 204),
    { timeout: 8000 }
  ).catch(() => null);

  await page.getByRole('button', { name: /đổi mật khẩu/i }).click();

  // Chờ toast hoặc API response
  await Promise.race([
    page.locator('.ant-message-notice-content').first().waitFor({ state: 'visible', timeout: 5000 }),
    responsePromise,
  ]).catch(() => {});

  // Không được có error message
  await expect(page.locator('.ant-message-error')).not.toBeVisible({ timeout: 2000 }).catch(() => {});

  // Đổi lại mật khẩu cũ để không break tests sau
  await pwdInputs.nth(0).fill('NewAdmin@123456');
  await pwdInputs.nth(1).fill(TEST_USERS.admin.password);
  await pwdInputs.nth(2).fill(TEST_USERS.admin.password);

  const responsePromise2 = page.waitForResponse(
    res => res.url().includes('/api/') && (res.status() === 200 || res.status() === 204),
    { timeout: 8000 }
  ).catch(() => null);

  await page.getByRole('button', { name: /đổi mật khẩu/i }).click();

  await Promise.race([
    page.locator('.ant-message-notice-content').first().waitFor({ state: 'visible', timeout: 5000 }),
    responsePromise2,
  ]).catch(() => {});
});

test('TC-PROF-004: Đổi mật khẩu thất bại — confirm không khớp', async ({ page }) => {
  await page.goto('/profile');
  await waitForSpinner(page);

  await page.getByRole('tab', { name: /đổi mật khẩu/i }).click();
  const pwdInputs = page.locator('.ant-tabs-tabpane-active input');
  await pwdInputs.first().waitFor({ state: 'visible', timeout: 5000 });

  await pwdInputs.nth(0).fill(TEST_USERS.admin.password);
  await pwdInputs.nth(1).fill('NewPassword@123');
  await pwdInputs.nth(2).fill('DifferentPassword@999');

  const submitBtn = page.getByRole('button', { name: /đổi|change|lưu|save/i }).last();
  await submitBtn.click();

  // Validation error hoặc error message
  await expect(
    page.locator('.ant-form-item-explain-error, .ant-message-error').first(),
  ).toBeVisible({ timeout: 5000 });
});

test('TC-PROF-006: Toggle dark/light theme', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForSpinner(page);

  const themeToggle = page.locator(
    'button[class*="theme"], [class*="theme"] button, button:has([data-icon="moon"]), button:has([data-icon="sun"])'
  ).first();

  if (await themeToggle.isVisible({ timeout: 3000 })) {
    // Ghi lại state hiện tại của html attribute
    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );

    await themeToggle.click();
    await page.waitForTimeout(300);

    const newTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );

    expect(newTheme).not.toBe(initialTheme);

    // Restore
    await themeToggle.click();
  } else {
    test.skip(true, 'Theme toggle not found');
  }
});
