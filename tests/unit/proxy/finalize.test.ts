import { NextResponse } from "next/server";
import { finalizeProxyResponse } from "@/proxy/finalize";

jest.mock("@/proxy/security-headers", () => ({ applySecurityHeaders: jest.fn() }));

describe("finalizeProxyResponse", () => {
  it("stamps x-request-id and applies security headers", () => {
    const res = NextResponse.next();
    const out = finalizeProxyResponse(res, "req_123");

    expect(out.headers.get("x-request-id")).toBe("req_123");
    const { applySecurityHeaders } = require("@/proxy/security-headers");
    expect(applySecurityHeaders).toHaveBeenCalled();
  });
});
