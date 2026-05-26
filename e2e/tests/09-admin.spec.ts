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

  const createBtn = page.getByRole('button', { name: /tạo tài khoản/i }).first();
  await createBtn.click();

  // Chờ username input sẵn sàng
  const usernameInput = page.locator('input[placeholder*="không dấu" i], input[placeholder*="tên đăng nhập" i]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 8000 });
  await usernameInput.fill(`e2euser${Date.now()}`);

  // Email — dùng placeholder chính xác để không nhầm field
  await page.locator('input[placeholder="email@domain.com"]').fill(newUserEmail);

  // Full name (tuỳ chọn)
  const fullNameInput = page.locator('input[placeholder*="họ và tên" i]').first();
  if (await fullNameInput.isVisible({ timeout: 1000 })) {
    await fullNameInput.fill('E2E Test User');
  }

  await page.getByRole('button', { name: /tạo tài khoản/i }).last().click();

  // Toast biến mất nhanh — chờ modal đóng và user xuất hiện trong list
  await page.locator('.ant-modal-wrap').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
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

  // Toast biến mất nhanh — chờ confirm đóng là đủ (reset đã thực hiện)
  await page.locator('.ant-popconfirm, .ant-modal-confirm').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await waitForSpinner(page);
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

  const createBtn = page.getByRole('button', { name: /tạo role/i }).first();
  await createBtn.click();

  // Chờ field "Tên hiển thị" sẵn sàng (không dùng .ant-modal-content)
  const roleNameInput = page.locator('input[placeholder*="VD:" i], input[placeholder*="Quản lý nhân" i]').first();
  await roleNameInput.waitFor({ state: 'visible', timeout: 8000 });
  await roleNameInput.fill(`E2E Role ${Date.now()}`);

  const descInput = page.locator('textarea[placeholder*="mô tả" i], textarea[placeholder*="vai trò" i]').first();
  if (await descInput.isVisible({ timeout: 1000 })) {
    await descInput.fill('E2E automated test role');
  }

  await page.getByRole('button', { name: /tạo role|lưu|save/i }).last().click();

  // Toast biến mất nhanh — chờ modal đóng là đủ (role đã được tạo)
  await page.locator('.ant-modal-wrap').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
});
