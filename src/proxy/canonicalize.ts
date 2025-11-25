// NextRequest Object exposes a mutable URL object with cookies, IP, and headers
// NextResponse lets you rewrite requests, redirect requests, and add headers
import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/log"; // Import log function incase we need to log anything

export function canonicalizePath(request: NextRequest, requestId: string) {
  const url = request.nextUrl; // Full URL object representing the request
  // URL pathname users try to visit - e.g. /api/audit . We only want the pathname so we dont try and change the origins format
  let originalPath = url.pathname; 
  const initial = originalPath; // We save the raw path to compare if it changed later on

  // Regex : /\/+$/ <- means 1 or more slashes at the end. Remove trailing slashes - e.g. /products/ -> /products
  // Regex : /\/{2,}/g <- 2 or more slashes = replace with 1 slash. Collapse mutlti slashes - e.g. /products//nike -> /products/nike
  originalPath = originalPath.replace(/\/+$/, "").replace(/\/{2,}/g, "/"); // apply changes to the path

  // Sets everything to lowercase. This means our intended URL format must always be lowercase
  originalPath = originalPath.toLowerCase();

  // Creates the full URL and resolves URL paths - e.g. admin/../audit -> /audit - meaning a 404 will be thrown
  const normalizedUrl = new URL(originalPath, url.origin);

  // Checks if the URL path actually changed or not during this process
  if (normalizedUrl.pathname !== initial) {
    // Logs normalization
    log({
      level: "info",
      layer: "proxy",
      message: "canonicalize_redirect",
      requestId: requestId,
      route: originalPath,
      status: 308, // Permanent Redirect 
      normalized: normalizedUrl.pathname,
      event: "path_normalization",
    });

    const redirectUrl = new URL(url.toString()); // Creating a modifiable clone of the full orginal URL
    redirectUrl.pathname = normalizedUrl.pathname; // Overwriting the pathname to our canonicalized pathname

    // NextResponse.redirect creates a brand new response object. Sets Location header as our correct URL as a string (expected)
    const res = NextResponse.redirect(redirectUrl.toString(), 308);
    return res;
  }
  return null; 
}
