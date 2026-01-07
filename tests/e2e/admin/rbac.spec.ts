import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../utils/state";
import { createUserWithProfile } from "../../helpers/supabase";
import { openAdminMenuIfNeeded } from "./helpers";

test.describe("Admin role UI gating", () => {
  test.beforeEach(async () => {
    const base = await resetAndSeedForE2E();
    await createUserWithProfile({
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
      tenantId: base.tenantId,
    });
    await createUserWithProfile({
      email: "super@test.com",
      password: "Password123!",
      role: "super_admin",
      tenantId: base.tenantId,
    });
  });

  test("admin cannot see bank link", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "admin@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/admin/);
    await openAdminMenuIfNeeded(page);
    await expect(page.locator('[data-testid="admin-nav-bank"]')).toHaveCount(0);
  });

  test("super_admin can see bank link", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "super@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/admin/);
    await openAdminMenuIfNeeded(page);
    const bankLink = page.locator('[data-testid="admin-nav-bank"]');
    await bankLink.scrollIntoViewIfNeeded();
    await expect(bankLink).toBeVisible();
  });
});
