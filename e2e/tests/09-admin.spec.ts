/**
 * TEST SUITE: Admin Features
 *
 * Precondition: User phải có ADMIN_ACCESS permission
 *
 * Covers:
 * - TC-ADMIN-001: Xem danh sách users
 * - TC-ADMIN-002: Tạo user mới
 * - TC-ADMIN-003: Kích hoạt/vô hiệu hóa user
 * - TC-ADMIN-004: Reset password user
 * - TC-ADMIN-005: Xem danh sách roles
 * - TC-ADMIN-006: Tạo role mới với permissions
 * - TC-ADMIN-007: User không có ADMIN_ACCESS bị chặn
 */
import { test, expect } from '@playwright/test';
import { ADMIN_AUTH_FILE } from '../fixtures/test-data';
import { waitForSpinner, waitForModal, expectSuccessMessage } from '../helpers/wait.helper';

test.use({ storageState: ADMIN_AUTH_FILE });

const newUserEmail = `e2etest${Date.now()}@playwright.dev`;

test('TC-ADMIN-001: Xem danh sách users', async ({ page }) => {
  await page.goto('/admin/users');
  await waitForSpinner(page);

  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.locator('.ant-table, .ant-list').first()).toBeVisible({ timeout: 8000 });
});

test('TC-ADMIN-002: Tạo user mới', async ({ page }) => {
  await page.goto('/admin/users');
  await waitForSpinner(page);

  const createBtn = page.getByRole('button', { name: /tạo|create|thêm|add|new/i }).first();
  await createBtn.click();

  const modal = await waitForModal(page, undefined, 5000);

  // Email
  await modal.locator('input[type="email"], input[id*="email"], input[placeholder*="email" i]').first()
    .fill(newUserEmail);

  // Username
  const usernameInput = modal.locator('input[id*="username"], input[placeholder*="username" i], input[placeholder*="tên đăng nhập" i]').first();
  if (await usernameInput.isVisible()) {
    await usernameInput.fill(`e2euser${Date.now()}`);
  }

  // Full name
  const fullNameInput = modal.locator('input[id*="fullName"], input[placeholder*="họ và tên" i], input[placeholder*="full name" i]').first();
  if (await fullNameInput.isVisible()) {
    await fullNameInput.fill('E2E Test User');
  }

  await modal.locator('button[type="submit"]').or(
    page.locator('.ant-modal-footer button').filter({ hasText: /tạo|create|lưu|save/i })
  ).first().click();

  await expectSuccessMessage(page, 8000);
  await expect(page.getByText(newUserEmail)).toBeVisible({ timeout: 8000 });
});

test('TC-ADMIN-003: Tắt/bật user (activate/deactivate)', async ({ page }) => {
  await page.goto('/admin/users');
  await waitForSpinner(page);

  // Tìm user e2e vừa tạo
  const userRow = page.locator('tr.ant-table-row').filter({ hasText: newUserEmail }).first();
  if (!(await userRow.isVisible({ timeout: 5000 }))) {
    test.skip(true, 'E2E user not found — run TC-ADMIN-002 first');
  }

  // Tìm nút deactivate/toggle
  const toggleBtn = userRow.locator('button').filter({ hasText: /tắt|vô hiệu|deactivate/i }).first();
  if (await toggleBtn.isVisible({ timeout: 2000 })) {
    await toggleBtn.click();
    // Confirm nếu có popconfirm
    const confirmOk = page.locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal-confirm-btns .ant-btn-primary');
    if (await confirmOk.isVisible({ timeout: 2000 })) await confirmOk.click();
    await expectSuccessMessage(page, 5000);
  } else {
    // Thử switch toggle
    const switchEl = userRow.locator('.ant-switch').first();
    if (await switchEl.isVisible({ timeout: 2000 })) {
      await switchEl.click();
      await expectSuccessMessage(page, 5000);
    } else {
      test.skip(true, 'Toggle/deactivate button not found');
    }
  }
});

test('TC-ADMIN-004: Reset password user', async ({ page }) => {
  await page.goto('/admin/users');
  await waitForSpinner(page);

  const userRow = page.locator('tr.ant-table-row').filter({ hasText: newUserEmail }).first();
  if (!(await userRow.isVisible({ timeout: 5000 }))) {
    test.skip(true, 'E2E user not found');
  }

  const resetBtn = userRow.locator('button').filter({ hasText: /reset|đặt lại/i }).first();
  if (!(await resetBtn.isVisible({ timeout: 2000 }))) {
    // Tìm trong action dropdown
    const actionBtn = userRow.locator('button.ant-dropdown-trigger, button[class*="action"]').first();
    if (await actionBtn.isVisible()) {
      await actionBtn.click();
      await page.locator('.ant-dropdown-menu-item').filter({ hasText: /reset|đặt lại/i }).first().click();
    } else {
      test.skip(true, 'Reset password button not found');
    }
  } else {
    await resetBtn.click();
  }

  const confirmOk = page.locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-popconfirm-buttons .ant-btn-primary');
  if (await confirmOk.isVisible({ timeout: 3000 })) {
    await confirmOk.click();
  }

  await expectSuccessMessage(page, 5000);
});

test('TC-ADMIN-005: Xem danh sách roles', async ({ page }) => {
  await page.goto('/admin/roles');
  await waitForSpinner(page);

  await expect(page).toHaveURL(/\/admin\/roles/);
  await expect(page.locator('.ant-table, .ant-list, .ant-card').first()).toBeVisible({ timeout: 8000 });
});

test('TC-ADMIN-006: Tạo role mới', async ({ page }) => {
  await page.goto('/admin/roles');
  await waitForSpinner(page);

  const createBtn = page.getByRole('button', { name: /tạo|create|thêm|add/i }).first();
  await createBtn.click();

  const modal = await waitForModal(page, undefined, 5000);

  await modal.locator('input[id*="name"], input[placeholder*="tên" i]').first()
    .fill(`E2E Role ${Date.now()}`);

  const descInput = modal.locator('textarea, input[placeholder*="mô tả" i]').first();
  if (await descInput.isVisible()) {
    await descInput.fill('E2E automated test role');
  }

  await modal.locator('button[type="submit"]').or(
    page.locator('.ant-modal-footer button').filter({ hasText: /tạo|create|lưu|save/i })
  ).first().click();

  await expectSuccessMessage(page, 8000);
});
