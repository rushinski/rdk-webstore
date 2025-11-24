import { test, expect } from "@playwright/test";
import { url } from "../helpers/urls";

test("canonicalization: redirects /Admin/Panel → /admin/panel", async ({ request }) => {
  const res = await request.get(url("/Admin/Panel"), {
    maxRedirects: 0
  });

  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe("/admin/panel");
  expect(res.headers()["x-request-id"]).toBeDefined();
});

test("canonicalization: removes trailing slash", async ({ request }) => {
  const res = await request.get(url("/auth/login/"), {
    maxRedirects: 0
  });

  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe("/auth/login");
});
