// src/config/security.ts

const allowLocalSupabaseInProd = true
const prodConnectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.goshippo.com",
  "https://api.stripe.com",
  "https://connect-js.stripe.com",
  "https://*.stripe.com",

  // ✅ only when explicitly enabled (for local prod-mode testing)
  ...(allowLocalSupabaseInProd
    ? [
        "https://localhost:*",
        "wss://localhost:*",
        "https://127.0.0.1:*",
        "wss://127.0.0.1:*",
      ]
    : []),
].join(" ");

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
    rateLimitPrefixes: ["/"],
    adminGuard: {
      protectedPrefixes: ["/admin", "/api/admin"],
      exemptPrefixes: ["/api/auth/2fa"],
    },

    canonicalize: {
      redirectStatus: 308,
      lowercasePathname: true,
      collapseMultipleSlashes: true,
      removeTrailingSlash: true,
      maxPathLength: 200,
    },

    bot: {
      blockStatus: 403,
      minUserAgentLength: 8,
      maxLoggedUserAgentLength: 200,

      allowedUserAgents: [
        "Googlebot",
        "Applebot",
        "Bingbot",
      ],

      disallowedUserAgentSubstrings: [
        "curl/",
        "wget/",
        "python-requests",
        "go-http-client",
        "libwww-perl",
        "scrapy",
        "aiohttp",       
      ]
    },

    csrf: {
      blockStatus: 403,
      unsafeMethods: ["POST", "PUT", "PATCH", "DELETE"] as const,
      maxOriginLength: 512,

      bypassPrefixes: [
        "/api/stripe/webhook",
        "/api/auth/2fa/challenge/verify",
      ],
    },

    rateLimit: {
      store: "upstash",
      enabled: true,
      ignorePrefetch: true,
      applyInLocalDev: true,
      
      // Default window for all limits
      window: "1 m",
      
      // Global per-IP limit (applies across all routes)
      maxRequestsGlobal: 300,
      
      // Default per-path limit (fallback for routes not specified below)
      maxRequests: 60,
      
      blockStatus: 429,
      tooManyRequestsPath: "/too-many-requests",
      redirectStatus: 302,

      // Per-route rate limit configurations
      routeLimits: [
        // Storefront routes - very permissive since they have heavy prefetching
        {
          pathPrefix: "/store",
          maxRequests: 200,  // Much higher limit for store browsing
          window: "1 m",
        },
        {
          pathPrefix: "/brands",
          maxRequests: 100,
          window: "1 m",
        },
        
        // API routes - moderate limits
        {
          pathPrefix: "/api/store",
          maxRequests: 100,
          window: "1 m",
        },
        {
          pathPrefix: "/api/account",
          maxRequests: 60,
          window: "1 m",
        },
        
        // Auth routes - stricter limits
        {
          pathPrefix: "/api/auth/login",
          maxRequests: 10,
          window: "5 m",
        },
        {
          pathPrefix: "/api/auth/register",
          maxRequests: 5,
          window: "5 m",
        },
        {
          pathPrefix: "/api/auth/forgot-password",
          maxRequests: 3,
          window: "15 m",
        },
        
        // Checkout - moderate limits
        {
          pathPrefix: "/api/checkout",
          maxRequests: 30,
          window: "1 m",
        },
        {
          pathPrefix: "/checkout",
          maxRequests: 50,
          window: "1 m",
        },
        
        // Admin routes - strict limits
        {
          pathPrefix: "/admin",
          maxRequests: 100,
          window: "1 m",
        },
        {
          pathPrefix: "/api/admin",
          maxRequests: 60,
          window: "1 m",
        },
        
        // Contact form - very strict
        {
          pathPrefix: "/api/contact",
          maxRequests: 5,
          window: "10 m",
        },
      ],

      // Routes that bypass rate limiting entirely
      bypassPrefixes: [
        "/api/webhooks/stripe",
        "/api/webhooks/shippo",
        "/_next/",
        "/favicon.ico",
        "/robots.txt",
        "/sitemap.xml",
      ],
    },

    admin: {
      loginPath: "/auth/login",
      homePath: "/",
      mfaChallengePath: "/auth/2fa/challenge",
      unauthorizedStatus: 401,
      forbiddenStatus: 403,
      errorStatus: 500,
    },

    adminSession: {
      cookieName: "admin_session",
      ttlSeconds: 60 * 60 * 24,
    },

    securityHeaders: {
      hsts: {
        value: "max-age=63072000; includeSubDomains; preload",
      },

      csp: {
        dev: [
          "default-src 'self'",
          "img-src 'self' data: https: blob: https://*.stripe.com",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com",
          [
            "connect-src",
            "'self'",
            "ws://localhost:*",
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https:",
          ].join(" "),
          "object-src 'none'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "font-src 'self' https://*.stripe.com data:",
          "frame-src 'self' blob: https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://www.openstreetmap.org https://*.openstreetmap.org",
          "form-action 'self' https://*.stripe.com",
        ],

        prod: [
          "default-src 'self'",
          "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com https://*.openstreetmap.org",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com",
          "object-src 'none'",
          "base-uri 'self'",

          // ✅ use computed connect-src
          `connect-src ${prodConnectSrc}`,

          "frame-ancestors 'none'",
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

// Helper to get the appropriate rate limit config for a path
export function getRateLimitConfigForPath(pathname: string) {
  const { routeLimits, maxRequests, window } = security.proxy.rateLimit;
  
  // Find the most specific matching route (longest prefix match)
  let matchedConfig = null;
  let longestMatch = 0;
  
  for (const config of routeLimits) {
    if (pathname.startsWith(config.pathPrefix) && config.pathPrefix.length > longestMatch) {
      matchedConfig = config;
      longestMatch = config.pathPrefix.length;
    }
  }
  
  // Return matched config or default
  return matchedConfig || { maxRequests, window, pathPrefix: pathname };
}