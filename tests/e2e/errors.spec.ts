import { test, expect } from "@playwright/test";

test.describe("Error pages", () => {
  test("renders 404 page @smoke", async ({ page }) => {
    await page.goto("/does-not-exist");
    await expect(page.getByText("This page is out of stock")).toBeVisible();
  });

  test("renders store error boundary on 500", async ({ page }) => {
    await page.route("/api/store/products**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Fail" }),
      });
    });

    await page.goto("/store");
    await expect(page.getByText("Something went wrong")).toBeVisible();
  });
});
