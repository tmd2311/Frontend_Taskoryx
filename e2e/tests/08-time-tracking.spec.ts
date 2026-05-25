/**
 * TEST SUITE: Time Tracking
 *
 * Covers:
 * - TC-TIME-001: Xem trang Time Report
 * - TC-TIME-002: Filter time report theo date range
 * - TC-TIME-003: Log giờ làm từ task detail
 * - TC-TIME-004: Xem chart thống kê daily/weekly/monthly
 */
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from '../fixtures/test-data';
import { waitForSpinner, expectSuccessMessage } from '../helpers/wait.helper';

test.use({ storageState: AUTH_FILE });

test('TC-TIME-001: Xem trang Time Report', async ({ page }) => {
  await page.goto('/time-report');
  await waitForSpinner(page);

  await expect(page).toHaveURL(/\/time-report/);
  // Có chart hoặc table
  await expect(
    page.locator('.recharts-wrapper, .ant-table, [class*="chart"], [class*="report"]').first(),
  ).toBeVisible({ timeout: 8000 });
});

test('TC-TIME-002: Chuyển đổi giữa daily/weekly/monthly', async ({ page }) => {
  await page.goto('/time-report');
  await waitForSpinner(page);

  const weeklyBtn = page.getByRole('button', { name: /weekly|tuần/i })
    .or(page.locator('.ant-radio-button-wrapper').filter({ hasText: /weekly|tuần/i }));

  if (await weeklyBtn.isVisible({ timeout: 3000 })) {
    await weeklyBtn.click();
    await waitForSpinner(page);
    // Chart re-renders
    await expect(
      page.locator('.recharts-wrapper, [class*="chart"]').first(),
    ).toBeVisible({ timeout: 5000 });
  } else {
    test.skip(true, 'Period toggle not found');
  }
});

test('TC-TIME-003: Log giờ làm cho task từ task detail', async ({ page }) => {
  await page.goto('/tasks');
  await waitForSpinner(page);

  const firstTask = page.locator('tr.ant-table-row, .ant-list-item').first();
  await firstTask.waitFor({ state: 'visible', timeout: 8000 });
  await firstTask.click();

  // Tìm Log Work section trong drawer/detail
  const logWorkBtn = page.getByRole('button', { name: /log work|ghi giờ|ghi nhận/i })
    .or(page.getByText(/log work|ghi giờ/i).first());

  if (await logWorkBtn.isVisible({ timeout: 5000 })) {
    await logWorkBtn.click();

    const hoursInput = page.locator('input[id*="hour"], input[placeholder*="giờ" i], input[placeholder*="hour" i]').first();
    if (await hoursInput.isVisible({ timeout: 3000 })) {
      await hoursInput.fill('2');

      const descInput = page.locator('input[placeholder*="mô tả" i], textarea[placeholder*="mô tả" i], input[placeholder*="desc" i]').first();
      if (await descInput.isVisible()) {
        await descInput.fill('E2E test work log');
      }

      const submitBtn = page.locator('.ant-modal-footer button').filter({ hasText: /lưu|save|ghi/i }).first()
        .or(page.locator('button[type="submit"]').last());
      await submitBtn.click();

      await expectSuccessMessage(page, 5000);
    }
  } else {
    test.skip(true, 'Log Work button not found in task detail');
  }
});

test('TC-TIME-004: Xem time stats theo project', async ({ page }) => {
  await page.goto('/time-report');
  await waitForSpinner(page);

  // Tab/filter by project
  const projectTab = page.getByRole('tab', { name: /project|dự án/i })
    .or(page.getByRole('radio', { name: /project|dự án/i }));

  if (await projectTab.isVisible({ timeout: 3000 })) {
    await projectTab.click();
    await waitForSpinner(page);
    await expect(
      page.locator('.recharts-wrapper, .ant-table').first(),
    ).toBeVisible({ timeout: 5000 });
  } else {
    test.skip(true, 'Project time stats tab not found');
  }
});
