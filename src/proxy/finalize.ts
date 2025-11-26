import type { NextResponse } from "next/server";

import { applySecurityHeaders } from "@/proxy/security-headers";

// We use this helper function in order to ensure the URL holds the same headers for all proxy processes
export function finalizeProxyResponse(res: NextResponse, requestId: string) {
  res.headers.set("x-request-id", requestId); // Sets the identifable id for logging on the header
  applySecurityHeaders(res);
  return res;
}
