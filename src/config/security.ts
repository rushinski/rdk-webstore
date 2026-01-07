// src/config/security.ts
export const security = {
  contact: {
    rateLimit: {
      maxRequests: 5,
      window: "10 m",
      blockStatus: 429,
    },
    attachments: {
      maxFiles: 5,
      maxBytes: 5 * 1024 * 1024,
      allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    },
  },
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
      bypassPrefixes: ["/api/webhooks/stripe"],
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
         * (Updated for Stripe Connect embedded components)
         */
        dev: [
          "default-src 'self'",
          // Allow Stripe-hosted images that may be used by embedded components
          "img-src 'self' data: https: blob: https://*.stripe.com",
          "style-src 'self' 'unsafe-inline'",
          // Allow Stripe Connect JS loaders
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com",
          [
            "connect-src",
            "'self'",
            "ws://localhost:*",      // Next.js HMR WebSocket
            "http://localhost:*",    // Local API calls
            "http://127.0.0.1:*",    // Alternative localhost
            "https:",                // All HTTPS (Supabase, Stripe, etc.)
          ].join(" "),
          "object-src 'none'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          // Allow Stripe Connect embedded iframes + your existing map frames
          "font-src 'self' https://*.stripe.com data:",
          "frame-src 'self' blob: https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://www.openstreetmap.org https://*.openstreetmap.org",
          "form-action 'self' https://*.stripe.com",
        ],

        /**
         * Production CSP - Strict with specific allowlists.
         * (Updated for Stripe Connect embedded components)
         */
        prod: [
          "default-src 'self'",
          "img-src 'self' https: data: blob: https://*.stripe.com",
          "style-src 'self' 'unsafe-inline'", // TODO: Use nonces to remove unsafe-inline
          // Include connect-js.stripe.com explicitly
          "script-src 'self' 'unsafe-inline' https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com",
          "object-src 'none'",
          "base-uri 'self'",
          // Keep HTTPS wildcard, it covers Stripe API calls; fine for MVP, tighten later if desired
          "connect-src 'self' https:",
          "frame-ancestors 'none'",
          // Allow Connect embedded frames + Checkout frames + your existing map frames
          "font-src 'self' https://*.stripe.com data:",
          "frame-src 'self' blob: https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://www.openstreetmap.org https://*.openstreetmap.org",
          "form-action 'self' https://*.stripe.com",
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
