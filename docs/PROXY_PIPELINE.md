# Proxy Pipeline

This document explains the request proxy pipeline implemented by `proxy.ts`
and `src/proxy/*`. The proxy acts as the front door for app and API traffic,
adding security checks, request IDs, and standardized responses.

## Scope and entry point

- Entry: `proxy.ts` exports `proxy()` and a Next.js matcher config.
- Matcher: all routes except `_next`, `static`, `favicon.ico`, `robots.txt`,
  and `sitemap.xml`.
- Configuration: `src/config/security.ts` controls guards and headers.

## Pipeline order (high level)

1) Canonicalize the path
   - Collapses multiple slashes, removes trailing slash, lowercases the path.
   - Redirects with a 308 to the canonical URL when a change is made.
   - Skips canonicalization if the path exceeds the configured max length.

2) Refresh Supabase session
   - Calls `refreshSession` to refresh auth cookies.
   - Copies Supabase cookies into the response.

3) Assign request ID and security headers
   - Adds `x-request-id` (configurable header name).
   - Applies CSP, HSTS, and other security headers.

4) CSRF protection (unsafe methods)
   - Applies to `POST`, `PUT`, `PATCH`, `DELETE`.
   - Requires `Origin` to match `Host` with valid protocol.
   - Bypass prefixes are configured in `security.proxy.csrf.bypassPrefixes`.

5) Admin guard
   - Applies to `/admin` and `/api/admin` (with configured exemptions).
   - Requires a valid Supabase user session.
   - Requires admin role on the resolved profile.
   - Enforces MFA when Supabase AAL requires it.

## Response behavior

- API routes return JSON errors with `requestId`.
- Page routes redirect to login/home/MFA as appropriate.
- All responses include `x-request-id` and security headers.

## Files to know

- `proxy.ts` - pipeline entry and order
- `src/proxy/canonicalize.ts` - path normalization
- `src/proxy/csrf.ts` - CSRF validation
- `src/proxy/auth.ts` - admin guard and MFA enforcement
- `src/proxy/security-headers.ts` - CSP/HSTS/headers
- `src/config/security.ts` - proxy configuration
