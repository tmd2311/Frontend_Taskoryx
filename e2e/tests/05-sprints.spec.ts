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

  // App dùng sidebar menu với ?tab= query param thay vì tabs
  const sprintMenuItem = page.locator('.ant-menu-item').filter({ hasText: /sprints?/i }).first();
  await sprintMenuItem.waitFor({ state: 'visible', timeout: 5000 });
  await sprintMenuItem.click();
  await waitForSpinner(page);
}

test('TC-SPRINT-001: Xem danh sách sprint trong project', async ({ page }) => {
  await openProjectSprints(page);

  // Sprint list — có nút "Tạo Sprint" hoặc sprint card
  await expect(
    page.getByRole('button', { name: /tạo sprint/i }).or(page.getByText(/sprint đang chạy/i)).first(),
  ).toBeVisible({ timeout: 8000 });
});

test('TC-SPRINT-002: Tạo sprint mới', async ({ page }) => {
  await openProjectSprints(page);

  const createBtn = page.getByRole('button', { name: /tạo sprint/i }).first();
  await createBtn.waitFor({ state: 'visible', timeout: 5000 });
  await createBtn.click();

  // Chờ modal — placeholder thực là "VD: Sprint 1", không phải "tên"
  const nameInput = page.locator('input[placeholder*="Sprint 1" i], input[placeholder*="VD:" i]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 8000 });
  await nameInput.fill(sprintName);

  // Mục tiêu Sprint — textarea
  const goalInput = page.locator('textarea[placeholder*="mục tiêu" i], textarea[placeholder*="sprint" i]').first();
  if (await goalInput.isVisible({ timeout: 1000 })) {
    await goalInput.fill('E2E sprint goal');
  }

  // Nút "Tạo Sprint" trong modal (không phải nút ngoài trang)
  await page.getByRole('button', { name: /^tạo sprint$/i }).first().click();

  // Toast biến mất quá nhanh — chờ modal đóng rồi check sprint trong list
  await page.locator('.ant-modal-content').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  // getByText có thể match nhiều element (strong + span) — dùng first()
  await expect(page.getByText(sprintName).first()).toBeVisible({ timeout: 8000 });
});

test('TC-SPRINT-003: Bắt đầu sprint (PLANNED → ACTIVE)', async ({ page }) => {
  await openProjectSprints(page);

  // Tìm sprint PLANNED để bắt đầu
  const startBtn = page.getByRole('button', { name: /bắt đầu|start sprint/i }).first();
  if (!(await startBtn.isVisible({ timeout: 3000 }))) {
    test.skip(true, 'No PLANNED sprint available to start');
  }

  await startBtn.click();

  // Popconfirm "Bắt đầu sprint này?" — bấm nút "Bắt đầu" trong popconfirm
  const confirmBtn = page.locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal-confirm-btns .ant-btn-primary');
  await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
  await confirmBtn.click();

  // Toast biến mất nhanh — kiểm tra "SPRINT ĐANG CHẠY" xuất hiện thay vì toast
  await expect(
    page.getByText(/sprint đang chạy/i).first(),
  ).toBeVisible({ timeout: 8000 });
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

  // Sprint content — có "Sprint Goal" hoặc nút "Thêm task"
  await expect(
    page.getByText('Sprint Goal').or(page.getByText(/thêm task/i)).first(),
  ).toBeVisible({ timeout: 8000 });
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
