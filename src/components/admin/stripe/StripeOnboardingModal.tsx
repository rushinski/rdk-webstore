// src/components/admin/stripe/StripeOnboardingModal.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { initStripeConnect } from "@/lib/stripe/connect-client";
import { connectAppearance } from "@/lib/stripe/connect-appearance";
import { logError } from "@/lib/log";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";

export function StripeOnboardingModal(props: {
  open: boolean;
  onClose: () => void;
  publishableKey: string;
  onCompleted: () => Promise<void> | void;
}) {
  const { open, onClose, publishableKey, onCompleted } = props;

  const [isBooting, setIsBooting] = useState(false);
  const [bootError, setBootError] = useState<string>("");
  const [connectInstance, setConnectInstance] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setIsBooting(false);
    setBootError("");
    setConnectInstance(null);
  }, [open]);

  const boot = async () => {
    if (!publishableKey) {
      setBootError("Stripe publishable key is missing. Contact support.");
      return;
    }

    setIsBooting(true);
    setBootError("");

    try {
      const res = await fetch("/api/admin/stripe/account-session", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());

      const { client_secret } = await res.json();

      const instance = await initStripeConnect({
        publishableKey,
        clientSecret: client_secret,
        appearance: connectAppearance,
      });

      setConnectInstance(instance);
    } catch (err: any) {
      logError(err, { layer: "frontend", event: "stripe_connect_onboarding_boot_failed" });
      setBootError("Could not start Stripe onboarding. Please try again.");
    } finally {
      setIsBooting(false);
    }
  };

  const done = async () => {
    try {
      await onCompleted();
    } finally {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl max-h-[92vh] bg-black border border-zinc-800 rounded-sm shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Stripe</p>
              <h2 className="text-lg font-semibold text-white">Enable payouts</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Stripe collects required verification + bank info securely.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-zinc-800 hover:border-zinc-600"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-zinc-300" />
            </button>
          </div>

          <div className="px-5 py-5 overflow-y-auto">
            {bootError ? (
              <div className="border border-red-900/70 bg-zinc-950 p-4">
                <p className="text-sm text-red-400">{bootError}</p>
              </div>
            ) : null}

            {!connectInstance ? (
              <div className="space-y-4">
                <div className="text-sm text-zinc-300">
                  This is a one-time setup. If Stripe needs more info later, you’ll see it here.
                </div>

                <button
                  type="button"
                  onClick={boot}
                  disabled={isBooting}
                  className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-60"
                >
                  {isBooting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Starting…
                    </span>
                  ) : (
                    "Start"
                  )}
                </button>
              </div>
            ) : (
              <ConnectComponentsProvider connectInstance={connectInstance}>
                <div className="border border-zinc-800 p-4 bg-black">
                  <ConnectAccountOnboarding onExit={() => {}} />
                </div>

                <div className="mt-5 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={done}
                    className="px-4 py-2 bg-green-700 text-white text-sm hover:bg-green-600"
                  >
                    Done
                  </button>
                </div>
              </ConnectComponentsProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
