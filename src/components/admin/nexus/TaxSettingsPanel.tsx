// src/components/admin/nexus/TaxSettingsPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

export function TaxSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxCodeOverrides, setTaxCodeOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/admin/tax-settings", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as TaxSettingsResponse;
        if (data.settings) {
          setTaxEnabled(data.settings.taxEnabled ?? true);
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

  const displayCodes = useMemo(
    () =>
      TAX_CATEGORIES.map((category) => ({
        ...category,
        value: taxCodeOverrides[category.key] ?? PRODUCT_TAX_CODES[category.key],
      })),
    [taxCodeOverrides],
  );

  const handleCodeChange = (key: string, value: string) => {
    const cleaned = value.trim();
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
        setTaxEnabled(data.settings.taxEnabled ?? true);
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-gray-400">
        Loading tax settings...
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Tax collection settings</h2>
        <p className="text-sm text-gray-400">
          Toggle tax collection and set tax codes for each catalog category.
        </p>
      </div>

      <label className="flex items-start gap-3 p-3 border border-zinc-800/70 rounded">
        <input
          type="checkbox"
          checked={taxEnabled}
          onChange={(e) => setTaxEnabled(e.target.checked)}
          className="mt-1 rdk-checkbox"
        />
        <div>
          <div className="text-sm text-white font-medium">Enable tax collection</div>
          <div className="text-xs text-gray-500 mt-1">
            When disabled, checkout tax calculations are skipped.
          </div>
        </div>
      </label>

      <div className="space-y-3">
        {displayCodes.map((category) => (
          <div
            key={category.key}
            className="flex flex-col gap-2 border border-zinc-800/70 rounded p-4"
          >
            <div className="text-sm text-white font-medium">{category.label}</div>
            <input
              type="text"
              value={category.value}
              onChange={(e) => handleCodeChange(category.key, e.target.value)}
              disabled={!taxEnabled}
              className="w-full bg-zinc-950 text-white px-3 py-2 border border-zinc-800/70 rounded disabled:opacity-70"
              placeholder={PRODUCT_TAX_CODES[category.key]}
            />
            <div className="text-xs text-gray-500">
              Default: {PRODUCT_TAX_CODES[category.key]}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:bg-gray-600"
        >
          {isSaving ? "Saving..." : "Save tax settings"}
        </button>
        {message && <span className="text-sm text-gray-400">{message}</span>}
      </div>
    </div>
  );
}
