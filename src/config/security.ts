// src/config/security.ts

const allowLocalSupabaseInProd = true;
const prodConnectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.goshippo.com",
  "https://api.stripe.com",
  "https://connect-js.stripe.com",
  "https://*.stripe.com",
  "https://vitals.vercel-insights.com",
  "https://*.vercel-scripts.com",

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
    rateLimitPrefixes: ["/api"],
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

      allowedUserAgents: ["Googlebot", "Applebot", "Bingbot"],

      disallowedUserAgentSubstrings: [
        "curl/",
        "wget/",
        "python-requests",
        "go-http-client",
        "libwww-perl",
        "scrapy",
        "aiohttp",
      ],
    },

    csrf: {
      blockStatus: 403,
      unsafeMethods: ["POST", "PUT", "PATCH", "DELETE"] as const,
      maxOriginLength: 512,

      bypassPrefixes: ["/api/stripe/webhook", "/api/auth/2fa/challenge/verify"],
    },

    rateLimit: {
      store: "upstash",
      enabled: false,
      applyInLocalDev: true,

      blockStatus: 429,
      tooManyRequestsPath: "/too-many-requests",
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
          "script-src 'self' 'unsafe-inline' https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://*.vercel-scripts.com",
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
          "script-src 'self' 'unsafe-inline' https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://*.vercel-scripts.com",
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

export function startsWithAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export type CsrfUnsafeMethod = (typeof security.proxy.csrf.unsafeMethods)[number];

export function isCsrfUnsafeMethod(method: string): method is CsrfUnsafeMethod {
  const methodUpper = method.toUpperCase();
  return (security.proxy.csrf.unsafeMethods as readonly string[]).includes(methodUpper);
}
