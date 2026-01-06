// src/components/admin/stripe/EmbeddedAccount.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectBalances,
  ConnectPayouts,
} from "@stripe/react-connect-js";
import { logError } from "@/lib/log";
import { connectAppearance } from "@/lib/stripe/connect-appearance";

interface EmbeddedAccountProps {
  publishableKey: string;
  showOnboarding?: boolean;
  showAccountManagement?: boolean;
  showBalances?: boolean;
  showPayouts?: boolean;
  showAccountId?: boolean;
}

export function EmbeddedAccount({
  publishableKey,
  showOnboarding = false,
  showAccountManagement = true,
  showBalances = true,
  showPayouts = true,
  showAccountId = true,
}: EmbeddedAccountProps) {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [accountId, setAccountId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const fetchClientSecret = async () => {
      const response = await fetch("/api/admin/stripe/account-session", { method: "POST" });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create account session: ${text}`);
      }

      const { client_secret, account_id } = await response.json();
      if (!cancelled) setAccountId(account_id);
      return client_secret;
    };

    const initializeStripeConnect = async () => {
      try {
        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret,
          appearance: connectAppearance,
        });

        if (!cancelled) setStripeConnectInstance(instance);
      } catch (err: any) {
        logError(err, { layer: "frontend", event: "stripe_connect_init_failed" });
      }
    };

    if (publishableKey) initializeStripeConnect();

    return () => {
      cancelled = true;
    };
  }, [publishableKey]);

  if (!stripeConnectInstance) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
          <span className="ml-3 text-zinc-400 text-sm">Loading Stripe tools...</span>
        </div>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
      <div className="space-y-6">
        {showOnboarding ? (
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-sm p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Verification</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Stripe collects required details securely to enable payouts.
            </p>
            <ConnectAccountOnboarding onExit={() => {}} />
          </div>
        ) : null}

        {showAccountManagement ? (
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-sm p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Bank accounts</h2>
            <p className="text-sm text-zinc-400 mb-4">Add/edit bank accounts for payouts.</p>
            <ConnectAccountManagement
              collectionOptions={{ fields: "eventually_due", futureRequirements: "include" }}
            />
          </div>
        ) : null}

        {showBalances ? (
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-sm p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Balances & upcoming payout</h2>
            <p className="text-sm text-zinc-400 mb-4">Pending, available, and upcoming payout details.</p>
            <ConnectBalances />
          </div>
        ) : null}

        {showPayouts ? (
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-sm p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Payouts</h2>
            <ConnectPayouts />
          </div>
        ) : null}

        {showAccountId && accountId ? (
          <div className="text-xs text-zinc-600 font-mono">Account ID: {accountId}</div>
        ) : null}
      </div>
    </ConnectComponentsProvider>
  );
}
