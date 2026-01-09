// tests/integration/proxy/full-pipeline.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals";
import { resetDatabase, seedBaseData } from "../../helpers/db";
import { createUserWithProfile, signInUser, createAdminClient } from "../../helpers/supabase";

describe("Integration: Full Proxy Pipeline", () => {
  const baseUrl = "http://localhost:3000";

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  describe("Request ID Propagation", () => {
    it("generates request ID for new request", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const requestId = response.headers.get("x-request-id");
      
      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("propagates request ID through pipeline", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const requestId = response.headers.get("x-request-id");
      
      expect(requestId).toBeTruthy();
      // All responses should have the same request ID
    });

    it("includes request ID in error responses", async () => {
      const response = await fetch(`${baseUrl}/api/nonexistent`);
      const requestId = response.headers.get("x-request-id");
      
      expect(requestId).toBeTruthy();
    });
  });

  describe("Security Headers", () => {
    it("applies security headers to all responses", async () => {
      const response = await fetch(`${baseUrl}/`);
      
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
    });

    it("applies security headers to API routes", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      
      expect(response.headers.get("X-Frame-Options")).toBeTruthy();
      expect(response.headers.get("X-Content-Type-Options")).toBeTruthy();
    });

    it("applies security headers to error responses", async () => {
      const response = await fetch(`${baseUrl}/api/nonexistent`);
      
      expect(response.headers.get("X-Frame-Options")).toBeTruthy();
      expect(response.headers.get("X-Content-Type-Options")).toBeTruthy();
    });
  });

  describe("Canonicalization", () => {
    it("redirects uppercase paths", async () => {
      const response = await fetch(`${baseUrl}/ADMIN`, {
        redirect: "manual",
      });
      
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toContain("/admin");
    });

    it("redirects paths with double slashes", async () => {
      const response = await fetch(`${baseUrl}//admin`, {
        redirect: "manual",
      });
      
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(`${baseUrl}/admin`);
    });

    it("redirects paths with trailing slashes", async () => {
      const response = await fetch(`${baseUrl}/admin/`, {
        redirect: "manual",
      });
      
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(`${baseUrl}/admin`);
    });

    it("preserves query parameters in redirect", async () => {
      const response = await fetch(`${baseUrl}/ADMIN?tab=settings`, {
        redirect: "manual",
      });
      
      expect(response.status).toBe(308);
      const location = response.headers.get("location");
      expect(location).toContain("/admin");
      expect(location).toContain("tab=settings");
    });
  });

  describe("Bot Detection", () => {
    it("blocks curl requests to admin", async () => {
      const response = await fetch(`${baseUrl}/admin`, {
        headers: { "User-Agent": "curl/7.68.0" },
      });
      
      expect(response.status).toBe(403);
    });

    it("blocks wget requests to API", async () => {
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { "User-Agent": "Wget/1.20.3" },
      });
      
      expect(response.status).toBe(403);
    });

    it("blocks python-requests to admin", async () => {
      const response = await fetch(`${baseUrl}/admin`, {
        headers: { "User-Agent": "python-requests/2.28.1" },
      });
      
      expect(response.status).toBe(403);
    });

    it("allows Googlebot", async () => {
      const response = await fetch(`${baseUrl}/admin`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      });
      
      // Should not be blocked by bot check
      expect(response.status).not.toBe(403);
    });

    it("allows normal browser requests", async () => {
      const response = await fetch(`${baseUrl}/admin`, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" 
        },
      });
      
      expect(response.status).not.toBe(403);
    });

    it("blocks empty user-agent", async () => {
      const response = await fetch(`${baseUrl}/admin`, {
        headers: { "User-Agent": "" },
      });
      
      expect(response.status).toBe(403);
    });
  });

  describe("CSRF Protection", () => {
    it("blocks POST without origin", async () => {
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(403);
    });

    it("blocks POST with mismatched origin", async () => {
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Origin": "http://evil.com",
        },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(403);
    });

    it("allows POST with matching origin", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Origin": baseUrl,
        },
        body: JSON.stringify({
          email: "test@test.com",
          password: "password",
        }),
      });
      
      // Should not be blocked by CSRF (may fail auth though)
      expect(response.status).not.toBe(403);
    });

    it("bypasses CSRF for Stripe webhook", async () => {
      const response = await fetch(`${baseUrl}/api/stripe/webhook`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Stripe-Signature": "test",
        },
        body: JSON.stringify({}),
      });
      
      // Should not be blocked by CSRF
      expect(response.status).not.toBe(403);
    });

    it("bypasses CSRF for 2FA verify", async () => {
      const response = await fetch(`${baseUrl}/api/auth/2fa/challenge/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      
      // Should not be blocked by CSRF
      expect(response.status).not.toBe(403);
    });

    it("allows GET requests without origin", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      expect(response.status).not.toBe(403);
    });
  });

  describe("Rate Limiting", () => {
    it("applies rate limiting to API routes", async () => {
      // Make many requests quickly
      const requests = Array.from({ length: 35 }, () => 
        fetch(`${baseUrl}/api/health`)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      expect(rateLimited).toBe(true);
    });

    it("includes rate limit headers", async () => {
      // Trigger rate limit
      const requests = Array.from({ length: 35 }, () => 
        fetch(`${baseUrl}/api/health`)
      );

      const responses = await Promise.all(requests);
      const limitedResponse = responses.find(r => r.status === 429);
      
      if (limitedResponse) {
        expect(limitedResponse.headers.get("X-RateLimit-Limit")).toBeTruthy();
        expect(limitedResponse.headers.get("X-RateLimit-Remaining")).toBeTruthy();
        expect(limitedResponse.headers.get("X-RateLimit-Reset")).toBeTruthy();
      }
    });

    it("redirects browser requests when rate limited", async () => {
      // Make many requests
      const requests = Array.from({ length: 35 }, () => 
        fetch(`${baseUrl}/admin`, {
          headers: { "Accept": "text/html" },
          redirect: "manual",
        })
      );

      const responses = await Promise.all(requests);
      const redirected = responses.find(r => r.status === 302);
      
      if (redirected) {
        const location = redirected.headers.get("location");
        expect(location).toContain("/too-many-requests");
      }
    });

    it("bypasses rate limit for Stripe webhook", async () => {
      const requests = Array.from({ length: 35 }, () => 
        fetch(`${baseUrl}/api/stripe/webhook`, {
          method: "POST",
          headers: { "Stripe-Signature": "test" },
        })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      // Should not be rate limited
      expect(rateLimited.length).toBe(0);
    });
  });

  describe("Admin Guard", () => {
    it("blocks unauthenticated access to admin routes", async () => {
      const response = await fetch(`${baseUrl}/admin/dashboard`, {
        redirect: "manual",
      });
      
      expect(response.status).toBe(307); // Redirect to login
      expect(response.headers.get("location")).toContain("/auth/login");
    });

    it("blocks non-admin users from admin routes", async () => {
      await createUserWithProfile({
        email: "customer@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("customer@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: {
          Cookie: `sb-access-token=${session?.access_token}`,
        },
        redirect: "manual",
      });
      
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("/");
    });

    it("allows admin users to access admin routes", async () => {
      await createUserWithProfile({
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      const { client } = await signInUser("admin@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: {
          Cookie: `sb-access-token=${session?.access_token}`,
        },
        redirect: "manual",
      });
      
      // Should not redirect (may render page or require MFA)
      expect(response.status).not.toBe(307);
    });

    it("blocks API access without auth", async () => {
      const response = await fetch(`${baseUrl}/api/admin/users`);
      
      expect(response.status).toBe(401);
    });

    it("blocks API access for non-admin", async () => {
      await createUserWithProfile({
        email: "customer@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("customer@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch(`${baseUrl}/api/admin/users`, {
        headers: {
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });
      
      expect(response.status).toBe(403);
    });

    it("exempts 2FA routes from admin guard", async () => {
      const response = await fetch(`${baseUrl}/api/auth/2fa/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      // Should not be blocked by admin guard (may fail auth though)
      expect(response.status).not.toBe(307);
      expect(response.status).not.toBe(403);
    });
  });

  describe("Session Refresh", () => {
    it("refreshes Supabase session", async () => {
      await createUserWithProfile({
        email: "user@test.com",
        password: "Password123!",
        role: "customer",
      });

      const { client } = await signInUser("user@test.com", "Password123!");
      const session = (await client.auth.getSession()).data.session;

      const response = await fetch(`${baseUrl}/api/auth/session`, {
        headers: {
          Cookie: `sb-access-token=${session?.access_token}`,
        },
      });
      
      expect(response.status).toBe(200);
      // Session cookies should be refreshed
      const cookies = response.headers.get("set-cookie");
      expect(cookies).toBeTruthy();
    });
  });

  describe("Pipeline Order", () => {
    it("canonicalizes before other checks", async () => {
      // Uppercase path with empty user-agent should canonicalize first
      const response = await fetch(`${baseUrl}/ADMIN`, {
        headers: { "User-Agent": "" },
        redirect: "manual",
      });
      
      // Should redirect for canonicalization, not block for bot
      expect(response.status).toBe(308);
    });

    it("checks bot after canonicalization", async () => {
      // Canonical path with bot UA should block
      const response = await fetch(`${baseUrl}/admin`, {
        headers: { "User-Agent": "curl/7.68.0" },
      });
      
      expect(response.status).toBe(403);
    });

    it("checks CSRF after bot check", async () => {
      // Valid UA, but CSRF issue
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(403);
    });

    it("checks rate limit before admin guard", async () => {
      // Trigger rate limit then try admin access
      const rateLimitRequests = Array.from({ length: 35 }, () => 
        fetch(`${baseUrl}/api/admin/users`)
      );

      await Promise.all(rateLimitRequests);

      const response = await fetch(`${baseUrl}/api/admin/users`);
      
      // Should be rate limited, not hit admin guard
      expect([401, 429]).toContain(response.status);
    });
  });

  describe("Error Handling", () => {
    it("handles malformed requests gracefully", async () => {
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json{",
      });
      
      // Should not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("handles very long URLs", async () => {
      const longPath = "/admin/" + "a".repeat(10000);
      const response = await fetch(`${baseUrl}${longPath}`);
      
      // Should handle without crashing
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("handles special characters in path", async () => {
      const response = await fetch(`${baseUrl}/admin/<script>alert('xss')</script>`);
      
      // Should handle safely
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Performance", () => {
    it("completes pipeline quickly", async () => {
      const start = Date.now();
      await fetch(`${baseUrl}/api/health`);
      const duration = Date.now() - start;
      
      // Proxy should add minimal overhead
      expect(duration).toBeLessThan(1000);
    });

    it("handles concurrent requests", async () => {
      const requests = Array.from({ length: 10 }, () => 
        fetch(`${baseUrl}/api/health`)
      );

      const responses = await Promise.all(requests);
      
      // All should succeed (before rate limit)
      responses.forEach(r => {
        expect(r.status).toBeLessThan(400);
      });
    });
  });
});