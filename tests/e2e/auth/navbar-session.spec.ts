import { test, expect } from "@playwright/test";

test.describe("Navbar session loading", () => {
  test("shows loading skeleton before session resolves @smoke", async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(
      Boolean(viewport && viewport.width < 768),
      "Auth buttons are hidden behind the mobile menu."
    );

    await page.route("/api/auth/session", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: null }),
      });
    });

    await page.goto("/");
    await expect(page.locator('[data-testid="navbar-auth-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="navbar-login"]')).toBeVisible();
  });
});
