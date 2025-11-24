// src/proxy/request-id.ts

// Ensure compatibility with proxy runtime
const { crypto } = globalThis;

/**
 * Generate a unique Request ID (v4 UUID)
 * Supports optional prefixes (req, admin, stripe, job, etc.)
 */
export function createRequestId(prefix = "req") {
  return `${prefix}-${crypto.randomUUID()}`;
}
