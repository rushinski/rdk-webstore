// tests/helpers/auth-helpers.ts
import { Page } from "@playwright/test";
import { createUserWithProfile } from "./supabase";

export interface TestUser {
  email: string;
  password: string;
  role: "customer" | "admin" | "super_admin" | "dev";
  id?: string;
}

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\//);
}

export async function registerViaUI(
  page: Page,
  email: string,
  password: string
) {
  await page.goto("/auth/register");
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.fill('[name="confirmPassword"]', password);
  await page.click("text=/Create account/i");
  await page.waitForURL(/verify-email/);
}

export async function logoutViaUI(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click("text=/Logout/i");
  await page.waitForURL(/\//);
}

export async function createAndLoginUser(
  page: Page,
  role: "customer" | "admin" | "super_admin" | "dev" = "customer"
): Promise<TestUser> {
  const timestamp = Date.now();
  const user: TestUser = {
    email: `test-${role}-${timestamp}@test.com`,
    password: `TestPass${timestamp}!`,
    role,
  };

  const createdUser = await createUserWithProfile({
    email: user.email,
    password: user.password,
    role: user.role,
  });

  user.id = createdUser.id;

  await loginViaUI(page, user.email, user.password);

  return user;
}

export async function waitForToast(page: Page, text: string) {
  await page.waitForSelector(`[role="status"]:has-text("${text}")`);
}

export async function fillSixDigitCode(page: Page, selector: string, code: string) {
  const input = page.locator(selector);
  await input.fill(code);
}

export async function waitForLoadingToFinish(page: Page) {
  await page.waitForSelector('[data-loading="true"]', { state: "hidden" });
}

export function generateMockOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function interceptAPICall(
  page: Page,
  url: string,
  response: any
) {
  await page.route(url, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

export async function mockFailedAPICall(
  page: Page,
  url: string,
  error: string,
  status: number = 400
) {
  await page.route(url, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error }),
    });
  });
}