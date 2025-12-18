import { makeRequest } from "./helpers";

jest.mock("@/lib/log", () => ({ log: jest.fn() }));
jest.mock("@/config/env", () => ({
  env: {
    UPSTASH_REDIS_REST_URL: "https://upstash.test",
    UPSTASH_REDIS_REST_TOKEN: "token",
  },
}));

const limitMock = jest.fn();

jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    limit(ip: string) { return limitMock(ip); }
  },
}));
jest.mock("@upstash/redis", () => ({ Redis: class {} }));

describe("applyRateLimit", () => {
  beforeEach(() => limitMock.mockReset());

  it("never rate-limits the error page itself (prevents loops)", async () => {
    const { applyRateLimit } = await import("@/proxy/rate-limit");
    const req = makeRequest({ url: "https://x.test/too-many-requests" });
    limitMock.mockResolvedValue({ success: false });
    expect(await applyRateLimit(req, "req_1")).toBeNull();
  });

  it("allows requests under limit", async () => {
    const { applyRateLimit } = await import("@/proxy/rate-limit");
    const req = makeRequest({
      url: "https://x.test/api/x",
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    limitMock.mockResolvedValue({ success: true });
    expect(await applyRateLimit(req, "req_1")).toBeNull();
  });

  it("blocks API requests with JSON 429 + headers", async () => {
    const { applyRateLimit } = await import("@/proxy/rate-limit");
    const req = makeRequest({
      url: "https://x.test/api/x",
      headers: { "x-forwarded-for": "1.2.3.4", accept: "application/json" },
    });
    limitMock.mockResolvedValue({ success: false, limit: 30, remaining: 0, reset: 999 });
    const res = await applyRateLimit(req, "req_1");
    expect(res?.status).toBe(429);
    expect(res?.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(res?.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res?.headers.get("X-RateLimit-Reset")).toBe("999");
    expect(res?.headers.get("Cache-Control")).toBe("no-store");
  });

  it("redirects browser navigations to friendly page", async () => {
    const { applyRateLimit } = await import("@/proxy/rate-limit");
    const req = makeRequest({
      url: "https://x.test/products",
      headers: { "x-forwarded-for": "1.2.3.4", accept: "text/html" },
    });
    limitMock.mockResolvedValue({ success: false, limit: 30, remaining: 0, reset: 999 });
    const res = await applyRateLimit(req, "req_1");
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toContain("/too-many-requests");
    expect(res?.headers.get("location")).toContain("from=%2Fproducts");
  });

  it("extracts first IP from x-forwarded-for chain", async () => {
    const { applyRateLimit } = await import("@/proxy/rate-limit");
    const req = makeRequest({
      url: "https://x.test/api/x",
      headers: { "x-forwarded-for": "9.9.9.9, 8.8.8.8", accept: "application/json" },
    });
    limitMock.mockResolvedValue({ success: true });
    await applyRateLimit(req, "req_1");
    expect(limitMock).toHaveBeenCalledWith("9.9.9.9");
  });

  it("handles rate limiter outage deterministically (choose policy)", async () => {
    // Policy recommendation (matches monitoring principle): fail-open + log.
    // If you choose fail-closed instead, invert this expectation and enforce it in code.
    const { applyRateLimit } = await import("@/proxy/rate-limit");
    const req = makeRequest({ url: "https://x.test/api/x", headers: { "x-forwarded-for": "1.2.3.4" } });

    limitMock.mockRejectedValue(new Error("upstash down"));

    // CURRENT code would throw unless you catch inside applyRateLimit.
    // This test is here to FORCE the outage behavior you want.
    await expect(applyRateLimit(req, "req_1")).resolves.toBeNull();
  });
});
