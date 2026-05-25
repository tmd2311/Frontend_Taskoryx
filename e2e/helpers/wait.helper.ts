import { type Page, expect } from '@playwright/test';

/** Wait for Ant Design spin to disappear */
export async function waitForSpinner(page: Page, timeout = 10000) {
  const spinner = page.locator('.ant-spin-spinning');
  if (await spinner.isVisible()) {
    await spinner.waitFor({ state: 'hidden', timeout });
  }
}

/** Wait for Ant Design message notification to appear */
export async function waitForMessage(page: Page, text: string, timeout = 5000) {
  await expect(
    page.locator('.ant-message-notice-content').filter({ hasText: text }),
  ).toBeVisible({ timeout });
}

/** Wait for success message */
export async function expectSuccessMessage(page: Page, timeout = 5000) {
  await expect(
    page.locator('.ant-message-success, .ant-notification-notice-success'),
  ).toBeVisible({ timeout });
}

/** Wait for modal to be fully visible */
export async function waitForModal(page: Page, title?: string, timeout = 5000) {
  const modal = page.locator('.ant-modal-content');
  await modal.waitFor({ state: 'visible', timeout });
  if (title) {
    await expect(page.locator('.ant-modal-title')).toContainText(title, { timeout });
  }
  return modal;
}

/** Close the currently open modal */
export async function closeModal(page: Page) {
  const cancelBtn = page.locator('.ant-modal-footer button').filter({ hasText: /Hủy|Cancel/ });
  const closeBtn = page.locator('.ant-modal-close');
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
  } else {
    await closeBtn.click();
  }
  await page.locator('.ant-modal-content').waitFor({ state: 'hidden', timeout: 3000 });
}

/** Wait for table to load (no skeleton / spinner inside table) */
export async function waitForTable(page: Page) {
  await waitForSpinner(page);
  await page.locator('.ant-table-placeholder').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
}

/** Wait for drawer to open */
export async function waitForDrawer(page: Page, timeout = 5000) {
  const drawer = page.locator('.ant-drawer-content');
  await drawer.waitFor({ state: 'visible', timeout });
  return drawer;
}
