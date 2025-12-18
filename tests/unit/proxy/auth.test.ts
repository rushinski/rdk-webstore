// tests/unit/proxy/auth.test.ts
import { protectAdminRoute } from "@/proxy/auth";
import { makeRequest } from "./helpers";
import { security } from "@/config/security";
import { verifyAdminSessionToken } from "@/lib/http/admin-session";

jest.mock("@/lib/log", () => ({ log: jest.fn() }));

// Shared mock used by every ProfileRepository instance
const getByUserIdMock = jest.fn();

// Make every `new ProfileRepository(...)` return an object that uses the shared mock
jest.mock("@/repositories/profile-repo", () => ({
  ProfileRepository: jest.fn().mockImplementation(() => ({
    getByUserId: getByUserIdMock,
  })),
}));

jest.mock("@/lib/http/admin-session", () => ({
  verifyAdminSessionToken: jest.fn(),
}));

function makeSupabase(opts: {
  user?: any;
  userError?: any;
  profile?: any;
  profileThrows?: boolean;
  aal?: { currentLevel: string; nextLevel: string };
  aalError?: any;
}) {
  // Configure the shared repo mock for THIS test case
  getByUserIdMock.mockReset();
  if (opts.profileThrows) getByUserIdMock.mockRejectedValue(new Error("db down"));
  else getByUserIdMock.mockResolvedValue(opts.profile ?? null);

  return {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: opts.user }, error: opts.userError }),
      signOut: jest.fn().mockResolvedValue({}),
      mfa: {
        getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({
          data: opts.aal ?? { currentLevel: "aal2", nextLevel: "aal2" },
          error: opts.aalError,
        }),
      },
    },
  } as any;
}

describe("protectAdminRoute", () => {
  beforeEach(() => {
    (verifyAdminSessionToken as jest.Mock).mockReset();
    getByUserIdMock.mockReset();
  });

  it("blocks missing supabase session (admin page => redirect to login)", async () => {
    const req = makeRequest({ url: "https://x.test/admin" });
    const sb = makeSupabase({ user: null, userError: { message: "no session" } });
    const res = await protectAdminRoute(req, "req_1", sb);
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe("https://x.test/auth/login");
  });

  it("returns JSON 401 for /api/admin/*", async () => {
    const req = makeRequest({ url: "https://x.test/api/admin/users" });
    const sb = makeSupabase({ user: null });
    const res = await protectAdminRoute(req, "req_1", sb);
    expect(res?.status).toBe(401);
    const body = await res?.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("fails closed when profile lookup throws", async () => {
    const req = makeRequest({ url: "https://x.test/admin" });
    const sb = makeSupabase({ user: { id: "u1" }, profileThrows: true });
    const res = await protectAdminRoute(req, "req_1", sb);
    expect(res?.headers.get("location")).toBe("https://x.test/auth/login");
  });

  it("blocks non-admin role", async () => {
    const req = makeRequest({ url: "https://x.test/admin" });
    const sb = makeSupabase({ user: { id: "u1" }, profile: { role: "customer" } });
    const res = await protectAdminRoute(req, "req_1", sb);
    expect(res?.headers.get("location")).toBe("https://x.test/");
  });

  it("blocks missing admin cookie and clears it + signs out", async () => {
    const req = makeRequest({ url: "https://x.test/admin", cookies: {} });
    const sb = makeSupabase({ user: { id: "u1" }, profile: { role: "admin" } });
    const res = await protectAdminRoute(req, "req_1", sb);
    expect(sb.auth.signOut).toHaveBeenCalled();
    expect(res?.headers.get("location")).toBe("https://x.test/auth/login");
  });

  it("blocks invalid token (verify returns null)", async () => {
    (verifyAdminSessionToken as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({
      url: "https://x.test/admin",
      cookies: { [security.proxy.adminSession.cookieName]: "bad" },
    });

    const sb = makeSupabase({ user: { id: "u1" }, profile: { role: "admin" } });
    const res = await protectAdminRoute(req, "req_1", sb);
    expect(res?.headers.get("location")).toBe("https://x.test/auth/login");
  });

  it("blocks token-user mismatch (security incident path)", async () => {
    (verifyAdminSessionToken as jest.Mock).mockResolvedValue({ v: 1, sub: "other-user" });

    const req = makeRequest({
      url: "https://x.test/admin",
      cookies: { [security.proxy.adminSession.cookieName]: "tok" },
    });

    const sb = makeSupabase({ user: { id: "u1" }, profile: { role: "admin" } });
    const res = await protectAdminRoute(req, "req_1", sb);
    expect(res?.headers.get("location")).toBe("https://x.test/auth/login");
  });

  it("requires MFA when nextLevel=aal2 and currentLevel!=aal2", async () => {
    (verifyAdminSessionToken as jest.Mock).mockResolvedValue({ v: 1, sub: "u1" });

    const req = makeRequest({
      url: "https://x.test/admin",
      cookies: { [security.proxy.adminSession.cookieName]: "tok" },
    });

    const sb = makeSupabase({
      user: { id: "u1" },
      profile: { role: "admin" },
      aal: { currentLevel: "aal1", nextLevel: "aal2" },
    });

    const res = await protectAdminRoute(req, "req_1", sb);
    expect(res?.headers.get("location")).toBe("https://x.test/auth/2fa/challenge");
  });

  it("allows admin when all checks pass", async () => {
    (verifyAdminSessionToken as jest.Mock).mockResolvedValue({ v: 1, sub: "u1" });

    const req = makeRequest({
      url: "https://x.test/admin",
      cookies: { [security.proxy.adminSession.cookieName]: "tok" },
    });

    const sb = makeSupabase({ user: { id: "u1" }, profile: { role: "admin" } });
    const res = await protectAdminRoute(req, "req_1", sb);
    expect(res).toBeNull();
  });
});
