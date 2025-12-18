// src/config/security.ts
export const security = {
  proxy: {
    requestIdHeader: "x-request-id",
    botCheckPrefixes: ["/admin", "/api", "/auth", "/products"],
    rateLimitPrefixes: ["/api", "/admin", "/auth", "/checkout"],
    adminGuard: {
      protectedPrefixes: ["/admin", "/api/admin"],
      exemptPrefixes: ["/api/auth/2fa"],
    },

    canonicalize: {
      redirectStatus: 308,
      lowercasePathname: true,
      collapseMultipleSlashes: true,
      removeTrailingSlash: true,
    },

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

    csrf: {
      blockStatus: 403,
      unsafeMethods: ["POST", "PUT", "PATCH", "DELETE"] as const,
      
      bypassPrefixes: [
        "/api/stripe/webhook",           // Stripe signature verification
        "/api/auth/2fa/challenge/verify", // Time-based code verification
      ],
    },

    rateLimit: {
      maxRequests: 30,
      window: "1 m",
      blockStatus: 429,
      tooManyRequestsPath: "/too-many-requests",
      redirectStatus: 302,
    },

    admin: {
      loginPath: "/auth/login",
      homePath: "/",
      mfaChallengePath: "/auth/2fa/challenge",

      // Status codes for API requests
      unauthorizedStatus: 401,
      forbiddenStatus: 403,
      errorStatus: 500,
    },

    adminSession: {
      cookieName: "admin_session",
      ttlSeconds: 60 * 60 * 24, // 24 hours (86,400 seconds)
    },

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

export function startsWithAny(
  pathname: string,
  prefixes: readonly string[]
): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export type CsrfUnsafeMethod = (typeof security.proxy.csrf.unsafeMethods)[number];

export function isCsrfUnsafeMethod(method: string): method is CsrfUnsafeMethod {
  const methodUpper = method.toUpperCase();
  return (security.proxy.csrf.unsafeMethods as readonly string[]).includes(methodUpper);
}