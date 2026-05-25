import { type Page, expect } from '@playwright/test';

export interface Credentials {
  email: string;
  password: string;
}

/**
 * Perform login via the UI and wait for dashboard.
 * Returns after navigation confirms success.
 */
export async function loginViaUI(page: Page, creds: Credentials) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#login_email').waitFor({ state: 'visible', timeout: 30000 });

  await page.locator('#login_email').fill(creds.email);
  await page.locator('#login_password').fill(creds.password);
  await page.locator('button[type="submit"]').first().click();

  await expect(page).toHaveURL(/\/(dashboard|projects|boards)/, { timeout: 15000 });
}

/**
 * Fast login via localStorage injection (bypasses network round-trip).
 * Requires backend to have pre-issued tokens for the test user.
 */
export async function loginViaStorage(
  page: Page,
  tokens: { accessToken: string; refreshToken: string; userInfo: object },
) {
  await page.goto('/login');
  await page.evaluate(({ accessToken, refreshToken, userInfo }) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
  }, tokens);
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page) {
  // Click the first avatar / user menu trigger in the header
  const avatar = page.locator('.ant-layout-header .ant-avatar, .ant-layout-header [class*="avatar"]').first();
  await avatar.click();
  const logoutItem = page.getByText('Đăng xuất').or(page.getByText('Logout'));
  await logoutItem.waitFor({ state: 'visible', timeout: 3000 });
  await logoutItem.click();
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
}

export async function clearSession(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  });
}
