// src/proxy/finalize.ts
import type { NextResponse } from "next/server";

import { applySecurityHeaders } from "@/proxy/security-headers";
import { security } from "@/config/security";

/**
 * Final step in the proxy pipeline - stamps every response.
 * 
 * **Purpose:**
 * This is the single, centralized place where ALL proxy responses are finalized.
 * No matter which middleware blocked/allowed the request, this function ensures
 * consistent headers and tracing on every response.
 * 
 * **Applied to every response:**
 * 1. Request ID header (for log correlation)
 * 2. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 
 * **Design principle:**
 * This function is the ONLY place that returns a response from the proxy.
 * All other middleware functions return a Response object that gets passed here.
 * This "single return point" pattern ensures we never forget to add headers.
 * 
 * @param response - The NextResponse object to finalize
 * @param requestId - Correlation ID for distributed tracing
 * 
 * @returns The same response object with additional headers applied
 */
export function finalizeProxyResponse(
  response: NextResponse,
  requestId: string
): NextResponse {
  // ==========================================================================
  // ADD REQUEST ID HEADER
  // ==========================================================================
  
  // This enables log correlation across:
  // - Vercel edge logs
  // - Vercel serverless logs  
  // - Supabase query logs (when we forward it)
  // - Sentry traces
  // - Client-side error reporting
  response.headers.set(security.proxy.requestIdHeader, requestId);

  // ==========================================================================
  // APPLY SECURITY HEADERS
  // ==========================================================================
  
  // Adds: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
  // See security-headers.ts for full details
  applySecurityHeaders(response);

  return response;
}