"use client";

import { useEffect, useState } from "react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { logError } from "@/lib/utils/log";
import { DEFAULT_CHECKOUT_LOCK_MESSAGE } from "@/repositories/store-access-settings-repo";

function toDateTimeLocalValue(value: string | null): string {
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

export function StoreAccessSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [siteLockEnabled, setSiteLockEnabled] = useState(false);
  const [siteUnlockAt, setSiteUnlockAt] = useState("");
  const [checkoutLockEnabled, setCheckoutLockEnabled] = useState(false);
  const [checkoutLockMessage, setCheckoutLockMessage] = useState(
    DEFAULT_CHECKOUT_LOCK_MESSAGE,
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/store-access", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load store access settings.");
        }

        if (data.settings) {
          setSiteLockEnabled(Boolean(data.settings.siteLockEnabled));
          setSiteUnlockAt(toDateTimeLocalValue(data.settings.siteUnlockAt ?? null));
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
          siteLockEnabled,
          siteUnlockAt: siteUnlockAt ? new Date(siteUnlockAt).toISOString() : null,
          checkoutLockEnabled,
          checkoutLockMessage,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save store access settings.");
      }

      setMessage("Store access settings updated.");
      if (data.settings) {
        setSiteLockEnabled(Boolean(data.settings.siteLockEnabled));
        setSiteUnlockAt(toDateTimeLocalValue(data.settings.siteUnlockAt ?? null));
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

  if (isLoading) {
    return (
      <AdminSectionCard>
        <div className="text-sm text-brand-muted">Loading store access settings...</div>
      </AdminSectionCard>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminSectionCard title="Site Lock">
        <div className="space-y-4">
          <p className="text-sm text-brand-muted">
            Lock the public storefront until a specific date and time.
          </p>

          <label className="flex items-center gap-3 text-sm text-brand-text">
            <input
              type="checkbox"
              checked={siteLockEnabled}
              onChange={(event) => setSiteLockEnabled(event.target.checked)}
              className="rdk-checkbox"
            />
            Enable site lock
          </label>

          <div>
            <label className={adminFormStyles.label}>Unlock At</label>
            <input
              type="datetime-local"
              value={siteUnlockAt}
              onChange={(event) => setSiteUnlockAt(event.target.value)}
              className={adminFormStyles.input}
            />
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Checkout Lock">
        <div className="space-y-4">
          <p className="text-sm text-brand-muted">
            Keep the site open while showing a temporary payment-unavailable message.
          </p>

          <label className="flex items-center gap-3 text-sm text-brand-text">
            <input
              type="checkbox"
              checked={checkoutLockEnabled}
              onChange={(event) => setCheckoutLockEnabled(event.target.checked)}
              className="rdk-checkbox"
            />
            Enable checkout lock
          </label>

          <div>
            <label className={adminFormStyles.label}>Checkout Message</label>
            <textarea
              value={checkoutLockMessage}
              onChange={(event) => setCheckoutLockMessage(event.target.value)}
              rows={5}
              className={adminFormStyles.input}
            />
          </div>
        </div>
      </AdminSectionCard>

      <div className="flex items-center justify-between gap-3 lg:col-span-2">
        <span className="text-sm text-brand-muted">{message}</span>
        <button
          type="button"
          onClick={() => {
            void save();
          }}
          disabled={isSaving}
          className={`${adminButtonStyles.primary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
        >
          {isSaving ? "Saving..." : "Save store access settings"}
        </button>
      </div>
    </div>
  );
}
