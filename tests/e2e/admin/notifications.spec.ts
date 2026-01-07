import { test, expect } from "@playwright/test";
import { resetAndSeedForLocal } from "../utils/state";
import { createUserWithProfile, createAdminClient } from "../../helpers/supabase";

test.describe("Admin notifications UI", () => {
  test("renders long message without breaking layout", async ({ page }) => {
    test.skip(process.env.E2E_MODE === "vercel", "local-only auth seeding");

    const base = await resetAndSeedForLocal();
    if (!base) return;

    const adminUser = await createUserWithProfile({
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
      tenantId: base.tenantId,
    });

    const admin = createAdminClient();
    await admin.from("admin_notifications").insert({
      admin_id: adminUser.id,
      type: "chat_message",
      message:
        "New Message - Test User : " +
        "This is a very long message intended to verify wrapping and layout stability. ".repeat(4),
    });

    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "admin@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/admin/);

    await page.click('[data-testid="admin-notifications-toggle"]');
    const item = page.locator('[data-testid="admin-notification-item"]').first();
    await expect(item).toContainText("New Message -");
  });
});
