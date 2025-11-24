import { test, expect } from "@playwright/test";

test("CSRF: missing origin → 403", async ({ request }) => {
  const res = await request.post("/api/testing-endpoint");
  expect(res.status()).toBe(403);
});

test("CSRF: bad origin → 403", async ({ request }) => {
  const res = await request.post("/api/testing-endpoint", {
    headers: {
      Origin: "https://evil.com",
      Host: "localhost:3000"
    }
  });

  expect(res.status()).toBe(403);
});

test("CSRF: correct origin → not blocked", async ({ request }) => {
  const res = await request.post("/api/testing-endpoint", {
    headers: {
      Origin: "http://localhost:3000",
      Host: "localhost:3000"
    }
  });

  expect(res.status()).not.toBe(403);
});
