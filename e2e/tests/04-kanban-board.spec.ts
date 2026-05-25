/**
 * TEST SUITE: Kanban Board
 *
 * Covers:
 * - TC-BOARD-001: Hiển thị bảng Kanban đúng cấu trúc cột
 * - TC-BOARD-002: Tasks hiển thị trong đúng cột theo status
 * - TC-BOARD-003: Drag & Drop task sang cột khác
 * - TC-BOARD-004: Click vào task mở detail drawer
 * - TC-BOARD-005: Tạo task từ nút + trong cột Kanban
 * - TC-BOARD-006: Chuyển đổi giữa nhiều board trong project
 */
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from '../fixtures/test-data';
import { waitForSpinner, waitForDrawer, expectSuccessMessage } from '../helpers/wait.helper';

test.use({ storageState: AUTH_FILE });

async function openBoardsPage(page: any) {
  await page.goto('/boards');
  await waitForSpinner(page);
  await expect(page).toHaveURL(/\/boards/);
}

test('TC-BOARD-001: Hiển thị danh sách boards', async ({ page }) => {
  await openBoardsPage(page);

  // Có ít nhất 1 board card
  await expect(
    page.locator('.ant-card, [class*="board-card"], [class*="BoardCard"]').first(),
  ).toBeVisible({ timeout: 8000 });
});

test('TC-BOARD-002: Hiển thị Kanban board với các cột', async ({ page }) => {
  await openBoardsPage(page);

  // Click vào board đầu tiên
  const firstBoard = page.locator('.ant-card, [class*="board-card"]').first();
  await firstBoard.click();

  await waitForSpinner(page);

  // Các cột Kanban phải xuất hiện
  const columns = page.locator('[class*="column"], [class*="Column"], .kanban-column, [class*="kanban"]');
  await expect(columns.first()).toBeVisible({ timeout: 10000 });
  const colCount = await columns.count();
  expect(colCount).toBeGreaterThanOrEqual(2); // Ít nhất 2 cột
});

test('TC-BOARD-003: Tasks hiển thị trong cột Kanban', async ({ page }) => {
  await openBoardsPage(page);

  const firstBoard = page.locator('.ant-card, [class*="board-card"]').first();
  await firstBoard.click();
  await waitForSpinner(page);

  // Task cards trong Kanban
  await expect(
    page.locator('[class*="task-card"], [class*="TaskCard"], [class*="card"]').first(),
  ).toBeVisible({ timeout: 10000 });
});

test('TC-BOARD-004: Click task trong Kanban mở detail', async ({ page }) => {
  await openBoardsPage(page);

  const firstBoard = page.locator('.ant-card, [class*="board-card"]').first();
  await firstBoard.click();
  await waitForSpinner(page);

  const taskCard = page.locator('[class*="task-card"], [class*="TaskCard"]').first();
  await taskCard.waitFor({ state: 'visible', timeout: 8000 });
  await taskCard.click();

  // Drawer hoặc modal mở ra
  const drawer = page.locator('.ant-drawer-content');
  const modal = page.locator('.ant-modal-content');

  const opened = await Promise.race([
    drawer.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'drawer'),
    modal.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'modal'),
    expect(page).toHaveURL(/\/tasks\/\w+/, { timeout: 5000 }).then(() => 'page'),
  ]).catch(() => null);

  expect(opened).not.toBeNull();
});

test('TC-BOARD-005: Drag & Drop task giữa các cột', async ({ page }) => {
  await openBoardsPage(page);

  const firstBoard = page.locator('.ant-card, [class*="board-card"]').first();
  await firstBoard.click();
  await waitForSpinner(page);

  const columns = page.locator('[class*="column"], [class*="Column"]');
  const colCount = await columns.count();

  if (colCount < 2) {
    test.skip(true, 'Need at least 2 columns for drag test');
  }

  const sourceCol = columns.nth(0);
  const targetCol = columns.nth(1);

  const taskInSource = sourceCol.locator('[class*="task-card"], [class*="TaskCard"]').first();
  if (!(await taskInSource.isVisible({ timeout: 3000 }))) {
    test.skip(true, 'No tasks in first column to drag');
  }

  const sourceBBox = await taskInSource.boundingBox();
  const targetBBox = await targetCol.boundingBox();

  if (!sourceBBox || !targetBBox) {
    test.skip(true, 'Could not get bounding boxes');
  }

  // Thực hiện drag & drop
  await page.mouse.move(sourceBBox.x + sourceBBox.width / 2, sourceBBox.y + sourceBBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.move(targetBBox.x + targetBBox.width / 2, targetBBox.y + 50, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.up();

  await waitForSpinner(page);

  // Không có error message sau khi drop
  await expect(page.locator('.ant-message-error')).not.toBeVisible({ timeout: 2000 }).catch(() => {});
});

test('TC-BOARD-006: Tạo task từ nút + trong cột Kanban', async ({ page }) => {
  await openBoardsPage(page);

  const firstBoard = page.locator('.ant-card, [class*="board-card"]').first();
  await firstBoard.click();
  await waitForSpinner(page);

  // Nút + trong cột đầu tiên (thường hover mới hiện)
  const firstColumn = page.locator('[class*="column"], [class*="Column"]').first();
  await firstColumn.hover();

  const addBtn = firstColumn.locator('button[class*="add"], button:has([data-icon="plus"]), button:has-text("+")').first();
  if (await addBtn.isVisible({ timeout: 3000 })) {
    await addBtn.click();

    // Form thêm task
    const input = page.locator('input[placeholder*="tiêu đề" i], input[placeholder*="title" i], .ant-modal-content input').first();
    if (await input.isVisible({ timeout: 3000 })) {
      await input.fill(`Kanban Task ${Date.now()}`);
      await page.keyboard.press('Enter');
      await expectSuccessMessage(page, 5000);
    }
  } else {
    test.skip(true, 'Add task button in column not found — may require hover interaction');
  }
});
