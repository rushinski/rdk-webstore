import { applySecurityHeaders } from "@/proxy/security-headers";
import { NextResponse } from "next/server";

// We use this helper function in order to ensure the URL holds the same headers for all proxy processes
export function finalizeProxyResponse(res: NextResponse, requestId: string) {
  res.headers.set("x-request-id", requestId); // Sets the identifable id for logging on the header
  applySecurityHeaders(res);
  return res;
}
