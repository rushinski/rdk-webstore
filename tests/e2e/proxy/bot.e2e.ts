import { test, expect } from "@playwright/test";

test("blocks empty user-agent", async ({ request }) => {
  const res = await request.get("/api", {
    headers: { "User-Agent": "" }
  });

  expect(res.status()).toBe(403);
});

test("blocks curl user-agent", async ({ request }) => {
  const res = await request.get("/api", {
    headers: { "User-Agent": "curl/8.0" }
  });

  expect(res.status()).toBe(403);
});

test("allows Googlebot", async ({ request }) => {
  const res = await request.get("/api", {
    headers: { "User-Agent": "Googlebot" }
  });

  expect(res.status()).not.toBe(403);
});
