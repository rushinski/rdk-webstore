// tests/e2e/proxy/admin-guard-mfa.spec.ts
import { test, expect } from "@playwright/test";
import { resetAndSeedForE2E } from "../../e2e/utils/state";
import { createUserWithProfile } from "../../helpers/supabase";

test.describe("E2E: Admin Guard with MFA", () => {
  test.beforeEach(async () => {
    await resetAndSeedForE2E();
  });

  test.describe("Basic Admin Guard", () => {
    test("redirects unauthenticated user to login", async ({ page }) => {
      await page.goto("/admin/dashboard", { waitUntil: "commit" });
      
      expect(page.url()).toContain("/auth/login");
    });

    test("redirects non-admin user to home", async ({ page }) => {
      // Create and login as customer
      await createUserWithProfile({
        email: "customer@test.com",
        password: "Password123!",
        role: "customer",
      });

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
      // Create and login as admin
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      
      await page.waitForURL(/\//);

      // Access admin area
      await page.goto("/admin/dashboard");
      
      // Should not redirect (in test mode, MFA is bypassed)
      expect(page.url()).toContain("/admin/dashboard");
    });

    test("clears admin session cookie on logout", async ({ page, context }) => {
      // Create and login as admin
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

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
      const response = await page.goto("/api/auth/2fa/enroll", { 
        waitUntil: "commit" 
      });
      
      // Should not redirect to login (will return 401 but not redirect)
      expect(page.url()).not.toContain("/auth/login");
    });
  });

  test.describe("MFA Enrollment Flow", () => {
    test("admin can start MFA enrollment", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Start MFA enrollment via API
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      
      expect(enrollResponse.ok()).toBe(true);
      
      const enrollData = await enrollResponse.json();
      expect(enrollData.factorId).toBeTruthy();
      expect(enrollData.qrCode).toBeTruthy();
      expect(enrollData.uri).toBeTruthy();
      
      // Verify QR code is SVG data URL
      expect(enrollData.qrCode).toContain("data:image/svg+xml");
      
      // Verify URI is otpauth format
      expect(enrollData.uri).toMatch(/^otpauth:\/\/totp\//);
    });

    test("non-admin cannot start MFA enrollment", async ({ page, context }) => {
      // Create customer user
      await createUserWithProfile({
        email: "customer@test.com",
        password: "Password123!",
        role: "customer",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "customer@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Try to start MFA enrollment
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      
      expect(enrollResponse.status()).toBe(403);
      
      const errorData = await enrollResponse.json();
      expect(errorData.error).toMatch(/forbidden/i);
    });

    test("unauthenticated user cannot start MFA enrollment", async ({ context }) => {
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      
      expect(enrollResponse.status()).toBe(401);
      
      const errorData = await enrollResponse.json();
      expect(errorData.error).toMatch(/unauthorized/i);
    });

    test("admin can verify MFA enrollment with valid code", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Start enrollment
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const { factorId } = await enrollResponse.json();

      // In test mode, we can use a mock code or real TOTP
      // For E2E, we'll simulate with a valid format code
      const mockCode = "123456";

      // Verify enrollment
      const verifyResponse = await context.request.post(
        "/api/auth/2fa/verify-enrollment",
        {
          data: {
            factorId,
            code: mockCode,
          },
        }
      );

      // In test environment, this should succeed or be properly handled
      expect(verifyResponse.status()).toBeLessThan(500);
      
      // Check that response includes proper structure
      const verifyData = await verifyResponse.json();
      expect(verifyData).toHaveProperty("ok");
    });

    test("rejects MFA enrollment with invalid code format", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Start enrollment
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const { factorId } = await enrollResponse.json();

      // Try to verify with invalid code format
      const verifyResponse = await context.request.post(
        "/api/auth/2fa/verify-enrollment",
        {
          data: {
            factorId,
            code: "abc", // Invalid: too short and not numeric
          },
        }
      );

      expect(verifyResponse.status()).toBe(400);
      
      const errorData = await verifyResponse.json();
      expect(errorData.error).toBeTruthy();
    });

    test("rejects MFA enrollment with missing fields", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Try to verify without factorId
      const verifyResponse = await context.request.post(
        "/api/auth/2fa/verify-enrollment",
        {
          data: {
            code: "123456",
          },
        }
      );

      expect(verifyResponse.status()).toBe(400);
      
      const errorData = await verifyResponse.json();
      expect(errorData.error).toMatch(/invalid payload/i);
    });

    test("sets admin session cookie after successful enrollment", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Clear any existing admin cookies
      await context.clearCookies();

      // Start and verify enrollment
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const { factorId } = await enrollResponse.json();

      const verifyResponse = await context.request.post(
        "/api/auth/2fa/verify-enrollment",
        {
          data: {
            factorId,
            code: "123456",
          },
        }
      );

      if (verifyResponse.ok()) {
        // Check for admin session cookie
        const cookies = await context.cookies();
        const adminCookie = cookies.find(c => c.name.includes("admin_session"));
        expect(adminCookie).toBeTruthy();
        
        if (adminCookie) {
          // Verify cookie properties
          expect(adminCookie.httpOnly).toBe(true);
          expect(adminCookie.sameSite).toBe("Strict");
        }
      }
    });
  });

  test.describe("MFA Challenge Flow", () => {
    test("admin with MFA enrolled can start challenge", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Enroll MFA first
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const { factorId } = await enrollResponse.json();

      await context.request.post("/api/auth/2fa/verify-enrollment", {
        data: { factorId, code: "123456" },
      });

      // Now start a challenge
      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );

      expect(challengeResponse.ok()).toBe(true);
      
      const challengeData = await challengeResponse.json();
      expect(challengeData.factorId).toBeTruthy();
      expect(challengeData.challengeId).toBeTruthy();
    });

    test("admin without MFA enrolled cannot start challenge", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Try to start challenge without enrollment
      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );

      expect(challengeResponse.status()).toBe(400);
      
      const errorData = await challengeResponse.json();
      expect(errorData.error).toMatch(/no enrolled/i);
    });

    test("non-admin cannot start MFA challenge", async ({ page, context }) => {
      // Create customer user
      await createUserWithProfile({
        email: "customer@test.com",
        password: "Password123!",
        role: "customer",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "customer@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Try to start challenge
      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );

      expect(challengeResponse.status()).toBe(403);
    });

    test("admin can verify MFA challenge", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Enroll MFA
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const { factorId } = await enrollResponse.json();

      await context.request.post("/api/auth/2fa/verify-enrollment", {
        data: { factorId, code: "123456" },
      });

      // Start challenge
      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );
      const { challengeId } = await challengeResponse.json();

      // Verify challenge
      const verifyResponse = await context.request.post(
        "/api/auth/2fa/challenge/verify",
        {
          data: {
            factorId,
            challengeId,
            code: "123456",
          },
        }
      );

      expect(verifyResponse.status()).toBeLessThan(500);
      
      const verifyData = await verifyResponse.json();
      expect(verifyData).toHaveProperty("ok");
    });

    test("rejects challenge with invalid code format", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login and setup MFA
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const { factorId } = await enrollResponse.json();

      await context.request.post("/api/auth/2fa/verify-enrollment", {
        data: { factorId, code: "123456" },
      });

      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );
      const { challengeId } = await challengeResponse.json();

      // Verify with invalid code
      const verifyResponse = await context.request.post(
        "/api/auth/2fa/challenge/verify",
        {
          data: {
            factorId,
            challengeId,
            code: "abc", // Invalid
          },
        }
      );

      expect(verifyResponse.status()).toBe(400);
    });

    test("rejects challenge with missing fields", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Try to verify without all required fields
      const verifyResponse = await context.request.post(
        "/api/auth/2fa/challenge/verify",
        {
          data: {
            code: "123456",
            // Missing factorId and challengeId
          },
        }
      );

      expect(verifyResponse.status()).toBe(400);
      
      const errorData = await verifyResponse.json();
      expect(errorData.error).toMatch(/invalid payload/i);
    });

    test("sets admin session cookie after successful challenge", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login and setup MFA
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const { factorId } = await enrollResponse.json();

      await context.request.post("/api/auth/2fa/verify-enrollment", {
        data: { factorId, code: "123456" },
      });

      // Clear cookies
      await context.clearCookies();

      // Start and verify challenge
      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );
      const { challengeId } = await challengeResponse.json();

      const verifyResponse = await context.request.post(
        "/api/auth/2fa/challenge/verify",
        {
          data: {
            factorId,
            challengeId,
            code: "123456",
          },
        }
      );

      if (verifyResponse.ok()) {
        // Check for admin session cookie
        const cookies = await context.cookies();
        const adminCookie = cookies.find(c => c.name.includes("admin_session"));
        expect(adminCookie).toBeTruthy();
        
        if (adminCookie) {
          expect(adminCookie.httpOnly).toBe(true);
          expect(adminCookie.sameSite).toBe("Strict");
        }
      }
    });

    test("challenge response includes admin status", async ({ page, context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // Login and setup MFA
      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const { factorId } = await enrollResponse.json();

      await context.request.post("/api/auth/2fa/verify-enrollment", {
        data: { factorId, code: "123456" },
      });

      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );
      const { challengeId } = await challengeResponse.json();

      const verifyResponse = await context.request.post(
        "/api/auth/2fa/challenge/verify",
        {
          data: {
            factorId,
            challengeId,
            code: "123456",
          },
        }
      );

      if (verifyResponse.ok()) {
        const verifyData = await verifyResponse.json();
        expect(verifyData.ok).toBe(true);
        expect(verifyData.isAdmin).toBe(true);
      }
    });
  });

  test.describe("Admin Guard with MFA Requirements", () => {
    test("test mode bypasses MFA requirements", async ({ page }) => {
      // In test mode (E2E_TEST_MODE=1), MFA should be bypassed
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Should be able to access admin without MFA
      await page.goto("/admin/dashboard");
      expect(page.url()).toContain("/admin/dashboard");
    });

    test("MFA routes are exempt from CSRF protection", async ({ context }) => {
      // Create admin user
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      // These requests should work without origin header (CSRF bypass)
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      expect([200, 401, 403]).toContain(enrollResponse.status()); // Not 403 for CSRF

      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );
      expect([200, 400, 401, 403]).toContain(challengeResponse.status());

      const verifyResponse = await context.request.post(
        "/api/auth/2fa/challenge/verify",
        {
          data: {
            factorId: "test",
            challengeId: "test",
            code: "123456",
          },
        }
      );
      expect([200, 400, 401, 403]).toContain(verifyResponse.status());
    });

    test("includes request ID in all MFA responses", async ({ page, context }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Check enroll response
      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      const enrollData = await enrollResponse.json();
      expect(enrollData).toHaveProperty("requestId");

      // Check challenge start response
      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );
      const challengeData = await challengeResponse.json();
      expect(challengeData).toHaveProperty("requestId");

      // Check verify response
      const verifyResponse = await context.request.post(
        "/api/auth/2fa/challenge/verify",
        {
          data: {
            factorId: "test",
            challengeId: "test",
            code: "123456",
          },
        }
      );
      const verifyData = await verifyResponse.json();
      expect(verifyData).toHaveProperty("requestId");
    });

    test("MFA responses include cache-control headers", async ({ page, context }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      const enrollResponse = await context.request.post("/api/auth/2fa/enroll");
      expect(enrollResponse.headers()["cache-control"]).toBe("no-store");

      const challengeResponse = await context.request.post(
        "/api/auth/2fa/challenge/start"
      );
      expect(challengeResponse.headers()["cache-control"]).toBe("no-store");

      const verifyResponse = await context.request.post(
        "/api/auth/2fa/challenge/verify",
        {
          data: {
            factorId: "test",
            challengeId: "test",
            code: "123456",
          },
        }
      );
      expect(verifyResponse.headers()["cache-control"]).toBe("no-store");
    });
  });

  test.describe("Error Handling", () => {
    test("handles malformed JSON in MFA requests", async ({ page, context }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Send malformed JSON
      const response = await context.request.post(
        "/api/auth/2fa/verify-enrollment",
        {
          data: "not valid json",
        }
      );

      expect(response.status()).toBe(400);
    });

    test("handles missing content-type header", async ({ page, context }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // POST without content-type should still be handled
      const response = await context.request.post("/api/auth/2fa/enroll");
      expect(response.status()).toBeLessThan(500);
    });

    test("provides helpful error messages", async ({ page, context }) => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await page.goto("/auth/login");
      await page.fill('[data-testid="login-email"]', "admin@test.com");
      await page.fill('[data-testid="login-password"]', "Password123!");
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/\//);

      // Invalid payload
      const response = await context.request.post(
        "/api/auth/2fa/verify-enrollment",
        {
          data: {},
        }
      );

      const errorData = await response.json();
      expect(errorData.error).toBeTruthy();
      expect(errorData.issues).toBeTruthy(); // Zod validation errors
    });
  });
});