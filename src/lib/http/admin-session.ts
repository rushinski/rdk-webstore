// src/lib/http/admin-session.ts
import { EncryptJWT, jwtDecrypt, type JWTPayload } from "jose";

import { env } from "@/config/env";
import { security } from "@/config/security";

export interface AdminSessionPayload extends JWTPayload {
  v: 1;
  sub: string;
}
let cachedKey: Uint8Array | null = null;

function base64ToBytes(base64String: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const binaryString = globalThis.atob(base64String);

    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  const NodeBuffer = (globalThis as any).Buffer;

  if (NodeBuffer && typeof NodeBuffer.from === "function") {
    return new Uint8Array(NodeBuffer.from(base64String, "base64"));
  }

  throw new Error(
    "No base64 decoder available in this runtime. " +
      "This should never happen in Vercel/Node environments.",
  );
}

function getAdminSessionKey(): Uint8Array {
  if (cachedKey) {
    return cachedKey;
  }

  const secret = env.ADMIN_SESSION_SECRET;
  const keyBytes = base64ToBytes(secret);

  if (keyBytes.length !== 32) {
    throw new Error(
      `ADMIN_SESSION_SECRET must be a base64-encoded 32-byte key. ` +
        `Got ${keyBytes.length} bytes. ` +
        `Generate with: openssl rand -base64 32`,
    );
  }

  cachedKey = keyBytes;

  return keyBytes;
}

export async function createAdminSessionToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + security.proxy.adminSession.ttlSeconds;

  const key = getAdminSessionKey();

  return new EncryptJWT({
    v: 1,
    sub: userId,
  })
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
    })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .encrypt(key);
}

export async function verifyAdminSessionToken(
  token: string,
): Promise<AdminSessionPayload | null> {
  try {
    const key = getAdminSessionKey();

    const { payload, protectedHeader } = await jwtDecrypt(token, key, {
      clockTolerance: 5,
    });

    if (protectedHeader.alg !== "dir" || protectedHeader.enc !== "A256GCM") {
      return null;
    }

    const version = (payload as { v?: unknown }).v;

    if (version !== 1) {
      return null;
    }

    const userId = payload.sub;

    if (typeof userId !== "string" || userId.length === 0) {
      return null;
    }

    return payload as AdminSessionPayload;
  } catch (error) {
    return null;
  }
}
