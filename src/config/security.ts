// src/config/security.ts

const allowLocalSupabaseInProd = true;
const prodConnectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.goshippo.com",
  // Stripe kept for admin Connect embeds — remove once Stripe is fully deprecated
  "https://api.stripe.com",
  "https://connect-js.stripe.com",
  "https://*.stripe.com",
  "https://vitals.vercel-insights.com",
  "https://*.vercel-scripts.com",
  // PayRilla payment gateway
  "https://api.payrillagateway.com",
  "https://api.sandbox.payrillagateway.com",
  // NoFraud device fingerprinting beacon
  "https://*.nofraud.com",
  // Google Pay JS API
  "https://pay.google.com",

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
    botCheckPrefixes: ["/admin", "/api", "/auth", "/products", "/store"],
    rateLimitPrefixes: ["/api", "/store"],
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
        "headless",
        "phantom",
        "bot",
        "crawler",
        "spider",
        "scraper",
        "scanner",
        "whatweb",
        "nikto",
        "masscan",
        "nmap",
      ],
    },

    csrf: {
      blockStatus: 403,
      unsafeMethods: ["POST", "PUT", "PATCH", "DELETE"] as const,
      maxOriginLength: 512,

      bypassPrefixes: [
        "/api/webhooks/stripe",
        "/api/webhooks/payrilla",
        "/api/auth/2fa/challenge/verify",
      ],
    },

    rateLimit: {
      store: "upstash",
      enabled: true,
      applyInLocalDev: false,

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
          "img-src 'self' data: https: blob:",
          "style-src 'self' 'unsafe-inline' https://*.payrillagateway.com",
          // Stripe kept for admin Connect embeds — remove once Stripe is fully deprecated
          "script-src 'self' 'unsafe-inline' https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://*.vercel-scripts.com https://*.payrillagateway.com https://services.nofraud.com https://pay.google.com",
          "worker-src 'self' blob:",
          [
            "connect-src",
            "'self'",
            "ws://localhost:*",
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://*.nofraud.com",
            "https://pay.google.com",
            "https:",
          ].join(" "),
          "object-src 'none'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "font-src 'self' data:",
          // PayRilla tokenization iframe + Stripe Connect embeds
          "frame-src 'self' blob: https://*.payrillagateway.com https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://www.openstreetmap.org https://*.openstreetmap.org",
          // Stripe kept in form-action for Connect redirects — remove once deprecated
          "form-action 'self' https://*.stripe.com",
        ],

        prod: [
          "default-src 'self'",
          "img-src 'self' data: blob: https://*.supabase.co https://*.openstreetmap.org",
          "style-src 'self' 'unsafe-inline' https://*.payrillagateway.com",
          // Stripe kept for admin Connect embeds — remove once Stripe is fully deprecated
          "script-src 'self' 'unsafe-inline' https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://*.vercel-scripts.com https://*.payrillagateway.com https://services.nofraud.com https://pay.google.com",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",

          // PayRilla + NoFraud + Google Pay added; Stripe kept for admin Connect embeds
          `connect-src ${prodConnectSrc}`,

          "frame-ancestors 'none'",
          "font-src 'self' data:",
          // PayRilla tokenization iframe + Stripe Connect embeds
          "frame-src 'self' blob: https://*.payrillagateway.com https://connect-js.stripe.com https://js.stripe.com https://*.stripe.com https://www.openstreetmap.org https://*.openstreetmap.org",
          // Stripe kept in form-action for Connect redirects — remove once deprecated
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
