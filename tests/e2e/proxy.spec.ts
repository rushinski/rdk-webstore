import { test, expect } from "@playwright/test";

test("canonicalization redirects before page render", async ({ page }) => {
  const r = await page.goto("/Products//Nike///");
  expect(r?.status()).toBe(308);
});

test("security headers present on HTML responses", async ({ page }) => {
  const r = await page.goto("/_proxy-test");
  expect(r?.headers()["content-security-policy"]).toBeTruthy();
  expect(r?.headers()["x-frame-options"]).toBe("DENY");
  expect(r?.headers()["x-content-type-options"]).toBe("nosniff");
});

test("request-id is injected and observable downstream", async ({ request }) => {
  const res = await request.get("/api/_proxy-test/echo");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.requestId).toContain("req_");
});

test("CSRF blocks unsafe requests without Origin", async ({ request }) => {
  const res = await request.post("/api/_proxy-test/echo", { data: { x: 1 } });
  expect(res.status()).toBe(403);
});

test("rate limit can be deterministically triggered in e2e", async ({ request }) => {
  process.env.RDK_E2E_FORCE_RATE_LIMIT = "1";
  const res = await request.get("/api/_proxy-test/echo");
  expect(res.status()).toBe(429);
});
