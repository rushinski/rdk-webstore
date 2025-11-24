import { test, expect } from "@playwright/test";

/**
 * IMPORTANT:
 * Upstash rate limits by IP.
 * Playwright’s request API uses the machine’s IP but each request MUST NOT follow redirects.
 * maxRedirects = 0 ensures we see raw proxy behavior.
 */

test.describe("Rate Limit (REAL Upstash)", () => {
  test("allows initial requests", async ({ request }) => {
    // Send a few requests that should NOT hit rate limit
    for (let i = 0; i < 5; i++) {
      const res = await request.get("/api/rl-check", { maxRedirects: 0 });

      // Should always be 200 unless the route doesn't exist
      expect([200, 404]).toContain(res.status());

      // Must return x-request-id (proxy requirement)
      expect(res.headers()["x-request-id"]).toBeDefined();
    }
  });

  test("blocks after threshold (~30 req/min)", async ({ request }) => {
    const maxRequests = 40; // 10 beyond limit

    let rateLimited = false;

    for (let i = 0; i < maxRequests; i++) {
      const res = await request.get("/api/rl-check", { maxRedirects: 0 });

      if (res.status() === 429) {
        rateLimited = true;

        const body = await res.json();

        // Proxy contract: must include error + request-id
        expect(body.error).toBe("Rate limit exceeded");
        expect(body.requestId).toBeDefined();

        // MUST include request-id header as well
        expect(res.headers()["x-request-id"]).toBeDefined();
        break;
      }
    }

    expect(rateLimited).toBeTruthy();
  });

  test("ensures subsequent requests stay blocked", async ({ request }) => {
    // Immediately try again (still within sliding window)
    const res = await request.get("/api/rl-check", { maxRedirects: 0 });

    expect(res.status()).toBe(429);
    const body = await res.json();

    expect(body.error).toBe("Rate limit exceeded");
    expect(body.requestId).toBeDefined();
    expect(res.headers()["x-request-id"]).toBeDefined();
  });
});
