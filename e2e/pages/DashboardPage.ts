import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly sidebarNav: Locator;
  readonly notificationBell: Locator;
  readonly userAvatar: Locator;
  readonly logoutItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, h2, [class*="title"]').first();
    this.sidebarNav = page.locator('aside, .ant-layout-sider, nav').first();
    this.notificationBell = page.locator('[data-testid="notification-bell"], .ant-badge [class*="bell"], button:has([data-icon="bell"])').first();
    this.userAvatar = page.locator('.ant-avatar, [class*="avatar"]').first();
    this.logoutItem = page.getByText('Đăng xuất').or(page.getByText('Logout'));
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    await this.userAvatar.click();
    await this.logoutItem.waitFor({ state: 'visible' });
    await this.logoutItem.click();
    await expect(this.page).toHaveURL(/\/login/, { timeout: 5000 });
  }

  async navigateTo(menuText: string) {
    await this.page.getByRole('menuitem', { name: menuText })
      .or(this.page.getByText(menuText).first())
      .click();
    await this.page.waitForLoadState('networkidle');
  }
}
