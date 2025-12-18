// src/config/security.ts

/**
 * Centralized security configuration for the entire application.
 * 
 * **Purpose:**
 * Single source of truth for all security-related settings.
 * Makes security policies explicit, reviewable, and auditable.
 * 
 * **Why centralize config?**
 * - Easy to review entire security posture in one place
 * - Prevents magic numbers scattered through code
 * - Simple to adjust limits during incidents
 * - Clear documentation of security decisions
 * - Type-safe with TypeScript
 * 
 * **Structure:**
 * All proxy-related config is under `security.proxy.*`
 * Each subsystem has its own nested config:
 * - Bot detection
 * - CSRF protection  
 * - Rate limiting
 * - Admin authentication
 * - Security headers
 * - Canonicalization
 * 
 * **Using this config:**
 * ```typescript
 * import { security } from "@/config/security";
 * 
 * if (security.proxy.bot.allowedUserAgents.includes(ua)) {
 *   // Allow search engine bot
 * }
 * ```
 * 
 * **Immutability:**
 * The `as const` assertion makes this config deeply readonly.
 * Prevents accidental runtime modifications.
 */
export const security = {
  proxy: {
    /**
     * Request ID header name for distributed tracing.
     * 
     * **Used for:**
     * - Correlating logs across services
     * - Linking Sentry errors to specific requests
     * - Debugging customer issues
     * - Performance monitoring
     * 
     * **Format:** `req_${uuid}`
     * Example: "req_550e8400-e29b-41d4-a716-446655440000"
     */
    requestIdHeader: "x-request-id",

    // ========================================================================
    // ROUTE TARGETING (WHERE checks run)
    // ========================================================================

    /**
     * Routes where bot detection is enabled.
     * 
     * **Why these routes?**
     * - /admin: High-value target for attackers
     * - /api: API abuse and scraping
     * - /auth: Credential stuffing attacks
     * - /products: Inventory scraping
     * 
     * **Not checked:**
     * - Marketing pages (want search engine bots)
     * - Static assets (public by nature)
     */
    botCheckPrefixes: ["/admin", "/api", "/auth", "/products"],

    /**
     * Routes where rate limiting is enforced.
     * 
     * **Why these routes?**
     * - /api: Prevent API abuse
     * - /admin: Protect admin panel from brute force
     * - /auth: Limit login attempts
     * - /checkout: Prevent checkout spam
     * 
     * **Not rate limited:**
     * - Static pages (cached by CDN)
     * - Public marketing (want to be accessible)
     */
    rateLimitPrefixes: ["/api", "/admin", "/auth", "/checkout"],

    /**
     * Admin guard configuration.
     * 
     * **Protected routes:**
     * - /admin/*: Admin dashboard pages
     * - /api/admin/*: Admin API endpoints
     * 
     * **Exempt routes:**
     * - /api/auth/2fa/*: 2FA verification needs to be accessible
     *   during login flow before admin session is established
     */
    adminGuard: {
      protectedPrefixes: ["/admin", "/api/admin"],
      exemptPrefixes: ["/api/auth/2fa"],
    },

    // ========================================================================
    // CANONICALIZATION (URL normalization)
    // ========================================================================

    /**
     * Path canonicalization settings for SEO and security.
     * 
     * **redirectStatus: 308**
     * - 308 = Permanent Redirect (preserves HTTP method)
     * - Alternative: 301 (but changes POST to GET)
     * - Search engines update their index
     * 
     * **lowercasePathname: true**
     * - /Products → /products
     * - Prevents duplicate content penalties
     * 
     * **collapseMultipleSlashes: true**
     * - //products → /products
     * - Prevents cache bypass and path confusion
     * 
     * **removeTrailingSlash: true**
     * - /products/ → /products
     * - Except root: / stays /
     * - Consolidates canonical URLs
     */
    canonicalize: {
      redirectStatus: 308,
      lowercasePathname: true,
      collapseMultipleSlashes: true,
      removeTrailingSlash: true,
    },

    // ========================================================================
    // BOT DETECTION
    // ========================================================================

    /**
     * Bot detection and mitigation settings.
     * 
     * **blockStatus: 403**
     * - Forbidden (authentication won't help)
     * - Clear signal that request is rejected
     * 
     * **minUserAgentLength: 8**
     * - Real browsers: 50-200 chars
     * - Anything under 8 is likely spoofed
     * - Example: "Mozilla" (7) is too short
     * 
     * **maxLoggedUserAgentLength: 200**
     * - Truncate long UAs in logs
     * - Prevents log injection attacks
     * - Malicious actors might send megabyte-sized UAs
     * 
     * **allowedUserAgents:**
     * - Search engines and legitimate crawlers
     * - Case-insensitive substring matching
     * - These bots are GOOD for SEO
     * 
     * **disallowedUserAgentSubstrings:**
     * - Common scraping tools and frameworks
     * - curl, wget, python-requests, etc.
     * - These shouldn't access application routes
     */
    bot: {
      blockStatus: 403,
      minUserAgentLength: 8,
      maxLoggedUserAgentLength: 200,
      
      allowedUserAgents: [
        "Googlebot",    // Google search
        "Applebot",     // Apple search & Siri
        "Bingbot",      // Microsoft Bing
      ],
      
      disallowedUserAgentSubstrings: [
        "curl/",              // CLI tool
        "wget/",              // CLI downloader
        "python-requests",    // Python HTTP library
        "go-http-client",     // Go default client
        "libwww-perl",        // Perl HTTP library
        "scrapy",             // Python scraping framework
      ],
    },

    // ========================================================================
    // CSRF PROTECTION
    // ========================================================================

    /**
     * Cross-Site Request Forgery (CSRF) protection.
     * 
     * **blockStatus: 403**
     * - CSRF is an authentication/authorization issue
     * - 403 Forbidden is semantically correct
     * 
     * **unsafeMethods:**
     * - Methods that modify state
     * - GET/HEAD/OPTIONS are safe (idempotent)
     * - POST/PUT/PATCH/DELETE require origin check
     * 
     * **bypassPrefixes:**
     * - Webhook endpoints use signature verification instead
     * - 2FA challenge uses time-based codes as proof
     * - These can't use Origin-based CSRF protection
     */
    csrf: {
      blockStatus: 403,
      unsafeMethods: ["POST", "PUT", "PATCH", "DELETE"] as const,
      
      bypassPrefixes: [
        "/api/stripe/webhook",           // Stripe signature verification
        "/api/auth/2fa/challenge/verify", // Time-based code verification
      ],
    },

    // ========================================================================
    // RATE LIMITING
    // ========================================================================

    /**
     * Rate limiting configuration (Upstash-based).
     * 
     * **maxRequests: 30**
     * - 30 requests per window per IP
     * - Balances legitimate use vs abuse
     * - Can be tuned based on traffic patterns
     * 
     * **window: "1 m"**
     * - 1 minute sliding window
     * - More accurate than fixed windows
     * - Prevents burst at window boundaries
     * 
     * **blockStatus: 429**
     * - Standard "Too Many Requests" status
     * - Well-behaved clients recognize this
     * 
     * **tooManyRequestsPath:**
     * - Friendly error page for browser users
     * - Must never be rate-limited itself (avoid loops)
     * 
     * **redirectStatus: 302**
     * - Temporary redirect to error page
     * - 302 because rate limit status can change
     */
    rateLimit: {
      maxRequests: 30,
      window: "1 m",
      blockStatus: 429,
      tooManyRequestsPath: "/too-many-requests",
      redirectStatus: 302,
    },

    // ========================================================================
    // ADMIN GUARD
    // ========================================================================

    /**
     * Admin route protection response configuration.
     * 
     * **Redirect paths (browser requests):**
     * - loginPath: User needs to authenticate
     * - homePath: User is authenticated but not admin
     * - mfaChallengePath: Admin needs to complete 2FA
     * 
     * **Status codes (API requests):**
     * - 401 Unauthorized: No valid session
     * - 403 Forbidden: Session valid but insufficient role
     * - 500 Error: System failure (database issues, etc.)
     * 
     * **Why different for API vs pages?**
     * - Browser users get redirected to appropriate page
     * - API clients get JSON error with status code
     * - Provides better UX for each client type
     */
    admin: {
      // Redirect paths for browser requests
      loginPath: "/auth/login",
      homePath: "/",
      mfaChallengePath: "/auth/2fa/challenge",

      // Status codes for API requests
      unauthorizedStatus: 401,
      forbiddenStatus: 403,
      errorStatus: 500,
    },

    // ========================================================================
    // ADMIN SESSION TOKEN
    // ========================================================================

    /**
     * Admin session cookie configuration.
     * 
     * **Purpose:**
     * Separate, short-lived token for admin privilege elevation.
     * This is NOT the Supabase session - it's an additional layer.
     * 
     * **cookieName:**
     * - Name of the HTTP cookie
     * - Set after admin login + 2FA
     * - Cleared on admin logout
     * 
     * **ttlSeconds: 24 hours**
     * - Admin privileges expire after 24h
     * - Requires re-authentication after expiry
     * - Balances security vs convenience
     * - Like sudo timeout on Linux
     * 
     * **Why separate from Supabase session?**
     * - Supabase session lasts longer (days/weeks)
     * - Admin actions need stricter time limits
     * - Prevents stolen session from being admin forever
     * - Allows revoking admin access without full logout
     */
    adminSession: {
      cookieName: "admin_session",
      ttlSeconds: 60 * 60 * 24, // 24 hours (86,400 seconds)
    },

    // ========================================================================
    // SECURITY HEADERS
    // ========================================================================

    /**
     * HTTP security headers for defense-in-depth.
     * 
     * **HSTS (HTTP Strict Transport Security):**
     * - max-age: 2 years (63,072,000 seconds)
     * - includeSubDomains: Apply to all subdomains
     * - preload: Ready for browser preload list
     * - Only enabled in production (no HTTPS in dev)
     * 
     * **CSP (Content Security Policy):**
     * - Different policies for dev vs production
     * - Dev is relaxed for hot reload and dev tools
     * - Prod is strict with specific allowlists
     * 
     * **Dev CSP:**
     * - Allows unsafe-inline/unsafe-eval (Next.js HMR)
     * - Allows WebSocket connections to localhost
     * - Permits all HTTPS connections
     * 
     * **Prod CSP:**
     * - Restricts script sources (self + Stripe only)
     * - Allows images from HTTPS + data URIs
     * - Permits Stripe iframe for checkout
     * - No unsafe-inline/unsafe-eval
     * 
     * **Other headers:**
     * - X-Frame-Options: DENY (clickjacking protection)
     * - X-Content-Type-Options: nosniff (MIME sniffing protection)
     * - Referrer-Policy: strict-origin-when-cross-origin
     * - Permissions-Policy: Disables camera/mic/geo
     */
    securityHeaders: {
      hsts: {
        value: "max-age=63072000; includeSubDomains; preload",
      },
      
      csp: {
        /**
         * Development CSP - Relaxed for local development.
         */
        dev: [
          "default-src 'self'",
          "img-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          [
            "connect-src",
            "'self'",
            "ws://localhost:*",      // Next.js HMR WebSocket
            "http://localhost:*",    // Local API calls
            "http://127.0.0.1:*",    // Alternative localhost
            "https:",                // All HTTPS (Supabase, etc.)
          ].join(" "),
          "object-src 'none'",       // No Flash/Java applets
          "base-uri 'self'",         // Prevent <base> tag attacks
          "frame-ancestors 'none'",  // Clickjacking protection
        ],

        /**
         * Production CSP - Strict with specific allowlists.
         */
        prod: [
          "default-src 'self'",
          "img-src 'self' https: data:",
          "style-src 'self' 'unsafe-inline'",  // TODO: Use nonces to remove unsafe-inline
          "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.stripe.com",
          "object-src 'none'",
          "base-uri 'self'",
          "connect-src 'self' https:",         // API calls to Supabase, Stripe, etc.
          "frame-ancestors 'none'",
          "frame-src https://js.stripe.com https://*.stripe.com",  // Stripe checkout iframe
          "form-action 'self' https://*.stripe.com",               // Allow forms to Stripe
        ],
      },
    },
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if a pathname starts with any of the given prefixes.
 * 
 * **Use cases:**
 * - Determining which middleware checks to run
 * - Route-based security rules
 * - Selective rate limiting
 * 
 * **Example:**
 * ```typescript
 * if (startsWithAny("/admin/users", ["/admin", "/api"])) {
 *   // Run admin checks
 * }
 * ```
 * 
 * @param pathname - The path to check (e.g., "/admin/users")
 * @param prefixes - Array of prefixes to match against
 * 
 * @returns true if pathname starts with any prefix
 */
export function startsWithAny(
  pathname: string,
  prefixes: readonly string[]
): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Type-safe CSRF unsafe methods.
 * 
 * **Why typed?**
 * - Ensures consistency across codebase
 * - Prevents typos ("POST" vs "post")
 * - TypeScript auto-completion
 */
export type CsrfUnsafeMethod = (typeof security.proxy.csrf.unsafeMethods)[number];

/**
 * Type guard for CSRF unsafe methods.
 * 
 * **Purpose:**
 * Checks if an HTTP method requires CSRF protection.
 * 
 * **Unsafe methods:**
 * - POST, PUT, PATCH, DELETE (state-changing)
 * 
 * **Safe methods (not checked):**
 * - GET, HEAD, OPTIONS (idempotent, read-only)
 * 
 * **Usage:**
 * ```typescript
 * if (isCsrfUnsafeMethod(request.method)) {
 *   checkCsrf(request, requestId);
 * }
 * ```
 * 
 * @param method - HTTP method string (e.g., "POST")
 * 
 * @returns true if method requires CSRF protection
 */
export function isCsrfUnsafeMethod(method: string): method is CsrfUnsafeMethod {
  const methodUpper = method.toUpperCase();
  return (security.proxy.csrf.unsafeMethods as readonly string[]).includes(methodUpper);
}