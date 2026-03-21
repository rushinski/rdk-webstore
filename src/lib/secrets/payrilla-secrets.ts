// src/lib/secrets/payrilla-secrets.ts
//
// AWS Systems Manager Parameter Store wrapper for per-tenant PayRilla credentials.
// Parameters are SecureString type — encrypted at rest via AWS KMS at no extra cost.
//
// Parameter path: /payrilla/{tenantId}
// Parameter JSON: { sourceKey, pin, tokenizationKey, webhookSecret }
//
// Security model:
//   - Credentials are never stored in the application database.
//   - Cache lives in process memory only — never touches Redis or any external store.
//   - Cache TTL is 1 hour; invalidated immediately on credential update.
//   - On Digital Ocean (persistent process), cache survives for the lifetime of the process.

import {
  SSMClient,
  GetParameterCommand,
  PutParameterCommand,
  ParameterNotFound,
} from "@aws-sdk/client-ssm";

import { env } from "@/config/env";
import { logError } from "@/lib/utils/log";

export type PayrillaSecret = {
  sourceKey: string;
  pin: string; // Empty string if no PIN set on source key
  tokenizationKey: string;
  webhookSecret: string;
};

// Derived Basic auth credential — what the charge service actually sends
export function buildApiKey(secret: Pick<PayrillaSecret, "sourceKey" | "pin">): string {
  return `${secret.sourceKey}:${secret.pin}`;
}

// ---------- Singleton client ----------

let _client: SSMClient | null = null;

function getClient(): SSMClient {
  if (!_client) {
    _client = new SSMClient({ region: env.AWS_REGION });
  }
  return _client;
}

// ---------- In-process cache ----------

type CacheEntry = { secret: PayrillaSecret; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function parameterPath(tenantId: string): string {
  return `/payrilla/${tenantId}`;
}

// ---------- Public API ----------

export async function getPayrillaSecret(
  tenantId: string,
): Promise<PayrillaSecret | null> {
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.secret;
  }

  try {
    const response = await getClient().send(
      new GetParameterCommand({
        Name: parameterPath(tenantId),
        WithDecryption: true,
      }),
    );

    const value = response.Parameter?.Value;
    if (!value) {
      return null;
    }

    const secret = JSON.parse(value) as PayrillaSecret;
    cache.set(tenantId, { secret, expiresAt: Date.now() + CACHE_TTL_MS });
    return secret;
  } catch (error) {
    if (error instanceof ParameterNotFound) {
      return null;
    }
    logError(error, {
      layer: "lib",
      message: "ssm_parameter_fetch_failed",
      tenantId,
    });
    throw error;
  }
}

export async function putPayrillaSecret(
  tenantId: string,
  secret: PayrillaSecret,
): Promise<void> {
  await getClient().send(
    new PutParameterCommand({
      Name: parameterPath(tenantId),
      Value: JSON.stringify(secret),
      Type: "SecureString", // KMS-encrypted at rest
      Overwrite: true, // Creates if missing, updates if present
      Description: `PayRilla credentials for tenant ${tenantId}`,
    }),
  );

  // Invalidate cache so next read fetches the fresh value
  cache.delete(tenantId);
}

export function invalidatePayrillaSecret(tenantId: string): void {
  cache.delete(tenantId);
}
