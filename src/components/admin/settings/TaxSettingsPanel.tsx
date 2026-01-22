// src/components/admin/settings/TaxSettingsPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { PRODUCT_TAX_CODES } from "@/config/constants/nexus-thresholds";
import { logError } from "@/lib/log";

const TAX_CATEGORIES = [
  { key: "sneakers", label: "Sneakers" },
  { key: "clothing", label: "Clothing" },
  { key: "accessories", label: "Accessories" },
  { key: "electronics", label: "Electronics" },
];

type TaxSettingsResponse = {
  settings?: {
    taxEnabled?: boolean;
    taxCodeOverrides?: Record<string, string>;
  };
};

const normalizeTaxCode = (value: string) => value.trim();

export function TaxSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxCodeOverrides, setTaxCodeOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/admin/tax-settings", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as TaxSettingsResponse;
        if (data.settings) {
          setTaxEnabled(data.settings.taxEnabled ?? false);
          setTaxCodeOverrides(data.settings.taxCodeOverrides ?? {});
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_tax_settings_load" });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const effectiveCodes = useMemo(
    () =>
      TAX_CATEGORIES.map((category) => {
        const override = taxCodeOverrides[category.key];
        const defaultCode = PRODUCT_TAX_CODES[category.key];
        return {
          ...category,
          override: override ?? "",
          defaultCode,
          effectiveCode: override ? override : defaultCode,
        };
      }),
    [taxCodeOverrides],
  );

  const handleCodeChange = (key: string, value: string) => {
    const cleaned = normalizeTaxCode(value);
    setTaxCodeOverrides((prev) => {
      const next = { ...prev };
      if (!cleaned) {
        delete next[key];
      } else {
        next[key] = cleaned;
      }
      return next;
    });
  };

  const resetToDefault = (key: string) => {
    setTaxCodeOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/tax-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxEnabled,
          taxCodeOverrides,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as TaxSettingsResponse;
      if (!response.ok) {
        throw new Error((data as any)?.error ?? "Failed to save tax settings.");
      }

      if (data.settings) {
        setTaxEnabled(data.settings.taxEnabled ?? false);
        setTaxCodeOverrides(data.settings.taxCodeOverrides ?? {});
      }
      setMessage("Tax settings updated.");
    } catch (error: any) {
      logError(error, { layer: "frontend", event: "admin_tax_settings_save" });
      setMessage(error?.message ?? "Failed to save tax settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded p-4 sm:p-6 text-[12px] sm:text-sm text-gray-400">
        Loading tax settings...
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white">Tax collection</h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Toggle Stripe Tax calculations and assign category tax codes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] sm:text-sm text-gray-400">
            {taxEnabled ? "Enabled" : "Disabled"}
          </span>
          <ToggleSwitch
            checked={taxEnabled}
            onChange={setTaxEnabled}
            ariaLabel="Toggle tax collection"
            disabled={isSaving}
          />
        </div>
      </div>

      {!taxEnabled && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-sm p-3 sm:p-4 text-[12px] sm:text-sm text-yellow-100">
          Taxes are turned off. Enable taxes to collect and track nexus activity.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white">Category tax codes</h3>
          <p className="text-xs sm:text-sm text-gray-400">
            Stripe Tax uses these codes to determine the correct tax rules per category.
          </p>
          <div className="mt-2 text-[11px] sm:text-xs text-gray-500">
            Tax codes are Stripe identifiers (ex: txcd_30011000) that map to product taxability.
            {" "}
            <a
              href="https://docs.stripe.com/tax/tax-codes"
              target="_blank"
              rel="noreferrer"
              className="text-red-400 hover:text-red-300 underline underline-offset-2"
            >
              View Stripe tax code list
            </a>
            .
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {effectiveCodes.map((category) => (
            <div
              key={category.key}
              className="border border-zinc-800/70 rounded p-4 bg-zinc-950/40 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] sm:text-sm font-semibold text-white">
                    {category.label}
                  </div>
                  <div className="text-[11px] sm:text-xs text-gray-500">
                    Default: {category.defaultCode}
                  </div>
                </div>
                <div className="text-[11px] sm:text-xs text-gray-400">
                  Effective:{" "}
                  <span className="text-gray-200">{category.effectiveCode}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <input
                  type="text"
                  value={category.override}
                  onChange={(e) => handleCodeChange(category.key, e.target.value)}
                  disabled={!taxEnabled || isSaving}
                  placeholder={category.defaultCode}
                  className="w-full bg-zinc-950 text-white px-3 py-1.5 sm:py-2 text-[12px] sm:text-sm border border-zinc-800/70 rounded disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => resetToDefault(category.key)}
                  disabled={!taxEnabled || isSaving || !category.override}
                  className="px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs border border-zinc-800/70 text-gray-300 hover:border-zinc-700 disabled:opacity-50"
                >
                  Use default
                </button>
              </div>

              <div className="text-[11px] sm:text-xs text-gray-500">
                Leave blank to use the default Stripe tax code for this category.
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-[12px] sm:text-sm rounded disabled:bg-gray-600"
        >
          {isSaving ? "Saving..." : "Save tax settings"}
        </button>
        {message && <span className="text-[12px] sm:text-sm text-gray-400">{message}</span>}
      </div>
    </div>
  );
}
