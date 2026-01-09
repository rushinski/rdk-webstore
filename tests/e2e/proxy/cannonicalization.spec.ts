// tests/e2e/proxy/cannonicalization.spec.ts
import { test, expect } from "@playwright/test";

test.describe("E2E: URL Canonicalization", () => {
  test("redirects uppercase URL to lowercase", async ({ page }) => {
    const response = await page.goto("/ADMIN", { waitUntil: "commit" });
    
    // Should redirect
    expect(page.url()).toContain("/admin");
    expect(page.url()).not.toContain("/ADMIN");
  });

  test("redirects double slashes", async ({ page }) => {
    const response = await page.goto("//admin//dashboard", { waitUntil: "commit" });
    
    expect(page.url()).toContain("/admin/dashboard");
    expect(page.url()).not.toContain("//");
  });

  test("removes trailing slash", async ({ page }) => {
    const response = await page.goto("/products/", { waitUntil: "commit" });
    
    expect(page.url()).toMatch(/\/products$/);
    expect(page.url()).not.toMatch(/\/products\/$/);
  });

  test("preserves query parameters during redirect", async ({ page }) => {
    await page.goto("/ADMIN?tab=settings", { waitUntil: "commit" });
    
    expect(page.url()).toContain("/admin");
    expect(page.url()).toContain("tab=settings");
  });

  test("preserves hash fragment during redirect", async ({ page }) => {
    await page.goto("/ADMIN#section", { waitUntil: "commit" });
    
    expect(page.url()).toContain("/admin");
    expect(page.url()).toContain("#section");
  });

  test("handles multiple canonicalization issues", async ({ page }) => {
    await page.goto("//ADMIN//Dashboard///", { waitUntil: "commit" });
    
    expect(page.url()).toContain("/admin/dashboard");
    expect(page.url()).not.toContain("//");
    expect(page.url()).not.toMatch(/\/$/);
  });

  test("does not redirect canonical URLs", async ({ page }) => {
    const response = await page.goto("/admin/dashboard", { waitUntil: "commit" });
    
    // Should not redirect
    expect(response?.request().redirectedFrom()).toBeNull();
  });
});
