export type LogLevel = 
  | "info"          // Normal system operations
  | "warn"          // Suspicious, abnormal, or security-relevant behavior
  | "error";        // Failures that break correctness or availability

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
  | "frontend";     // Client-side logs (hydration, UI errors)

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

export function log(entry: LogEntry) {
  // Extract canonical fields
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
    ...extended
  } = entry;

  const output = {
    timestamp: new Date().toISOString(),

    // canonical logging fields
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

    // extended metadata (safe - cannot overwrite canonical keys)
    ...extended,
  };

  console.log(JSON.stringify(output));
}

export function logError(error: any, entry: Partial<LogEntry> = {}) {
  const {
    layer = "infra",
    requestId = null,
    userId = null,
    route = null,
    method = null,
    status = null,
    latency_ms = null,
    stripeSessionId = null,
    ...extended
  } = entry;

  const output = {
    timestamp: new Date().toISOString(),
    level: "error",
    layer,
    message: error?.message ?? "Unknown error",
    stack: error?.stack,

    requestId,
    userId,
    route,
    method,
    status,
    latency_ms,
    stripeSessionId,

    ...extended,
  };

  console.error(JSON.stringify(output));
}