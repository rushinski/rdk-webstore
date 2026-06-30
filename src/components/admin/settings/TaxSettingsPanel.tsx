"use client";

import { useEffect, useMemo, useState } from "react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { PRODUCT_TAX_CODES } from "@/config/constants/nexus-thresholds";
import { logError } from "@/lib/utils/log";

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

    void loadSettings();
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

      const data = (await response.json().catch(() => ({}))) as TaxSettingsResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save tax settings.");
      }

      if (data.settings) {
        setTaxEnabled(data.settings.taxEnabled ?? false);
        setTaxCodeOverrides(data.settings.taxCodeOverrides ?? {});
      }
      setMessage("Tax settings updated.");
    } catch (error: unknown) {
      logError(error, { layer: "frontend", event: "admin_tax_settings_save" });
      setMessage(error instanceof Error ? error.message : "Failed to save tax settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminSectionCard>
        <div className="text-sm text-brand-muted">Loading tax settings...</div>
      </AdminSectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionCard title="Tax Collection">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-brand-muted">
              Toggle tax calculations and assign category tax codes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminStatusBadge tone={taxEnabled ? "success" : "neutral"}>
              {taxEnabled ? "Enabled" : "Disabled"}
            </AdminStatusBadge>
            <ToggleSwitch
              checked={taxEnabled}
              onChange={setTaxEnabled}
              ariaLabel="Toggle tax collection"
              disabled={isSaving}
            />
          </div>
        </div>
      </AdminSectionCard>

      {!taxEnabled ? (
        <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Taxes are turned off. Enable taxes to collect and track nexus activity.
        </div>
      ) : null}

      <AdminSectionCard title="Category Tax Codes">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-brand-muted">
              These codes determine the correct tax rules per category.
            </p>
            <p className="mt-2 text-xs text-brand-muted">
              Tax codes like `txcd_30011000` map to product taxability.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {effectiveCodes.map((category) => (
              <div
                key={category.key}
                className="space-y-3 border border-brand-border bg-brand-page p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-brand-text">
                      {category.label}
                    </div>
                    <div className="text-xs text-brand-muted">
                      Default: {category.defaultCode}
                    </div>
                  </div>
                  <div className="text-xs text-brand-muted">
                    Effective:{" "}
                    <span className="font-semibold text-brand-text">
                      {category.effectiveCode}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={category.override}
                    onChange={(event) =>
                      handleCodeChange(category.key, event.target.value)
                    }
                    disabled={!taxEnabled || isSaving}
                    placeholder={category.defaultCode}
                    className={adminFormStyles.input}
                  />
                  <button
                    type="button"
                    onClick={() => resetToDefault(category.key)}
                    disabled={!taxEnabled || isSaving || !category.override}
                    className={`${adminButtonStyles.secondary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-surface disabled:text-brand-muted`}
                  >
                    Use default
                  </button>
                </div>

                <div className="text-xs text-brand-muted">
                  Leave blank to use the default tax code for this category.
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminSectionCard>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={isSaving}
          className={`${adminButtonStyles.primary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
        >
          {isSaving ? "Saving..." : "Save tax settings"}
        </button>
        {message ? <span className="text-sm text-brand-muted">{message}</span> : null}
      </div>
    </div>
  );
}
