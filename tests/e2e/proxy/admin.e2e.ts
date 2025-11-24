import { test, expect } from "@playwright/test";

test("admin: no session → redirect to login", async ({ request }) => {
  const res = await request.get("/admin", { maxRedirects: 0 });

  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toContain("/auth/login");
});
