"use client";

import { useEffect, useMemo, useState } from "react";

import { PRODUCT_TAX_CODES } from "@/config/constants/nexus-thresholds";
import { logError } from "@/lib/utils/log";

import {
  normalizeTaxCode,
  TAX_CATEGORIES,
  type TaxCategoryKey,
  type TaxSettingsResponse,
} from "./taxSettingsConfig";

export type TaxCategoryCodeState = {
  key: TaxCategoryKey;
  label: string;
  override: string;
  defaultCode: string;
  effectiveCode: string;
};

export function useTaxSettingsPanel() {
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

  const effectiveCodes = useMemo<TaxCategoryCodeState[]>(
    () =>
      TAX_CATEGORIES.map((category) => {
        const override = taxCodeOverrides[category.key];
        const defaultCode = PRODUCT_TAX_CODES[category.key];

        return {
          ...category,
          override: override ?? "",
          defaultCode,
          effectiveCode: override || defaultCode,
        };
      }),
    [taxCodeOverrides],
  );

  const handleCodeChange = (key: TaxCategoryKey, value: string) => {
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

  const resetToDefault = (key: TaxCategoryKey) => {
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

  return {
    effectiveCodes,
    handleCodeChange,
    handleSave,
    isLoading,
    isSaving,
    message,
    resetToDefault,
    setTaxEnabled,
    taxEnabled,
  };
}
