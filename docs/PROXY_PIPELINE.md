# Proxy Pipeline Documentation

This document is the **single source of truth** for the request proxy pipeline.

It replaces long inline JSDoc blocks inside proxy-related files with short `@see` links.

> MVP alignment: The MVP plan explicitly calls out **admin-only routes locked by Next.js proxy** and **rate limiting**. This proxy pipeline is the enforcement point for those requirements.

---

## Table of contents

- [Pipeline overview](#pipeline-overview)
- [Execution order](#execution-order)
- [Component docs](#component-docs)
  - [`src/proxy.ts` — Orchestrator](#proxy-orchestrator)
  - [`src/proxy/canonicalize.ts`](#proxy-canonicalize)
  - [`src/proxy/bot.ts`](#proxy-bot)
  - [`src/proxy/csrf.ts`](#proxy-csrf)
  - [`src/proxy/rate-limit.ts`](#proxy-rate-limit)
  - [`src/proxy/auth.ts`](#proxy-auth)
  - [`src/proxy/finalize.ts`](#proxy-finalize)
  - [`src/proxy/security-headers.ts`](#proxy-security-headers)
- [Related components](#related-components)
  - [`src/lib/http/admin-session.ts`](#crypto-admin-session)
  - [`src/config/security.ts`](#config-security)
- [Operational notes](#operational-notes)
  - [Logging + request ID](#logging--request-id)
  - [Fail-open vs fail-closed](#fail-open-vs-fail-closed)
  - [Testing checklist](#testing-checklist)

---

## Pipeline overview

The proxy runs **before** any route handler executes. It provides defense-in-depth by applying a sequence of checks that are:

- **Fast early checks first** (canonicalization, UA filtering, origin check)
- **External-call checks later** (Upstash Redis rate-limit)
- **Most expensive checks last** (Supabase admin auth + profile query + MFA)

The proxy is designed to be:

- **Deterministic** (same input → same decision)
- **Fail-safe** for privileged access (admin failures deny access)
- **Operationally friendly** (request ID is consistent across logs and error responses)

---

## Execution order

1. **Canonicalization** — Normalize path early; redirect immediately if needed.
2. **Request ID** — Generate once, forward downstream, stamp on response.
3. **Bot detection** — Cheap UA checks; blocks obvious automation.
4. **CSRF protection** — Origin/Host validation for unsafe methods.
5. **Rate limiting** — Upstash sliding window to reduce abuse.
6. **Admin guard** — Supabase session + profile role + admin token + MFA.
7. **Finalize** — Ensure every response has request ID + security headers.

---

# Component docs

<a id="proxy-orchestrator"></a>
## `src/proxy.ts` — Orchestrator

### Responsibility
Routes each request through a consistent security pipeline.

### Inputs
- `NextRequest`

### Outputs
- Always returns a `NextResponse` finalized with request ID + security headers.

### Pseudocode

```text
function proxy(request): NextResponse
  requestId = "req_" + uuid()

  # 1) canonicalize
  if canonicalizePath(request, requestId) returns response:
    return finalizeProxyResponse(response, requestId)

  # 2) forward requestId to downstream
  forwardedHeaders = request.headers + { x-request-id: requestId }
  response = NextResponse.next({ request: { headers: forwardedHeaders } })
  response = finalizeProxyResponse(response, requestId)

  # 3) bot detection (selective)
  if route matches botCheckPrefixes:
    if checkBot(request, requestId) returns response:
      return finalizeProxyResponse(response, requestId)

  # 4) csrf (unsafe methods only)
  if request.method in {POST,PUT,PATCH,DELETE}:
    if checkCsrf(request, requestId) returns response:
      return finalizeProxyResponse(response, requestId)

  # 5) rate limit (selective)
  if route matches rateLimitPrefixes:
    if applyRateLimit(request, requestId) returns response:
      return finalizeProxyResponse(response, requestId)

  # 6) admin guard (admin routes only, with exemptions)
  if route matches adminGuard.protectedPrefixes AND not exempt:
    supabase = createSupabaseServerClient()
    if protectAdminRoute(request, requestId, supabase) returns response:
      return finalizeProxyResponse(response, requestId)

  return response
```

### Key design points
- Redirects (canonicalization) happen **before** any other work.
- Request ID is created once and flows through everything.
- Admin checks are last because they require Supabase calls.

---

<a id="proxy-canonicalize"></a>
## `src/proxy/canonicalize.ts`

### Responsibility
Normalize paths for consistency, SEO, and security.

### Normalization rules
1. Collapse multiple slashes: `//products///nike` → `/products/nike`
2. Remove trailing slash (except `/`)
3. Lowercase path
4. Ensure leading slash
5. Resolve dot segments: `/admin/../api` → `/api`

### Redirect behavior
- Uses **308 Permanent Redirect** so methods/bodies are preserved (unlike 301 in some clients).
- Query string is preserved as-is.

### Pseudocode

```text
function canonicalizePath(request, requestId): Response | null
  raw = request.url.pathname
  canonical = raw

  if collapseMultipleSlashes: canonical = replace /{2,}/ with /
  if removeTrailingSlash and len>1: canonical = strip trailing /
  if lowercasePathname: canonical = toLower(canonical)
  if not startsWith('/'): canonical = '/' + canonical

  canonical = URL(canonical, origin).pathname   # resolves . and ..

  if canonical == raw: return null

  log info canonicalize_redirect
  redirectUrl = request.url with pathname = canonical
  return redirect(redirectUrl, 308)
```

---

<a id="proxy-bot"></a>
## `src/proxy/bot.ts`

### Responsibility
Lightweight bot mitigation for high-value routes.

### Strategy
User-Agent based filtering (fast, edge-compatible). Not a replacement for rate limiting.

### Rules
0. Allow known-good bots (SEO/monitoring)
1. Block empty user-agent
2. Block disallowed UA substrings (curl, wget, scrapy, etc.)
3. Block improbably short UA strings

### Logging
- UA is truncated before logging to prevent log bloat / injection.

### Pseudocode

```text
function checkBot(request, requestId): Response | null
  ua = (header 'user-agent' or '').trim()
  uaLower = lower(ua)

  if ua matches allowlist tokens: return null
  if ua is empty: return 403
  if uaLower contains any disallowed substring: return 403
  if len(ua) < minLen: return 403

  return null
```

---

<a id="proxy-csrf"></a>
## `src/proxy/csrf.ts`

### Responsibility
CSRF defense for state-changing requests.

### Strategy
For unsafe methods (POST/PUT/PATCH/DELETE), verify `Origin` matches `Host`.

### Bypasses
Some routes skip CSRF checks because they have stronger alternative verification:
- Stripe webhooks (signature verification)
- 2FA verification endpoints (time-based codes)

### Pseudocode

```text
function checkCsrf(request, requestId): Response | null
  if method is safe: return null
  if path starts with any bypass prefix: return null

  origin = header 'origin'
  host = header 'host' or request.url.host

  if origin missing OR origin == 'null': return 403

  originHost = parse(origin).host or fail 403
  if originHost != host: return 403

  return null
```

---

<a id="proxy-rate-limit"></a>
## `src/proxy/rate-limit.ts`

### Responsibility
Abuse protection (credential stuffing, scraping, brute-force) using Upstash Redis.

### Algorithm
Sliding window rate limiting (more accurate than fixed windows).

### Key selection
- Keyed by client IP (derived from `x-forwarded-for` / `x-real-ip`).

### Fail-open policy
If Upstash is unavailable, the limiter **fails open** to avoid an outage from blocking all traffic.

### Responses
- Browser navigation: redirect to friendly `too-many-requests` page.
- API request: JSON `429` with rate limit headers.

### Pseudocode

```text
function applyRateLimit(request, requestId): Response | null
  if pathname == tooManyRequestsPath: return null  # avoid loops

  ip = getClientIp(request)

  try:
    result = upstash.limit(ip)
  catch:
    log error rate_limit_unavailable_fail_open
    return null

  if result.success: return null

  log warn rate_limit_block with limit/remaining/reset

  if isBrowserNavigation(request) and not /api:
    return redirect(to tooManyRequestsPath?from=pathname)

  response = json 429
  set X-RateLimit-Limit/Remaining/Reset
  set Cache-Control: no-store
  return response
```

---

<a id="proxy-auth"></a>
## `src/proxy/auth.ts` — Admin guard

### Responsibility
Multi-layered admin authentication guard for `/admin/*` and `/api/admin/*`.

### Layers
1. **Supabase session**: must have an active authenticated user.
2. **Profile role**: profile exists and `role === 'admin'`.
3. **Admin session token (JWE)**: short-lived elevation token stored in an HTTP-only cookie.
4. **MFA (AAL2)**: must have completed MFA when required.

### Response behavior
- Admin API routes return JSON errors.
- Admin page routes redirect to login / home / MFA challenge.

### Fail-closed behavior
On any admin token failure, the system:
- Attempts Supabase sign-out
- Clears the admin session cookie
- Blocks the request regardless of sign-out success

### Pseudocode

```text
function protectAdminRoute(request, requestId, supabase): Response | null
  isAdminApi = pathname startsWith '/api/admin'
  respond() => json or redirect depending on route type

  user = supabase.auth.getUser() or deny 401

  profile = profileRepo.getByUserId(user.id) or deny 500
  if profile missing: deny 403
  if profile.role != 'admin': deny 403

  cookie = request.cookies[admin_session]
  if missing: signOut + clear cookie + deny 401

  adminSession = verifyAdminSessionToken(cookie)
  if invalid: signOut + clear cookie + deny 401
  if adminSession.sub != user.id: signOut + clear cookie + deny 401 (security incident)

  aal = supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if error: deny 500
  if nextLevel == 'aal2' and currentLevel != 'aal2': deny 403 (redirect to MFA challenge)

  log admin_guard_access_granted
  return null
```

---

<a id="proxy-finalize"></a>
## `src/proxy/finalize.ts`

### Responsibility
The last step in the proxy pipeline: ensure response headers are stamped consistently.

### Applied to every response
- `x-request-id` header
- security headers (CSP, HSTS, clickjacking, etc.)

### Pseudocode

```text
function finalizeProxyResponse(response, requestId): response
  response.headers.set('x-request-id', requestId)
  applySecurityHeaders(response)
  return response
```

---

<a id="proxy-security-headers"></a>
## `src/proxy/security-headers.ts`

### Responsibility
Apply defense-in-depth security headers.

### Headers
- `Content-Security-Policy` (dev vs prod policies)
- `Strict-Transport-Security` (prod only)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (deny camera/mic/geo)

### Pseudocode

```text
function applySecurityHeaders(response, nodeEnv): void
  isDev = nodeEnv != 'production'
  csp = isDev ? csp.dev : csp.prod

  set X-Frame-Options=DENY
  set X-Content-Type-Options=nosniff
  set Referrer-Policy=strict-origin-when-cross-origin
  set Permissions-Policy=camera=(), microphone=(), geolocation=()

  set Content-Security-Policy = join(csp, '; ')

  if !isDev:
    set Strict-Transport-Security = configured value
```

---

# Related components

<a id="crypto-admin-session"></a>
## `src/lib/http/admin-session.ts` — Admin elevation token

### Responsibility
Create + verify a **short-lived encrypted token** (JWE) for admin privilege elevation.

### Security properties
- Encrypted (JWE), not just signed (JWT)
- Bound to user ID (`sub`)
- Versioned (`v: 1`)
- TTL enforced via `exp`

### Key management
- `ADMIN_SESSION_SECRET` is **base64-encoded 32 bytes** (AES-256 key).
- Key is cached in-memory per runtime instance.

### Pseudocode

```text
createAdminSessionToken(userId): string
  now = epochSeconds()
  exp = now + ttlSeconds
  key = getAdminSessionKey()

  payload = { v: 1, sub: userId }
  return JWE.encrypt(payload, key, alg='dir', enc='A256GCM', iat=now, exp=exp)

verifyAdminSessionToken(token): payload | null
  try decrypt with key (clockTolerance=5)
  validate alg/enc
  validate v == 1
  validate sub is non-empty string
  return payload
  catch:
    return null
```

---

<a id="config-security"></a>
## `src/config/security.ts`

### Responsibility
Centralized configuration for security behavior.

### Notes
- Proxy configuration lives under `security.proxy.*`.
- Helper functions (`startsWithAny`, `isCsrfUnsafeMethod`) are used by the proxy orchestrator.

### Proxy-specific config groups
- `botCheckPrefixes` / `rateLimitPrefixes`
- `adminGuard.{protectedPrefixes, exemptPrefixes}`
- `canonicalize.*`
- `bot.*`
- `csrf.*`
- `rateLimit.*`
- `admin.*`
- `adminSession.*`
- `securityHeaders.{hsts, csp.{dev,prod}}`

---

# Operational notes

## Logging + request ID
All proxy decisions should include `requestId` in logs and JSON errors. This makes it possible to correlate:

- client error reports
- edge logs
- serverless logs
- downstream service logs

## Fail-open vs fail-closed
- **Fail-open:** rate limiter outage (availability > strictness)
- **Fail-closed:** admin authentication / token verification (security > convenience)

## Testing checklist

- Canonicalization
  - `/Products//Nike/` → `308` to `/products/nike`
- Bot detection
  - Empty UA to protected route → `403`
- CSRF
  - POST with missing Origin → `403`
  - POST with Origin mismatch → `403`
- Rate limiting
  - Burst requests exceed limit → `429` + `X-RateLimit-*` headers
- Admin guard
  - non-admin user hits `/admin` → redirect to home (or `403` for API)
  - missing admin cookie → redirect/login and cookie cleared
  - MFA required but not complete → redirect to MFA challenge
- Headers
  - responses include `x-request-id`
  - CSP present
  - HSTS present only in production

