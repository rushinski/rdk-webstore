// src/lib/idempotency.ts (CORRECTED)

import { randomUUID } from 'crypto';

export function generateIdempotencyKey(): string {
  return randomUUID();
}

export function getIdempotencyKeyFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('checkout_idempotency_key');
}

export function setIdempotencyKeyInStorage(key: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('checkout_idempotency_key', key);
}

export function clearIdempotencyKeyFromStorage(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('checkout_idempotency_key');
}