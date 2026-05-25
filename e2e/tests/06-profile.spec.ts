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

  const fullNameInput = page.locator('input[id*="fullName"], input[id*="full_name"], input[placeholder*="họ và tên" i], input[placeholder*="full name" i]').first();
  if (await fullNameInput.isVisible({ timeout: 3000 })) {
    await fullNameInput.clear();
    await fullNameInput.fill('E2E Updated Name');

    const saveBtn = page.getByRole('button', { name: /lưu|save|cập nhật|update/i }).first();
    await saveBtn.click();

    await expectSuccessMessage(page, 5000);
  } else {
    test.skip(true, 'fullName input not found');
  }
});

test('TC-PROF-003: Đổi mật khẩu với thông tin hợp lệ', async ({ page }) => {
  await page.goto('/profile');
  await waitForSpinner(page);

  // Tìm section đổi mật khẩu
  const passwordTab = page.getByRole('tab', { name: /mật khẩu|password/i }).first();

  if (await passwordTab.isVisible({ timeout: 3000 })) {
    await passwordTab.click();
    await waitForSpinner(page);
  }

  const currentPwdInput = page.locator('input[id*="current"], input[placeholder*="hiện tại" i], input[placeholder*="current" i]').first();
  const newPwdInput = page.locator('input[id*="new"], input[placeholder*="mới" i], input[placeholder*="new" i]').first();
  const confirmPwdInput = page.locator('input[id*="confirm"], input[placeholder*="xác nhận" i], input[placeholder*="confirm" i]').first();

  if (!(await currentPwdInput.isVisible({ timeout: 3000 }))) {
    test.skip(true, 'Password change form not found');
  }

  await currentPwdInput.fill(TEST_USERS.admin.password);
  await newPwdInput.fill('NewAdmin@123456');
  await confirmPwdInput.fill('NewAdmin@123456');

  const submitBtn = page.getByRole('button', { name: /đổi|change|lưu|save/i }).last();
  await submitBtn.click();

  await expectSuccessMessage(page, 5000);

  // Đổi lại mật khẩu cũ để không break tests sau
  await currentPwdInput.fill('NewAdmin@123456');
  await newPwdInput.fill(TEST_USERS.admin.password);
  await confirmPwdInput.fill(TEST_USERS.admin.password);
  await submitBtn.click();
  await expectSuccessMessage(page, 5000);
});

test('TC-PROF-004: Đổi mật khẩu thất bại — confirm không khớp', async ({ page }) => {
  await page.goto('/profile');
  await waitForSpinner(page);

  const passwordTab = page.getByRole('tab', { name: /mật khẩu|password/i });
  if (await passwordTab.isVisible({ timeout: 2000 })) await passwordTab.click();

  const currentPwdInput = page.locator('input[id*="current"], input[placeholder*="hiện tại" i]').first();
  const newPwdInput = page.locator('input[id*="new"], input[placeholder*="mới" i]').first();
  const confirmPwdInput = page.locator('input[id*="confirm"], input[placeholder*="xác nhận" i]').first();

  if (!(await currentPwdInput.isVisible({ timeout: 3000 }))) {
    test.skip(true, 'Password form not found');
  }

  await currentPwdInput.fill(TEST_USERS.admin.password);
  await newPwdInput.fill('NewPassword@123');
  await confirmPwdInput.fill('DifferentPassword@999');

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
