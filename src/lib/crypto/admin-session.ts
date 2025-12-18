// src/lib/crypto/admin-session.ts
import { EncryptJWT, jwtDecrypt, type JWTPayload } from "jose";

import { env } from "@/config/env";
import { security } from "@/config/security";

/**
 * Admin session token payload structure.
 * 
 * **Why a separate token?**
 * Supabase session alone is insufficient for admin privilege elevation:
 * - Supabase sessions last days/weeks
 * - Admin actions need stricter time limits (24h)
 * - Stolen session shouldn't grant permanent admin access
 * - Allows revoking admin privileges without full logout
 * 
 * **Token lifecycle:**
 * 1. User authenticates with Supabase (email + password)
 * 2. Profile role is verified as "admin"
 * 3. User completes 2FA challenge
 * 4. Admin session token is created and set as cookie
 * 5. Token is validated on every admin route access
 * 6. Token expires after 24 hours
 * 
 * **Security properties:**
 * - Encrypted (JWE, not JWT): Payload is opaque to client
 * - Bound to user ID: Cannot be used for different user
 * - Short-lived: Expires after 24h (configurable)
 * - Versioned: Can rotate token format without breaking existing tokens
 */
export interface AdminSessionPayload extends JWTPayload {
  /**
   * Token version for forward-compatible format changes.
   * 
   * **Purpose:**
   * Allows evolving token structure without invalidating all existing tokens.
   * If we need to add new fields or change validation rules, increment this.
   * 
   * **Current version: 1**
   * - sub: User ID (required)
   * - iat: Issued at (automatic)
   * - exp: Expiry (automatic)
   * 
   * **Future versions might add:**
   * - v: 2 → Add device fingerprint
   * - v: 3 → Add permission scopes
   */
  v: 1;

  /**
   * Subject: The user ID this token is bound to.
   * 
   * **Why bind to user ID?**
   * Prevents "floating" admin tokens that could be stolen and used.
   * During validation, we verify token.sub === currentUser.id.
   * 
   * **Format:** Supabase user UUID
   * Example: "550e8400-e29b-41d4-a716-446655440000"
   */
  sub: string;
}

/**
 * Cached symmetric encryption key.
 * 
 * **Why cache?**
 * - Key derivation is expensive (base64 decode + validation)
 * - Key never changes during runtime
 * - Safe to cache as module-level variable
 * 
 * **Invalidation:**
 * Cache is cleared on process restart (which happens on deploy).
 * No need for manual invalidation.
 */
let cachedKey: Uint8Array | null = null;

/**
 * Converts base64-encoded string to byte array (cross-runtime).
 * 
 * **Why this function?**
 * Different JavaScript runtimes have different base64 APIs:
 * - Browser/Edge: globalThis.atob (Web API)
 * - Node.js: Buffer.from(str, 'base64')
 * - Deno: Different again
 * 
 * This function abstracts the difference for edge compatibility.
 * 
 * **Edge runtime compatibility:**
 * Vercel Edge Functions and Cloudflare Workers use Web APIs.
 * They don't have Node's Buffer, so we must use atob.
 * 
 * **Security note:**
 * Base64 is NOT encryption - it's just encoding.
 * The key is still secret (from environment variables).
 * 
 * @param base64String - Base64-encoded string
 * 
 * @returns Uint8Array (raw bytes)
 * 
 * @throws Error if no base64 decoder is available
 */
function base64ToBytes(base64String: string): Uint8Array {
  // ==========================================================================
  // PATH 1: Web/Edge runtime (Browser API)
  // ==========================================================================
  
  if (typeof globalThis.atob === "function") {
    // atob: ASCII to binary (base64 decode)
    const binaryString = globalThis.atob(base64String);
    
    // Convert binary string to byte array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  }

  // ==========================================================================
  // PATH 2: Node.js runtime (Buffer API)
  // ==========================================================================
  
  // Check if Buffer is available (Node.js)
  // We use globalThis to avoid TypeScript errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NodeBuffer = (globalThis as any).Buffer;
  
  if (NodeBuffer && typeof NodeBuffer.from === "function") {
    // Buffer.from handles base64 decoding natively
    return new Uint8Array(NodeBuffer.from(base64String, "base64"));
  }

  // ==========================================================================
  // PATH 3: No decoder available (should never happen)
  // ==========================================================================
  
  throw new Error(
    "No base64 decoder available in this runtime. " +
    "This should never happen in Vercel/Node environments."
  );
}

/**
 * Retrieves and validates the admin session encryption key.
 * 
 * **Key requirements:**
 * - Algorithm: AES-256-GCM (authenticated encryption)
 * - Key size: 256 bits (32 bytes)
 * - Format: Base64-encoded in environment variable
 * - Storage: GitHub Secrets → Vercel Environment Variables
 * 
 * **Why AES-256-GCM?**
 * - AES-256: Industry standard, approved by NSA for SECRET data
 * - GCM mode: Authenticated encryption (detects tampering)
 * - Fast: Hardware-accelerated on modern CPUs
 * - Recommended by NIST for sensitive data
 * 
 * **Key generation (for reference):**
 * ```bash
 * # Generate 32 random bytes and encode as base64
 * openssl rand -base64 32
 * ```
 * 
 * **Environment variable:**
 * ADMIN_SESSION_SECRET must be set in:
 * - .env.local (local dev)
 * - GitHub Secrets (CI)
 * - Vercel Environment Variables (production)
 * 
 * @returns Uint8Array (32-byte encryption key)
 * 
 * @throws Error if key is missing or wrong size
 */
function getAdminSessionKey(): Uint8Array {
  // Return cached key if available
  if (cachedKey) {
    return cachedKey;
  }

  // Load key from environment (validated by env.ts)
  const secret = env.ADMIN_SESSION_SECRET;
  const keyBytes = base64ToBytes(secret);

  // Validate key size for A256GCM
  // AES-256 requires exactly 32 bytes (256 bits)
  if (keyBytes.length !== 32) {
    throw new Error(
      `ADMIN_SESSION_SECRET must be a base64-encoded 32-byte key. ` +
      `Got ${keyBytes.length} bytes. ` +
      `Generate with: openssl rand -base64 32`
    );
  }

  // Cache for future calls
  cachedKey = keyBytes;

  return keyBytes;
}

/**
 * Creates an encrypted admin session token (JWE).
 * 
 * **What is JWE?**
 * JSON Web Encryption - encrypted JSON payload.
 * Unlike JWT (which is only signed), JWE encrypts the payload.
 * 
 * **Why JWE instead of JWT?**
 * - JWT is transparent: Anyone can decode and read payload
 * - JWE is opaque: Payload is encrypted, client can't read it
 * - Better for sensitive admin sessions
 * - Prevents information disclosure
 * 
 * **Token structure:**
 * ```
 * eyJhbGc...  (header - encrypted)
 * .           (encrypted key - for 'dir' this is empty)
 * encrypted   (ciphertext)
 * .           (initialization vector)
 * tag         (authentication tag)
 * ```
 * 
 * **Encryption details:**
 * - Algorithm: "dir" (direct use of shared secret)
 * - Encryption: "A256GCM" (AES-256 with Galois/Counter Mode)
 * - Key: Shared symmetric key (from environment)
 * 
 * **Token expiry:**
 * Tokens are short-lived (24h default, configurable).
 * This limits the damage if a token is stolen.
 * 
 * **Usage:**
 * ```typescript
 * const token = await createAdminSessionToken(user.id);
 * response.cookies.set('admin_session', token, {
 *   httpOnly: true,
 *   secure: true,
 *   sameSite: 'strict'
 * });
 * ```
 * 
 * @param userId - Supabase user UUID to bind token to
 * 
 * @returns Encrypted JWE token string
 * 
 * @throws Error if encryption fails
 */
export async function createAdminSessionToken(userId: string): Promise<string> {
  // Calculate timestamps
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const expiresAt = now + security.proxy.adminSession.ttlSeconds;

  // Get encryption key
  const key = getAdminSessionKey();

  // Create encrypted JWT (JWE)
  return new EncryptJWT({
    v: 1,        // Token version
    sub: userId, // User ID binding
  })
    .setProtectedHeader({
      alg: "dir",      // Direct use of shared secret
      enc: "A256GCM",  // AES-256 GCM encryption
    })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .encrypt(key);
}

/**
 * Verifies and decrypts an admin session token.
 * 
 * **Validation checks:**
 * 1. Decrypt token (fails if tampered or wrong key)
 * 2. Verify signature/authentication tag
 * 3. Check expiration time (with clock skew tolerance)
 * 4. Validate algorithm (must be dir + A256GCM)
 * 5. Verify token version (must be v1)
 * 6. Verify user ID exists (token must be bound)
 * 
 * **Clock skew tolerance:**
 * We allow 5 seconds of clock drift between edge regions.
 * This prevents spurious failures due to server time differences.
 * 
 * **Why fail-closed?**
 * Any validation error returns null (not an exception).
 * This ensures admin routes fail closed - errors = no access.
 * 
 * **Usage:**
 * ```typescript
 * const payload = await verifyAdminSessionToken(cookieValue);
 * if (!payload) {
 *   // Token invalid, expired, or tampered
 *   return redirectToLogin();
 * }
 * if (payload.sub !== currentUser.id) {
 *   // Token stolen or session fixation attempt
 *   return signOutAndBlock();
 * }
 * // Token valid - allow admin access
 * ```
 * 
 * @param token - The encrypted JWE token from cookie
 * 
 * @returns AdminSessionPayload if valid
 * @returns null if invalid, expired, or tampered
 */
export async function verifyAdminSessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    // Get decryption key
    const key = getAdminSessionKey();

    // Decrypt and verify token
    const { payload, protectedHeader } = await jwtDecrypt(token, key, {
      // Allow 5 seconds of clock skew between edge regions
      // Prevents failures due to minor time differences
      clockTolerance: 5,
    });

    // ==========================================================================
    // VALIDATION 1: Verify algorithm matches expected
    // ==========================================================================
    
    // Prevents algorithm confusion attacks
    // Token MUST use: alg=dir, enc=A256GCM
    if (
      protectedHeader.alg !== "dir" ||
      protectedHeader.enc !== "A256GCM"
    ) {
      return null; // Wrong algorithm - reject
    }

    // ==========================================================================
    // VALIDATION 2: Verify token version
    // ==========================================================================
    
    const version = (payload as { v?: unknown }).v;
    
    // Current version is 1
    // If we need to change token format, increment version
    // Old tokens with wrong version are rejected
    if (version !== 1) {
      return null; // Unknown version - reject
    }

    // ==========================================================================
    // VALIDATION 3: Verify user ID binding
    // ==========================================================================
    
    const userId = payload.sub;
    
    // Token MUST be bound to a specific user
    // Prevents floating admin tokens
    if (typeof userId !== "string" || userId.length === 0) {
      return null; // Missing or invalid user ID - reject
    }

    // ==========================================================================
    // SUCCESS: Token is valid
    // ==========================================================================
    
    // Cast to typed payload (all validations passed)
    return payload as AdminSessionPayload;
    
  } catch (error) {
    // Decryption failed, token expired, or signature invalid
    // All errors result in null (fail closed)
    // 
    // Common errors:
    // - JWEDecryptionFailed: Wrong key or tampered token
    // - JWTExpired: Token past expiration time
    // - JWTClaimValidationFailed: Claims don't match
    return null;
  }
}