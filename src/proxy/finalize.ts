// src/proxy/finalize.ts
import type { NextResponse } from "next/server";

import { applySecurityHeaders } from "@/proxy/security-headers";
import { security } from "@/config/security";

/**
 * Finalizes every proxy response:
 * - stamps request id header
 * - applies security headers
 *
 * Style rule: this is the single place that returns the response.
 */
export function finalizeProxyResponse(res: NextResponse, requestId: string): NextResponse {
  res.headers.set(security.proxy.requestIdHeader, requestId);
  applySecurityHeaders(res);
  return res;
}
