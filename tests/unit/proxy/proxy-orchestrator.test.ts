import { proxy } from "../../../proxy";
import { makeRequest } from "./helpers";
import { NextResponse } from "next/server";

jest.mock("@/proxy/canonicalize", () => ({ canonicalizePath: jest.fn() }));
jest.mock("@/proxy/bot", () => ({ checkBot: jest.fn() }));
jest.mock("@/proxy/csrf", () => ({ checkCsrf: jest.fn() }));
jest.mock("@/proxy/rate-limit", () => ({ applyRateLimit: jest.fn() }));
jest.mock("@/proxy/auth", () => ({ protectAdminRoute: jest.fn() }));
jest.mock("@/proxy/finalize", () => ({ finalizeProxyResponse: (r: any) => r }));
jest.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock("@/lib/supabase/proxy", () => ({ 
  refreshSession: jest.fn() 
}));

describe("proxy orchestrator", () => {
  const { canonicalizePath } = require("@/proxy/canonicalize");
  const { checkBot } = require("@/proxy/bot");
  const { checkCsrf } = require("@/proxy/csrf");
  const { applyRateLimit } = require("@/proxy/rate-limit");
  const { protectAdminRoute } = require("@/proxy/auth");
  const { createSupabaseServerClient } = require("@/lib/supabase/server");
  const { refreshSession } = require("@/lib/supabase/proxy");

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock: refreshSession returns a basic NextResponse
    refreshSession.mockImplementation((request: any) => 
      Promise.resolve(NextResponse.next({ request }))
    );
  });

  it("returns early on canonicalization redirect (no other checks run)", async () => {
    canonicalizePath.mockReturnValue(new Response(null, { status: 308 }) as any);

    const req = makeRequest({ url: "https://x.test/Products" });
    const res = await proxy(req);

    expect(res.status).toBe(308);
    expect(refreshSession).not.toHaveBeenCalled(); // Session refresh skipped on early return
    expect(checkBot).not.toHaveBeenCalled();
    expect(checkCsrf).not.toHaveBeenCalled();
    expect(applyRateLimit).not.toHaveBeenCalled();
    expect(protectAdminRoute).not.toHaveBeenCalled();
  });

  it("refreshes session before any security checks", async () => {
    canonicalizePath.mockReturnValue(null);
    checkBot.mockReturnValue(null);
    applyRateLimit.mockResolvedValue(null);

    const req = makeRequest({ url: "https://x.test/api/x" });
    await proxy(req);

    expect(refreshSession).toHaveBeenCalled();
    expect(refreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      checkBot.mock.invocationCallOrder[0]
    );
  });

  it("runs bot check before rate limit", async () => {
    canonicalizePath.mockReturnValue(null);
    checkBot.mockReturnValue(null);
    applyRateLimit.mockResolvedValue(null);

    const req = makeRequest({ url: "https://x.test/api/x" });
    await proxy(req);

    expect(checkBot).toHaveBeenCalled();
    expect(applyRateLimit).toHaveBeenCalled();
    expect(checkBot.mock.invocationCallOrder[0]).toBeLessThan(
      applyRateLimit.mock.invocationCallOrder[0]
    );
  });

  it("only runs CSRF on unsafe methods", async () => {
    canonicalizePath.mockReturnValue(null);
    checkBot.mockReturnValue(null);

    await proxy(makeRequest({ url: "https://x.test/api/x", method: "GET" }));
    expect(checkCsrf).not.toHaveBeenCalled();

    await proxy(makeRequest({ url: "https://x.test/api/x", method: "POST" }));
    expect(checkCsrf).toHaveBeenCalled();
  });

  it("runs admin guard only on protected prefixes (and not on exempt)", async () => {
    canonicalizePath.mockReturnValue(null);
    checkBot.mockReturnValue(null);
    applyRateLimit.mockResolvedValue(null);
    checkCsrf.mockReturnValue(null);
    createSupabaseServerClient.mockResolvedValue({});

    // Protected: /admin
    await proxy(makeRequest({ url: "https://x.test/admin" }));
    expect(protectAdminRoute).toHaveBeenCalled();

    jest.clearAllMocks();
    refreshSession.mockImplementation((request: any) => 
      Promise.resolve(NextResponse.next({ request }))
    );
    canonicalizePath.mockReturnValue(null);
    checkBot.mockReturnValue(null);
    applyRateLimit.mockResolvedValue(null);
    checkCsrf.mockReturnValue(null);

    // Exempt: /api/auth/2fa (per config)
    await proxy(makeRequest({ url: "https://x.test/api/auth/2fa/challenge/verify", method: "POST" }));
    expect(protectAdminRoute).not.toHaveBeenCalled();
  });

  it("preserves session cookies in final response", async () => {
    canonicalizePath.mockReturnValue(null);
    checkBot.mockReturnValue(null);
    applyRateLimit.mockResolvedValue(null);
    
    // Mock refreshSession to return a response with cookies
    const mockResponse = NextResponse.next({ request: makeRequest({ url: "https://x.test/" }) });
    mockResponse.cookies.set("sb-access-token", "test-token", { httpOnly: true });
    refreshSession.mockResolvedValue(mockResponse);

    const req = makeRequest({ url: "https://x.test/" });
    const res = await proxy(req);

    // Verify cookies are preserved
    expect(res.cookies.get("sb-access-token")?.value).toBe("test-token");
  });
});