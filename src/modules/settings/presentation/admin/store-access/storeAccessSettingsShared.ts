"use client";

import { DEFAULT_CHECKOUT_LOCK_MESSAGE } from "@/repositories/store-access-settings-repo";

export { DEFAULT_CHECKOUT_LOCK_MESSAGE };

export type StoreAccessSettingsResponse = {
  error?: string;
  settings?: {
    checkoutLockEnabled?: boolean;
    checkoutLockMessage?: string;
  };
};
