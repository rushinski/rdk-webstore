// src/lib/crypto/admin-session.ts
import { EncryptJWT, jwtDecrypt, JWTPayload } from "jose";

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export interface AdminSessionPayload extends JWTPayload {
  v: 1;
  sub?: string;
  iat: number;
  exp: number;
}

/**
 * Reads and prepares the symmetric key for JWE (dir + A256GCM).
 * Must be validated in src/config/env.ts (ADMIN_SESSION_SECRET required).
 */
function getAdminSessionKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set");
  }

  // Interpret ADMIN_SESSION_SECRET as a base64-encoded 32-byte key
  // (your current value `Q3ZmS2pQ0Jjrx0t9SHPu0y3x2pZofYl1ez7ISxjlv3Y=` fits this pattern)
  const raw = Buffer.from(secret, "base64"); // Node runtime

  if (raw.length !== 32) {
    // Fail fast if misconfigured
    throw new Error(
      `ADMIN_SESSION_SECRET must be a base64-encoded 32-byte key (got ${raw.length} bytes)`
    );
  }

  return raw;
}

/**
 * Create a signed & encrypted admin session token (JWE) with 24h expiry.
 */
export async function createAdminSessionToken(userId?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ADMIN_SESSION_TTL_SECONDS;

  const payload: AdminSessionPayload = {
    v: 1,
    sub: userId,
    iat: now,
    exp,
  };

  const key = getAdminSessionKey();

  const jwt = await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .encrypt(key);

  return jwt;
}

/**
 * Verify and decrypt an admin session token.
 * Returns payload if valid, or null if tampered / expired / invalid.
 */
export async function verifyAdminSessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const key = getAdminSessionKey();
    const { payload } = await jwtDecrypt(token, key);

    // Basic sanity checks
    if (payload.v !== 1) return null;
    if (typeof payload.exp !== "number" || typeof payload.iat !== "number") {
      return null;
    }

    // NOTE: jwtDecrypt already validates exp, but we keep a defensive check:
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload as AdminSessionPayload;
  } catch {
    // Any error: malformed, tampered, wrong key, expired
    return null;
  }
}
