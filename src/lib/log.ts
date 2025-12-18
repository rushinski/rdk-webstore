// src/lib/log.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

export type LogLevel =
  | "info"   // Normal system operations
  | "warn"   // Suspicious, abnormal, or security-relevant behavior
  | "error"; // Failures that break correctness or availability

export type LogLayer =
  | "proxy"         // Canonicalize, bot, csrf, rate-limit, admin guard
  | "auth"          // Sessions, login, 2FA, Supabase auth
  | "api"           // Next.js route handlers (controllers)
  | "service"       // Domain logic (OrderService, ProductService)
  | "repository"    // DB queries + RLS checks
  | "job"           // Async work, Stripe webhooks, cache invalidation
  | "stripe"        // Payments, webhook validation, checkout flow
  | "cache"         // ISR, revalidateTag, stale cache behavior
  | "infra"         // Migrations, env validation, CI/CD, config issues
  | "observability" // Sentry/PostHog events & ingestion
  | "frontend"      // Client-side logs (hydration, UI errors)
  | "unknown";      // Fallback for uncategorized logs

export interface LogEntry {
  level: LogLevel;
  layer: LogLayer;
  message: string;

  // canonical fields
  requestId?: string | null;
  userId?: string | null;
  route?: string | null;
  method?: string | null;
  status?: number | null;
  latency_ms?: number | null;
  stripeSessionId?: string | null;

  // extended metadata
  [key: string]: any;
}

const RESERVED_KEYS = new Set([
  "timestamp",
  "level",
  "layer",
  "message",
  "stack",
  "requestId",
  "userId",
  "route",
  "method",
  "status",
  "latency_ms",
  "stripeSessionId",
]);

const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "apikey",
  "api_key",
  "token",
  "access_token",
  "refresh_token",
  "password",
  "secret",
]);

function sanitizeExtended(extended: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extended)) {
    // prevent overriding canonical keys
    if (RESERVED_KEYS.has(k)) continue;

    // simple redaction guardrail
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
      continue;
    }

    out[k] = v;
  }
  return out;
}

function safeStringify(payload: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(payload, (_key, value) => {
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  });
}

function write(level: LogLevel, output: unknown) {
  const line = safeStringify(output);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function log(entry: LogEntry) {
  const {
    level,
    layer,
    message,
    requestId = null,
    userId = null,
    route = null,
    method = null,
    status = null,
    latency_ms = null,
    stripeSessionId = null,
    ...extendedRaw
  } = entry;

  const extended = sanitizeExtended(extendedRaw);

  write(level, {
    timestamp: new Date().toISOString(),
    level,
    layer,
    message,
    requestId,
    userId,
    route,
    method,
    status,
    latency_ms,
    stripeSessionId,
    ...extended,
  });
}

export function logError(error: unknown, entry: Partial<LogEntry> = {}) {
  const err = error instanceof Error ? error : new Error(String(error));

  const {
    layer = "unknown",
    requestId = null,
    userId = null,
    route = null,
    method = null,
    status = null,
    latency_ms = null,
    stripeSessionId = null,
    ...extendedRaw
  } = entry;

  const extended = sanitizeExtended(extendedRaw);

  write("error", {
    timestamp: new Date().toISOString(),
    level: "error",
    layer,
    message: err.message || "Unknown error",
    stack: err.stack,
    requestId,
    userId,
    route,
    method,
    status,
    latency_ms,
    stripeSessionId,
    ...extended,
  });
}