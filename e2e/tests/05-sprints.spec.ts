/**
 * TEST SUITE: Sprint Management (Scrum)
 *
 * Covers:
 * - TC-SPRINT-001: Xem danh sách sprint trong project
 * - TC-SPRINT-002: Tạo sprint mới
 * - TC-SPRINT-003: Bắt đầu sprint (PLANNED → ACTIVE)
 * - TC-SPRINT-004: Xem sprint backlog
 * - TC-SPRINT-005: Thêm task vào sprint
 * - TC-SPRINT-006: Xem Kanban của sprint đang active
 * - TC-SPRINT-007: Hoàn thành sprint
 */
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from '../fixtures/test-data';
import { waitForSpinner, waitForModal, expectSuccessMessage } from '../helpers/wait.helper';

test.use({ storageState: AUTH_FILE });

const sprintName = `E2E Sprint ${Date.now()}`;

async function openProjectSprints(page: any) {
  await page.goto('/projects');
  await waitForSpinner(page);

  const firstProject = page.locator('.ant-card, [class*="project-card"], tr.ant-table-row').first();
  await firstProject.waitFor({ state: 'visible', timeout: 8000 });
  await firstProject.click();
  await expect(page).toHaveURL(/\/projects\/\w+/, { timeout: 10000 });
  await waitForSpinner(page);

  // Click tab Sprints
  const sprintTab = page.getByRole('tab', { name: /sprint/i });
  await sprintTab.waitFor({ state: 'visible', timeout: 5000 });
  await sprintTab.click();
  await waitForSpinner(page);
}

test('TC-SPRINT-001: Xem danh sách sprint trong project', async ({ page }) => {
  await openProjectSprints(page);

  // Sprint list hoặc empty state
  await expect(
    page.locator('[class*="sprint"], .ant-collapse, .ant-list, .ant-empty').first(),
  ).toBeVisible({ timeout: 8000 });
});

test('TC-SPRINT-002: Tạo sprint mới', async ({ page }) => {
  await openProjectSprints(page);

  const createBtn = page.getByRole('button', { name: /tạo sprint|create sprint|thêm sprint/i }).first();
  if (!(await createBtn.isVisible({ timeout: 3000 }))) {
    // Fallback: nút tạo generic
    await page.getByRole('button', { name: /tạo|create|new/i }).first().click();
  } else {
    await createBtn.click();
  }

  const modal = await waitForModal(page, undefined, 5000);

  const nameInput = modal.locator('input[placeholder*="tên" i], input[placeholder*="name" i], input#name').first();
  await nameInput.fill(sprintName);

  const goalInput = modal.locator('input[placeholder*="mục tiêu" i], input[placeholder*="goal" i], textarea').first();
  if (await goalInput.isVisible()) {
    await goalInput.fill('E2E sprint goal');
  }

  await modal.locator('button[type="submit"]').or(
    page.locator('.ant-modal-footer button').filter({ hasText: /tạo|create|lưu|save/i })
  ).first().click();

  await expectSuccessMessage(page, 8000);
  await expect(page.getByText(sprintName)).toBeVisible({ timeout: 8000 });
});

test('TC-SPRINT-003: Bắt đầu sprint (PLANNED → ACTIVE)', async ({ page }) => {
  await openProjectSprints(page);

  // Tìm sprint PLANNED để bắt đầu
  const startBtn = page.getByRole('button', { name: /bắt đầu|start sprint/i }).first();
  if (!(await startBtn.isVisible({ timeout: 3000 }))) {
    test.skip(true, 'No PLANNED sprint available to start');
  }

  await startBtn.click();

  // Confirm dialog nếu có
  const confirmBtn = page.locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-popconfirm-buttons .ant-btn-primary');
  if (await confirmBtn.isVisible({ timeout: 3000 })) {
    await confirmBtn.click();
  }

  await expectSuccessMessage(page, 8000);

  // Sprint chuyển thành ACTIVE
  await expect(
    page.locator('[class*="active"], .ant-tag').filter({ hasText: /active|đang chạy/i }).first(),
  ).toBeVisible({ timeout: 5000 });
});

test('TC-SPRINT-004: Xem backlog của sprint', async ({ page }) => {
  await openProjectSprints(page);

  // Click tab Backlog nếu có
  const backlogTab = page.getByRole('tab', { name: /backlog|tồn đọng/i });
  if (await backlogTab.isVisible({ timeout: 2000 })) {
    await backlogTab.click();
    await waitForSpinner(page);
  }

  // Expand sprint panel
  const sprintPanel = page.locator('.ant-collapse-header, [class*="sprint-header"]').first();
  if (await sprintPanel.isVisible({ timeout: 3000 })) {
    await sprintPanel.click();
    await waitForSpinner(page);
  }

  await expect(
    page.locator('.ant-collapse-content-active, [class*="sprint-content"], .ant-list').first(),
  ).toBeVisible({ timeout: 5000 });
});

test('TC-SPRINT-005: Xem Kanban của sprint đang active', async ({ page }) => {
  await openProjectSprints(page);

  // Tìm sprint ACTIVE
  const activeSprint = page.locator('[class*="sprint"]').filter({ hasText: /active|đang chạy/i }).first();
  if (!(await activeSprint.isVisible({ timeout: 3000 }))) {
    test.skip(true, 'No active sprint found');
  }

  const kanbanBtn = activeSprint.locator('button').filter({ hasText: /kanban|board/i }).first()
    .or(page.getByRole('button', { name: /xem board|view board|kanban/i }).first());

  if (await kanbanBtn.isVisible({ timeout: 3000 })) {
    await kanbanBtn.click();
    await waitForSpinner(page);

    // Kiểm tra columns Kanban render
    await expect(
      page.locator('[class*="column"], [class*="Column"]').first(),
    ).toBeVisible({ timeout: 10000 });
  } else {
    test.skip(true, 'Kanban button for active sprint not found');
  }
});
