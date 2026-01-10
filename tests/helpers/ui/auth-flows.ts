// tests/helpers/ui/auth-flows.ts
import type { Page } from "@playwright/test";
import { createUserWithProfile } from "../supabase/clients";

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

export async function registerViaUI(page: Page, email: string, password: string) {
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
  role: TestUser["role"] = "customer"
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

export async function waitForLoadingToFinish(page: Page) {
  await page.waitForSelector('[data-loading="true"]', { state: "hidden" });
}

export async function mockApiJson(
  page: Page,
  path: string,
  status: number,
  body: any
) {
  await page.route(`**${path}`, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
