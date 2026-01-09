// tests/e2e/proxy/security-headers.spec.ts
import { test, expect } from "@playwright/test";

test.describe("E2E: Security Headers", () => {
  test("includes security headers in page response", async ({ page }) => {
    const response = await page.goto("/");
    
    const headers = response?.headers();
    expect(headers?.["x-frame-options"]).toBe("DENY");
    expect(headers?.["x-content-type-options"]).toBe("nosniff");
    expect(headers?.["content-security-policy"]).toBeTruthy();
  });

  test("prevents iframe embedding", async ({ page }) => {
    // Try to embed in iframe
    await page.goto("/");
    
    const frameContent = `
      <html>
        <body>
          <iframe src="${page.url()}" id="test-frame"></iframe>
        </body>
      </html>
    `;
    
    await page.setContent(frameContent);
    
    // Frame should fail to load due to X-Frame-Options
    const frame = page.frameLocator("#test-frame");
    await expect(frame.locator("body")).not.toBeVisible();
  });

  test("prevents MIME type sniffing", async ({ page }) => {
    const response = await page.goto("/");
    
    const headers = response?.headers();
    expect(headers?.["x-content-type-options"]).toBe("nosniff");
  });

  test("applies CSP", async ({ page }) => {
    const response = await page.goto("/");
    
    const csp = response?.headers()["content-security-policy"];
    expect(csp).toContain("default-src");
    expect(csp).toContain("script-src");
  });
});