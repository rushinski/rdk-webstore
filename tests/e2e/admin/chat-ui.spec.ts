import { test, expect } from "@playwright/test";
import { resetAndSeedForLocal } from "../utils/state";
import { createUserWithProfile, createAdminClient } from "../../helpers/supabase";

test.describe("Admin chat UI", () => {
  test("renders messages and textbox correctly", async ({ page }) => {
    test.skip(process.env.E2E_MODE === "vercel", "local-only auth seeding");

    const base = await resetAndSeedForLocal();
    if (!base) return;

    const adminUser = await createUserWithProfile({
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
      tenantId: base.tenantId,
    });
    const customer = await createUserWithProfile({
      email: "customer@test.com",
      password: "Password123!",
      role: "customer",
      tenantId: base.tenantId,
    });

    const admin = createAdminClient();
    const { data: chat } = await admin
      .from("chats")
      .insert({
        user_id: customer.id,
        status: "open",
        source: "manual",
      })
      .select("id")
      .single();

    await admin.from("chat_messages").insert({
      chat_id: chat?.id,
      sender_id: customer.id,
      sender_role: "customer",
      body: "New Message - Customer : " + "Long message ".repeat(10),
    });

    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "admin@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/admin/);

    await page.goto("/admin/chats");
    await expect(page.locator('[data-testid="chat-message"]')).toBeVisible();
    const input = page.locator('[data-testid="chat-message-input"]');
    await expect(input).toBeVisible();
    await expect(input.evaluate((el) => el.tagName)).resolves.toBe("TEXTAREA");
  });
});
