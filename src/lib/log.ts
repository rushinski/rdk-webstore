// src/lib/log.ts

export type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  event?: string;
  [key: string]: any; // allows additional metadata
}

/**
 * Central logging utility for the entire app.
 * Prints JSON logs consumed by Vercel, staging, prod, and local dev.
 */
export function log(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Always stringify to JSON so logs are consistent everywhere
  console.log(JSON.stringify(entry));
}

/**
 * Helper for logging errors with a stack trace.
 */
export function logError(error: any, context: LogContext = {}) {
  const entry = {
    level: "error",
    message: error?.message || "Unknown error",
    timestamp: new Date().toISOString(),
    stack: error?.stack,
    ...context,
  };

  console.error(JSON.stringify(entry));
}
