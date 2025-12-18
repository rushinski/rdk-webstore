// src/config/security.ts
export const security = {
  proxy: {
    requestIdHeader: "x-request-id",

    // ---- Proxy routing gates (WHERE checks run) ----
    botCheckPrefixes: ["/admin", "/api", "/auth", "/products"],
    rateLimitPrefixes: ["/api", "/admin", "/auth", "/checkout"],

    adminGuard: {
      protectedPrefixes: ["/admin", "/api/admin"],
      exemptPrefixes: ["/api/auth/2fa"],
    },

    // ---- Canonicalization ----
    canonicalize: {
      redirectStatus: 308,
      lowercasePathname: true,
      collapseMultipleSlashes: true,
      removeTrailingSlash: true,
    },

    // ---- Bot mitigation ----
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
      ],
    },

    // ---- CSRF ----
    csrf: {
      blockStatus: 403,
      unsafeMethods: ["POST", "PUT", "PATCH", "DELETE"] as const,
      bypassPrefixes: ["/api/stripe/webhook", "/api/auth/2fa/challenge/verify"],
    },

    // ---- Rate limiting (HOW rate limit works) ----
    rateLimit: {
      maxRequests: 30,
      window: "1 m",
      blockStatus: 429,
      tooManyRequestsPath: "/too-many-requests",
      redirectStatus: 302,
    },

    // ---- Admin guard responses ----
    admin: {
      // redirects for browser requests
      loginPath: "/auth/login",
      homePath: "/",
      mfaChallengePath: "/auth/2fa/challenge",

      // status codes for API requests
      unauthorizedStatus: 401,
      forbiddenStatus: 403,
      errorStatus: 500,
    },

    // ---- Admin session cookie (shorter “admin gate” timer) ----
    adminSession: {
      cookieName: "admin_session",
      ttlSeconds: 60 * 60 * 24, // 24 hours
    },

    // ---- Security headers ----
    securityHeaders: {
      hsts: {
        value: "max-age=63072000; includeSubDomains; preload",
      },
      csp: {
        dev: [
          "default-src 'self'",
          "img-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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
        ],
        prod: [
          "default-src 'self'",
          "img-src 'self' https: data:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.stripe.com",
          "object-src 'none'",
          "base-uri 'self'",
          "connect-src 'self' https:",
          "frame-ancestors 'none'",
          "frame-src https://js.stripe.com https://*.stripe.com",
          "form-action 'self' https://*.stripe.com",
        ],
      },
    },
  },
} as const;

export function startsWithAny(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((p) => pathname.startsWith(p));
}

export type CsrfUnsafeMethod = (typeof security.proxy.csrf.unsafeMethods)[number];

export function isCsrfUnsafeMethod(method: string): method is CsrfUnsafeMethod {
  const upper = method.toUpperCase();
  return (security.proxy.csrf.unsafeMethods as readonly string[]).includes(upper);
}
