// src/lib/crypto/admin-session.ts
import { EncryptJWT, jwtDecrypt, type JWTPayload } from "jose";

import { env } from "@/config/env";
import { security } from "@/config/security";

export interface AdminSessionPayload extends JWTPayload {
  /**
   * Token version for forwards-compatible rotations.
   * Increment if payload structure or validation rules change.
   */
  v: 1;

  /**
   * Bound admin user id (required). This prevents “floating” admin tokens.
   */
  sub: string;
}

let cachedKey: Uint8Array | null = null;

/**
 * Base64 → bytes in a way that works in both Edge (Web APIs) and Node.
 * Edge runtime does not reliably support Node's `Buffer`.
 */
function base64ToBytes(value: string): Uint8Array {
  // Web/Edge path
  if (typeof globalThis.atob === "function") {
    const raw = globalThis.atob(value);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  // Node fallback (local scripts/tests)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeBuffer = (globalThis as any).Buffer;
  if (nodeBuffer) return new Uint8Array(nodeBuffer.from(value, "base64"));

  throw new Error("No base64 decoder available in this runtime");
}

/**
 * Reads and prepares the symmetric key for JWE (alg=dir, enc=A256GCM).
 * Must be enforced by `src/config/env.ts` (ADMIN_SESSION_SECRET required).
 */
function getAdminSessionKey(): Uint8Array {
  if (cachedKey) return cachedKey;

  const secret = env.ADMIN_SESSION_SECRET;
  const raw = base64ToBytes(secret);

  // A256GCM expects 32-byte key when using "dir"
  if (raw.length !== 32) {
    throw new Error(
      `ADMIN_SESSION_SECRET must be a base64-encoded 32-byte key (got ${raw.length} bytes)`
    );
  }

  cachedKey = raw;
  return raw;
}

/**
 * Create an encrypted admin session token (JWE) with short TTL.
 *
 * This token is *separate* from the Supabase session and is used to gate admin access
 * behind an additional, short-lived proof.
 */
export async function createAdminSessionToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + security.proxy.adminSession.ttlSeconds;

  const key = getAdminSessionKey();

  return new EncryptJWT({ v: 1, sub: userId })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .encrypt(key);
}

/**
 * Verify and decrypt an admin session token.
 * Returns payload if valid, otherwise null (tampered / expired / invalid).
 */
export async function verifyAdminSessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const key = getAdminSessionKey();

    const { payload, protectedHeader } = await jwtDecrypt(token, key, {
      // Small tolerance for clock skew across edge regions
      clockTolerance: 5,
    });

    // Defensive: ensure expected algorithms.
    if (protectedHeader.alg !== "dir" || protectedHeader.enc !== "A256GCM") return null;

    const v = (payload as { v?: unknown }).v;
    const sub = payload.sub;

    if (v !== 1) return null;
    if (typeof sub !== "string" || sub.length === 0) return null;

    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}
