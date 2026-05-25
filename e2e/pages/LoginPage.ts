import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly totpInput: Locator;
  readonly totpSubmitButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#login_email');
    this.passwordInput = page.locator('#login_password');
    this.submitButton = page.locator('button[type="submit"]').first();
    this.totpInput = page.locator('input[placeholder*="mã" i], input[placeholder*="code" i], input[placeholder*="xác thực" i], input[maxlength="6"]').first();
    this.totpSubmitButton = page.locator('button[type="submit"]').first();
    this.errorAlert = page.locator('.ant-message-error, .ant-alert-error, [class*="error"]').first();
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
    await this.emailInput.waitFor({ state: 'visible', timeout: 30000 });
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async enterTotp(code: string) {
    await this.totpInput.waitFor({ state: 'visible' });
    await this.totpInput.fill(code);
    await this.totpSubmitButton.click();
  }

  async expectDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  }

  async expectError() {
    await expect(this.errorAlert).toBeVisible({ timeout: 5000 });
  }
}
