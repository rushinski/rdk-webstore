// tests/unit/proxy/csrf.test.ts
import { describe, it, expect } from "@jest/globals";
import { NextRequest } from "next/server";
import { checkCsrf } from "@/proxy/csrf";
import { security } from "@/config/security";

describe("Unit: CSRF Protection", () => {
  const requestId = "test-request-id";
  const baseUrl = "http://localhost:3000";
  const host = "localhost:3000";

  describe("Safe Methods", () => {
    it("allows GET request", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "GET",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("allows HEAD request", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "HEAD",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("allows OPTIONS request", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "OPTIONS",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });
  });

  describe("Unsafe Methods - POST", () => {
    it("blocks POST without origin header", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(security.proxy.csrf.blockStatus);
    });

    it("blocks POST with null origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "null" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("allows POST with matching origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("blocks POST with mismatched origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "http://evil.com" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks POST with subdomain origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "http://sub.localhost:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks POST with different port", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "http://localhost:3001" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks POST with different protocol", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "https://localhost:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });
  });

  describe("Unsafe Methods - PUT", () => {
    it("blocks PUT without origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "PUT",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("allows PUT with matching origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "PUT",
        headers: { host, origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("blocks PUT with mismatched origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "PUT",
        headers: { host, origin: "http://evil.com" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });
  });

  describe("Unsafe Methods - PATCH", () => {
    it("blocks PATCH without origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "PATCH",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("allows PATCH with matching origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "PATCH",
        headers: { host, origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("blocks PATCH with mismatched origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "PATCH",
        headers: { host, origin: "http://evil.com" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });
  });

  describe("Unsafe Methods - DELETE", () => {
    it("blocks DELETE without origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "DELETE",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("allows DELETE with matching origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "DELETE",
        headers: { host, origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("blocks DELETE with mismatched origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "DELETE",
        headers: { host, origin: "http://evil.com" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });
  });

  describe("Bypass Prefixes", () => {
    it("bypasses check for Stripe webhook", () => {
      const request = new NextRequest(`${baseUrl}/api/stripe/webhook`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("bypasses check for 2FA challenge verify", () => {
      const request = new NextRequest(`${baseUrl}/api/auth/2fa/challenge/verify`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("does not bypass similar but different path", () => {
      const request = new NextRequest(`${baseUrl}/api/stripe/webhook-other`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("does not bypass substring match", () => {
      const request = new NextRequest(`${baseUrl}/api/mystripe/webhook`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });
  });

  describe("Origin Parsing", () => {
    it("handles origin with trailing slash", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: `${baseUrl}/` },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("handles origin with path", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: `${baseUrl}/admin` },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("handles origin with query params", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: `${baseUrl}?param=value` },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("blocks malformed origin URL", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "not-a-valid-url" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks origin with invalid scheme", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "javascript://localhost:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("handles IPv4 address in origin", () => {
      const request = new NextRequest("http://127.0.0.1:3000/api/data", {
        method: "POST",
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("handles IPv6 address in origin", () => {
      const request = new NextRequest("http://[::1]:3000/api/data", {
        method: "POST",
        headers: { host: "[::1]:3000", origin: "http://[::1]:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });
  });

  describe("Case Sensitivity", () => {
    it("handles uppercase origin scheme", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "HTTP://localhost:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("handles uppercase origin host", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "http://LOCALHOST:3000" },
      });

      const result = checkCsrf(request, requestId);
      // Origin host comparison should be case-insensitive
      expect(result).toBeNull();
    });

    it("handles mixed case method", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "PoSt" as any,
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });
  });

  describe("Response Structure", () => {
    it("includes request ID in error response", async () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      const json = await result?.json();
      expect(json.requestId).toBe(requestId);
    });

    it("includes error message in response", async () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      const json = await result?.json();
      expect(json.error).toBeTruthy();
    });

    it("returns correct HTTP status", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result?.status).toBe(security.proxy.csrf.blockStatus);
    });

    it("returns JSON response", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host },
      });

      const result = checkCsrf(request, requestId);
      expect(result?.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("Edge Cases", () => {
    it("handles missing host header", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      // Should use nextUrl.host as fallback
      expect(result).toBeNull();
    });

    it("handles empty origin header", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("handles whitespace in origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "  http://localhost:3000  " },
      });

      const result = checkCsrf(request, requestId);
      // Should not be trimmed by checkCsrf itself
      expect(result).not.toBeNull();
    });

    it("handles origin with username/password", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "http://user:pass@localhost:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull(); // Different host format
    });

    it("handles very long origin", () => {
      const longOrigin = "http://" + "a".repeat(1000) + ".com";
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: longOrigin },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("handles unicode in origin", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "http://你好.com" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("handles IDN (internationalized domain names)", () => {
      const request = new NextRequest(`${baseUrl}/api/data`, {
        method: "POST",
        headers: { host, origin: "http://münchen.de" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });
  });

  describe("Attack Scenarios", () => {
    it("blocks cross-site POST from evil.com", () => {
      const request = new NextRequest(`${baseUrl}/api/admin/delete-user`, {
        method: "POST",
        headers: { host, origin: "http://evil.com" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks subdomain takeover attempt", () => {
      const request = new NextRequest(`${baseUrl}/api/admin/delete-user`, {
        method: "POST",
        headers: { host, origin: "http://attacker.localhost:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks port confusion attack", () => {
      const request = new NextRequest("http://localhost:3000/api/admin/delete-user", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost:3001" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks protocol downgrade attack", () => {
      const request = new NextRequest("https://localhost:3000/api/admin/delete-user", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks null origin attack", () => {
      const request = new NextRequest(`${baseUrl}/api/admin/delete-user`, {
        method: "POST",
        headers: { host, origin: "null" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });

    it("blocks origin spoofing with similar domain", () => {
      const request = new NextRequest("http://localhost:3000/api/admin/delete-user", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost.evil.com:3000" },
      });

      const result = checkCsrf(request, requestId);
      expect(result).not.toBeNull();
    });
  });

  describe("Legitimate Requests", () => {
    it("allows legitimate form submission", () => {
      const request = new NextRequest(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { host, origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("allows legitimate API update", () => {
      const request = new NextRequest(`${baseUrl}/api/products/123`, {
        method: "PUT",
        headers: { host, origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("allows legitimate API deletion", () => {
      const request = new NextRequest(`${baseUrl}/api/products/123`, {
        method: "DELETE",
        headers: { host, origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });

    it("allows legitimate partial update", () => {
      const request = new NextRequest(`${baseUrl}/api/products/123`, {
        method: "PATCH",
        headers: { host, origin: baseUrl },
      });

      const result = checkCsrf(request, requestId);
      expect(result).toBeNull();
    });
  });
});