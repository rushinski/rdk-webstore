"use client";

import { useEffect, useState } from "react";

import { logError } from "@/lib/utils/log";
import {
  DEFAULT_CHECKOUT_LOCK_MESSAGE,
  type StoreAccessSettingsResponse,
} from "@/modules/settings/presentation/admin/store-access/storeAccessSettingsShared";

export function useStoreAccessSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [checkoutLockEnabled, setCheckoutLockEnabled] = useState(false);
  const [checkoutLockMessage, setCheckoutLockMessage] = useState(
    DEFAULT_CHECKOUT_LOCK_MESSAGE,
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/store-access", { cache: "no-store" });
        const data = (await response.json()) as StoreAccessSettingsResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load store access settings.");
        }

        if (data.settings) {
          setCheckoutLockEnabled(Boolean(data.settings.checkoutLockEnabled));
          setCheckoutLockMessage(
            data.settings.checkoutLockMessage ?? DEFAULT_CHECKOUT_LOCK_MESSAGE,
          );
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_store_access_load" });
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to load store access settings.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const save = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/store-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutLockEnabled,
          checkoutLockMessage,
        }),
      });
      const data = (await response.json()) as StoreAccessSettingsResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save store access settings.");
      }

      setMessage("Store access settings updated.");
      if (data.settings) {
        setCheckoutLockEnabled(Boolean(data.settings.checkoutLockEnabled));
        setCheckoutLockMessage(
          data.settings.checkoutLockMessage ?? DEFAULT_CHECKOUT_LOCK_MESSAGE,
        );
      }
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_store_access_save" });
      setMessage(
        error instanceof Error ? error.message : "Failed to save store access settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    checkoutLockEnabled,
    checkoutLockMessage,
    isLoading,
    isSaving,
    message,
    save,
    setCheckoutLockEnabled,
    setCheckoutLockMessage,
  };
}
