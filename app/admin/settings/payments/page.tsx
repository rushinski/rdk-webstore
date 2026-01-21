// app/admin/settings/payments/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { logError } from "@/lib/log";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import {
  DEFAULT_EXPRESS_CHECKOUT_METHODS,
  EXPRESS_CHECKOUT_METHODS,
  PAYMENT_METHOD_TYPES,
} from "@/config/constants/payment-options";

type PaymentSettings = {
  useAutomaticPaymentMethods: boolean;
  paymentMethodTypes: string[];
  expressCheckoutMethods: string[];
};

export default function PaymentSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [useAutomatic, setUseAutomatic] = useState(true);
  const [paymentMethodTypes, setPaymentMethodTypes] = useState<string[]>(["card"]);
  const [expressMethods, setExpressMethods] = useState<string[]>(
    DEFAULT_EXPRESS_CHECKOUT_METHODS,
  );

  const paymentMethodSet = useMemo(
    () => new Set(paymentMethodTypes),
    [paymentMethodTypes],
  );
  const expressMethodSet = useMemo(
    () => new Set(expressMethods),
    [expressMethods],
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/admin/payment-settings", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        const settings = data.settings as PaymentSettings | undefined;

        if (settings) {
          const automatic = settings.useAutomaticPaymentMethods ?? true;
          const methodTypes = [...(settings.paymentMethodTypes ?? [])];
          if (!automatic && !methodTypes.includes("card")) {
            methodTypes.unshift("card");
          }
          setUseAutomatic(automatic);
          setPaymentMethodTypes(methodTypes.length ? methodTypes : ["card"]);
          setExpressMethods(
            settings.expressCheckoutMethods?.length
              ? settings.expressCheckoutMethods
              : DEFAULT_EXPRESS_CHECKOUT_METHODS,
          );
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_payment_settings_load" });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const togglePaymentMethod = (key: string) => {
    if (key === "card") return;
    setPaymentMethodTypes((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const toggleExpressMethod = (key: string) => {
    setExpressMethods((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useAutomaticPaymentMethods: useAutomatic,
          paymentMethodTypes,
          expressCheckoutMethods: expressMethods,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to save settings.");
      }

      const settings = data.settings as PaymentSettings | undefined;
      if (settings) {
        const automatic = settings.useAutomaticPaymentMethods ?? true;
        const methodTypes = [...(settings.paymentMethodTypes ?? [])];
        if (!automatic && !methodTypes.includes("card")) {
          methodTypes.unshift("card");
        }
        setUseAutomatic(automatic);
        setPaymentMethodTypes(methodTypes.length ? methodTypes : ["card"]);
        setExpressMethods(
          settings.expressCheckoutMethods?.length
            ? settings.expressCheckoutMethods
            : DEFAULT_EXPRESS_CHECKOUT_METHODS,
        );
      }

      setMessage("Payment settings updated.");
    } catch (error: any) {
      logError(error, { layer: "frontend", event: "admin_payment_settings_save" });
      setMessage(error?.message ?? "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Settings</h1>
          <p className="text-gray-400">Manage checkout payment options</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 text-gray-400">
          Loading payment settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Payment Settings</h1>
        <p className="text-gray-400">Manage checkout payment options</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Payment method availability</h2>
            <p className="text-sm text-gray-400">
              Control which payment methods appear in the checkout flow.
            </p>
          </div>

          <div className="flex items-start justify-between gap-3 p-3 border border-zinc-800/70 rounded">
            <div>
              <div className="text-sm text-white font-medium">
                Use Stripe automatic payment methods
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Stripe will automatically display all enabled methods for your account.
              </div>
            </div>
            <ToggleSwitch
              checked={useAutomatic}
              onChange={setUseAutomatic}
              ariaLabel="Toggle automatic payment methods"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            {PAYMENT_METHOD_TYPES.map((method) => {
              const isCard = method.key === "card";
              const checked = paymentMethodSet.has(method.key);
              return (
                <div
                  key={method.key}
                  className="flex items-start justify-between gap-3 p-3 border border-zinc-800/70 rounded"
                >
                  <div>
                    <div className="text-sm text-white font-medium">{method.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{method.description}</div>
                    {isCard && (
                      <div className="text-[11px] text-gray-500 mt-1">
                        Card payments stay enabled for checkout.
                      </div>
                    )}
                  </div>
                  <ToggleSwitch
                    checked={checked}
                    onChange={() => togglePaymentMethod(method.key)}
                    ariaLabel={`Toggle ${method.label}`}
                    disabled={useAutomatic || isCard || isSaving}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Express checkout buttons</h2>
            <p className="text-sm text-gray-400">
              Choose which express buttons appear above the payment form.
            </p>
          </div>

          <div className="space-y-2">
            {EXPRESS_CHECKOUT_METHODS.map((method) => {
              const checked = expressMethodSet.has(method.key);
              return (
                <div
                  key={method.key}
                  className="flex items-center justify-between gap-3 p-3 border border-zinc-800/70 rounded"
                >
                  <div className="text-sm text-white font-medium">{method.label}</div>
                  <ToggleSwitch
                    checked={checked}
                    onChange={() => toggleExpressMethod(method.key)}
                    ariaLabel={`Toggle ${method.label}`}
                    disabled={isSaving}
                  />
                </div>
              );
            })}
          </div>

          <div className="text-xs text-gray-500">
            Express buttons only render when the payment method is available for your Stripe
            account.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:bg-gray-600"
        >
          {isSaving ? "Saving..." : "Save payment settings"}
        </button>
        {message && <span className="text-sm text-gray-400">{message}</span>}
      </div>
    </div>
  );
}
