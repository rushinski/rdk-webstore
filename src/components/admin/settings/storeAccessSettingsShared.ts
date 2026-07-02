"use client";

import { DEFAULT_CHECKOUT_LOCK_MESSAGE } from "@/repositories/store-access-settings-repo";

export { DEFAULT_CHECKOUT_LOCK_MESSAGE };

export function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export type StoreAccessSettingsResponse = {
  error?: string;
  settings?: {
    siteLockEnabled?: boolean;
    siteUnlockAt?: string | null;
    checkoutLockEnabled?: boolean;
    checkoutLockMessage?: string;
  };
};
