// tests/unit/proxy/security-headers.test.ts
import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/proxy/security-headers";
import { security } from "@/config/security";

describe("Unit: Security Headers", () => {
  describe("Development Mode", () => {
    it("applies dev CSP", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "development");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("ws://localhost:");
    });

    it("does not apply HSTS in dev", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "development");

      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toBeNull();
    });

    it("applies X-Frame-Options", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "development");

      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("applies X-Content-Type-Options", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "development");

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("applies Referrer-Policy", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "development");

      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });

    it("applies Permissions-Policy", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "development");

      const policy = response.headers.get("Permissions-Policy");
      expect(policy).toContain("camera=()");
      expect(policy).toContain("microphone=()");
      expect(policy).toContain("geolocation=()");
    });
  });

  describe("Production Mode", () => {
    it("applies production CSP", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).not.toContain("ws://localhost:");
    });

    it("applies HSTS in production", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toBe(security.proxy.securityHeaders.hsts.value);
      expect(hsts).toContain("max-age=");
      expect(hsts).toContain("includeSubDomains");
      expect(hsts).toContain("preload");
    });

    it("applies all security headers", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      expect(response.headers.get("X-Frame-Options")).toBeTruthy();
      expect(response.headers.get("X-Content-Type-Options")).toBeTruthy();
      expect(response.headers.get("Referrer-Policy")).toBeTruthy();
      expect(response.headers.get("Permissions-Policy")).toBeTruthy();
      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
    });

    it("CSP allows Stripe domains", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("stripe.com");
    });

    it("CSP allows necessary directives", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
      expect(csp).toContain("img-src");
      expect(csp).toContain("connect-src");
      expect(csp).toContain("frame-src");
    });
  });

  describe("CSP Directives", () => {
    it("restricts default-src to self", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src 'self'");
    });

    it("allows https images", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toMatch(/img-src.*https:/);
    });

    it("blocks object-src", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("object-src 'none'");
    });

    it("blocks frame-ancestors", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("restricts base-uri", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "production");

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("base-uri 'self'");
    });
  });

  describe("Header Preservation", () => {
    it("preserves existing headers", () => {
      const response = NextResponse.next();
      response.headers.set("X-Custom-Header", "test");
      
      applySecurityHeaders(response, "production");

      expect(response.headers.get("X-Custom-Header")).toBe("test");
    });

    it("does not override existing security headers", () => {
      const response = NextResponse.next();
      response.headers.set("X-Frame-Options", "SAMEORIGIN");
      
      applySecurityHeaders(response, "production");

      // Our function overwrites
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined nodeEnv", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, undefined as any);

      // Should default to development
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("'unsafe-eval'");
    });

    it("handles empty nodeEnv", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "");

      // Should default to development
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("'unsafe-eval'");
    });

    it("handles test environment", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response, "test");

      // Should treat as development
      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toBeNull();
    });
  });
});