// tests/e2e/proxy/admin-guard.spec.ts
import { test, expect } from "@playwright/test";

test.describe("E2E: Admin Guard", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/admin/dashboard", { waitUntil: "commit" });
    
    // Should redirect to login
    expect(page.url()).toContain("/auth/login");
  });

  test("redirects non-admin user to home", async ({ page }) => {
    // Login as customer
    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "customer@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL(/\//);

    // Try to access admin
    await page.goto("/admin/dashboard", { waitUntil: "commit" });
    
    // Should redirect to home
    expect(page.url()).toBe(new URL("/", page.url()).href);
  });

  test("allows admin user to access admin area", async ({ page }) => {
    // Login as admin
    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "admin@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL(/\//);

    // Access admin area
    await page.goto("/admin/dashboard");
    
    // Should not redirect
    expect(page.url()).toContain("/admin/dashboard");
  });

  test("clears admin session cookie on logout", async ({ page, context }) => {
    // Login as admin
    await page.goto("/auth/login");
    await page.fill('[data-testid="login-email"]', "admin@test.com");
    await page.fill('[data-testid="login-password"]', "Password123!");
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL(/\//);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click("text=/logout/i");

    // Check cookies
    const cookies = await context.cookies();
    const adminCookie = cookies.find(c => c.name.includes("admin"));
    expect(adminCookie).toBeFalsy();
  });

  test("exempts 2FA routes from admin guard", async ({ page }) => {
    await page.goto("/api/auth/2fa/enroll", { waitUntil: "commit" });
    
    // Should not redirect to login
    expect(page.url()).not.toContain("/auth/login");
  });
});
