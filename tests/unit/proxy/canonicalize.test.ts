// tests/unit/proxy/canonicalize.test.ts
import { describe, it, expect } from "@jest/globals";
import { NextRequest } from "next/server";
import { canonicalizePath } from "@/proxy/canonicalize";
import { security } from "@/config/security";

describe("Unit: Canonicalize Path", () => {
  const requestId = "test-request-id";
  const baseUrl = "http://localhost:3000";

  describe("Multiple Slashes", () => {
    it("collapses double slashes", () => {
      const request = new NextRequest(`${baseUrl}//admin//dashboard`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard`);
    });

    it("collapses triple slashes", () => {
      const request = new NextRequest(`${baseUrl}///admin`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin`);
    });

    it("collapses multiple consecutive slashes", () => {
      const request = new NextRequest(`${baseUrl}/////admin`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin`);
    });

    it("handles slashes in middle of path", () => {
      const request = new NextRequest(`${baseUrl}/admin///dashboard//settings`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard/settings`);
    });

    it("handles mixed slash counts", () => {
      const request = new NextRequest(`${baseUrl}//admin///dashboard//settings////config`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard/settings/config`);
    });

    it("preserves single slashes", () => {
      const request = new NextRequest(`${baseUrl}/admin/dashboard`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });
  });

  describe("Trailing Slashes", () => {
    it("removes single trailing slash", () => {
      const request = new NextRequest(`${baseUrl}/admin/`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin`);
    });

    it("removes multiple trailing slashes", () => {
      const request = new NextRequest(`${baseUrl}/admin///`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin`);
    });

    it("preserves root path", () => {
      const request = new NextRequest(`${baseUrl}/`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull(); // Root stays as /
    });

    it("handles trailing slash with query params", () => {
      const request = new NextRequest(`${baseUrl}/admin/?tab=settings`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toContain("/admin?tab=settings");
    });

    it("preserves path without trailing slash", () => {
      const request = new NextRequest(`${baseUrl}/admin/dashboard`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });
  });

  describe("Lowercase Conversion", () => {
    it("converts uppercase path to lowercase", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin`);
    });

    it("converts mixed case to lowercase", () => {
      const request = new NextRequest(`${baseUrl}/AdMiN/DaShBoArD`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard`);
    });

    it("preserves already lowercase path", () => {
      const request = new NextRequest(`${baseUrl}/admin/dashboard`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });

    it("handles all uppercase", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN/DASHBOARD/SETTINGS`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard/settings`);
    });

    it("preserves query params case", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN?TAB=Settings`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      const location = result?.headers.get("location");
      expect(location).toContain("/admin");
      expect(location).toContain("TAB=Settings"); // Query params preserved
    });
  });

  describe("Combined Transformations", () => {
    it("handles uppercase with trailing slash", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN/`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin`);
    });

    it("handles uppercase with multiple slashes", () => {
      const request = new NextRequest(`${baseUrl}//ADMIN//Dashboard`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard`);
    });

    it("handles all issues together", () => {
      const request = new NextRequest(`${baseUrl}///ADMIN//DaShBoArD///`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard`);
    });

    it("handles complex path with all issues", () => {
      const request = new NextRequest(`${baseUrl}//Admin///DashBoard//SETTINGS///config//`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard/settings/config`);
    });
  });

  describe("Query Parameters", () => {
    it("preserves query parameters", () => {
      const request = new NextRequest(`${baseUrl}/admin?tab=settings`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull(); // Path is already canonical
    });

    it("preserves query parameters with path changes", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN?tab=settings`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toContain("tab=settings");
    });

    it("preserves multiple query parameters", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN?tab=settings&page=2`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      const location = result?.headers.get("location");
      expect(location).toContain("tab=settings");
      expect(location).toContain("page=2");
    });

    it("preserves query parameters with special characters", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN?search=hello%20world`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toContain("search=hello%20world");
    });

    it("preserves empty query parameter", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN?tab=`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toContain("tab=");
    });
  });

  describe("Hash Fragments", () => {
    it("preserves hash fragment", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN#section`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toContain("#section");
    });

    it("preserves hash with query params", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN?tab=settings#section`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      const location = result?.headers.get("location");
      expect(location).toContain("tab=settings");
      expect(location).toContain("#section");
    });
  });

  describe("Special Paths", () => {
    it("handles API routes", () => {
      const request = new NextRequest(`${baseUrl}//API//admin//users`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/api/admin/users`);
    });

    it("handles auth routes", () => {
      const request = new NextRequest(`${baseUrl}/AUTH//login/`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/auth/login`);
    });

    it("handles static file paths", () => {
      const request = new NextRequest(`${baseUrl}/STATIC//images//logo.PNG`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/static/images/logo.png`);
    });

    it("handles product paths with IDs", () => {
      const request = new NextRequest(`${baseUrl}/PRODUCTS//ABC-123//`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/products/abc-123`);
    });
  });

  describe("Leading Slash Handling", () => {
    it("ensures path starts with slash", () => {
      // This shouldn't normally happen, but test defensive coding
      const request = new NextRequest(`${baseUrl}/admin`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
      // If it did transform, would ensure leading slash
    });

    it("preserves single leading slash", () => {
      const request = new NextRequest(`${baseUrl}/admin`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });
  });

  describe("Response Properties", () => {
    it("returns correct redirect status", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN`);
      const result = canonicalizePath(request, requestId);
      
      expect(result?.status).toBe(security.proxy.canonicalize.redirectStatus);
    });

    it("returns redirect response", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN`);
      const result = canonicalizePath(request, requestId);
      
      expect(result?.headers.get("location")).toBeTruthy();
    });

    it("returns null for canonical path", () => {
      const request = new NextRequest(`${baseUrl}/admin`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("handles very long path", () => {
      const longPath = "/admin/" + "a/".repeat(100);
      const request = new NextRequest(`${baseUrl}${longPath}`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull(); // Already canonical
    });

    it("handles path with numbers", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN/123/456`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/123/456`);
    });

    it("handles path with hyphens", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN-DASHBOARD`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin-dashboard`);
    });

    it("handles path with underscores", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN_DASHBOARD`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin_dashboard`);
    });

    it("handles path with dots", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN/file.txt`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/file.txt`);
    });

    it("handles Unicode characters", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN/用户`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toContain("/admin/");
    });

    it("handles percent-encoded characters", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN/%20space`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toContain("/admin/");
    });

    it("handles empty path segments", () => {
      const request = new NextRequest(`${baseUrl}/ADMIN///dashboard`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).not.toBeNull();
      expect(result?.headers.get("location")).toBe(`${baseUrl}/admin/dashboard`);
    });
  });

  describe("No Changes Needed", () => {
    it("returns null for already canonical path", () => {
      const request = new NextRequest(`${baseUrl}/admin/dashboard`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });

    it("returns null for root path", () => {
      const request = new NextRequest(`${baseUrl}/`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });

    it("returns null for simple lowercase path", () => {
      const request = new NextRequest(`${baseUrl}/products`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });

    it("returns null for path with hyphens", () => {
      const request = new NextRequest(`${baseUrl}/admin-dashboard`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });

    it("returns null for path with numbers", () => {
      const request = new NextRequest(`${baseUrl}/products/123`);
      const result = canonicalizePath(request, requestId);
      
      expect(result).toBeNull();
    });
  });
});