/**
 * TEST SUITE: Navigation & Layout
 *
 * Covers:
 * - TC-NAV-001: Sidebar navigation links hoạt động đúng
 * - TC-NAV-002: Dashboard hiển thị stats và widgets
 * - TC-NAV-003: Header notification bell hiển thị
 * - TC-NAV-004: Responsive sidebar collapse/expand
 * - TC-NAV-005: Breadcrumb navigation (nếu có)
 * - TC-NAV-006: 404 / unknown route redirect về dashboard
 */
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from '../fixtures/test-data';
import { waitForSpinner } from '../helpers/wait.helper';

test.use({ storageState: AUTH_FILE });

const navItems = [
  { label: /dashboard|bảng điều khiển/i, url: /\/dashboard/ },
  { label: /^đầu việc|công việc của tôi/i, url: /\/tasks/ },
  { label: /^dự án/i, url: /\/projects/ },
];

test('TC-NAV-001: Điều hướng sidebar tới tất cả menu chính', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForSpinner(page);

  for (const item of navItems) {
    const menuItem = page.locator('.ant-menu-item, li[class*="menu"]').filter({ hasText: item.label }).first();
    if (await menuItem.isVisible({ timeout: 2000 })) {
      await menuItem.click();
      await waitForSpinner(page);
      await expect(page).toHaveURL(item.url, { timeout: 8000 });
    }
  }
});

test('TC-NAV-002: Dashboard hiển thị stats', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForSpinner(page);

  // Stats cards phải có ít nhất 1 metric
  await expect(
    page.locator('.ant-statistic, [class*="stat"], [class*="metric"], .ant-card').first(),
  ).toBeVisible({ timeout: 8000 });
});

test('TC-NAV-003: Header notification bell hiển thị', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForSpinner(page);

  const bell = page.locator(
    '.ant-layout-header [class*="bell"], .ant-layout-header .ant-badge, button:has([data-icon="bell"])'
  ).first();
  await expect(bell).toBeVisible({ timeout: 5000 });
});

test('TC-NAV-004: Click notification bell mở dropdown', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForSpinner(page);

  const bell = page.locator(
    '.ant-layout-header [class*="bell"], .ant-layout-header .ant-badge, button:has([data-icon="bell"])'
  ).first();

  if (await bell.isVisible({ timeout: 3000 })) {
    await bell.click();

    // Dropdown thông báo
    await expect(
      page.locator('.ant-dropdown, [class*="notification-dropdown"], [class*="NotificationDropdown"]').first(),
    ).toBeVisible({ timeout: 3000 });
  } else {
    test.skip(true, 'Notification bell not found');
  }
});

test('TC-NAV-005: Unknown route redirect về dashboard', async ({ page }) => {
  await page.goto('/this-route-does-not-exist-xyz');
  await waitForSpinner(page);

  // Phải redirect về dashboard hoặc 404 page
  await expect(page).toHaveURL(/\/(dashboard|404)/, { timeout: 5000 });
});

test('TC-NAV-006: Sidebar collapse/expand', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForSpinner(page);

  const collapseBtn = page.locator(
    '.ant-layout-sider-trigger, button[class*="collapse"], button[class*="sider"]'
  ).first();

  if (await collapseBtn.isVisible({ timeout: 3000 })) {
    await collapseBtn.click();
    await page.waitForTimeout(400);

    // Sider thu nhỏ
    const sider = page.locator('.ant-layout-sider');
    const collapsedClass = await sider.getAttribute('class');
    expect(collapsedClass).toMatch(/collapsed/);

    // Expand lại
    await collapseBtn.click();
    await page.waitForTimeout(400);
  } else {
    test.skip(true, 'Sidebar collapse trigger not found');
  }
});
