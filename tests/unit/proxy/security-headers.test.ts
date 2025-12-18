// applySecurityHeaders.test.ts
import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/proxy/security-headers";
import { security } from "@/config/security";
import { env } from "@/config/env";

function setNodeEnv(value: "production" | "test" | "development") {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    writable: true,
    configurable: true,
  });
}

describe("applySecurityHeaders", () => {
  const prev = env.NODE_ENV;

  afterEach(() => {
    // restore after every test to avoid cross-test leakage
    setNodeEnv((prev ?? "test") as any);
  });

  it("always applies baseline headers", () => {
    const res = NextResponse.next();
    applySecurityHeaders(res);

    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
  });

  it("sets HSTS in production only", () => {
    const prodRes = NextResponse.next();
    applySecurityHeaders(prodRes, "production");
    expect(prodRes.headers.get("Strict-Transport-Security"))
      .toBe(security.proxy.securityHeaders.hsts.value);

    const devRes = NextResponse.next();
    applySecurityHeaders(devRes, "test");
    expect(devRes.headers.get("Strict-Transport-Security")).toBeNull();
  });
});
