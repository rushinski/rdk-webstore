'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectBalances,
  ConnectPayments,
  ConnectPayouts,
} from '@stripe/react-connect-js';
import { logError } from '@/lib/log';
import { connectAppearance } from '@/lib/stripe/connect-appearance';

interface EmbeddedAccountProps {
  publishableKey: string;
  showOnboarding?: boolean; // NEW
}

export function EmbeddedAccount({ publishableKey, showOnboarding = false }: EmbeddedAccountProps) {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [accountId, setAccountId] = useState<string>('');

  useEffect(() => {
    const fetchClientSecret = async () => {
      const response = await fetch('/api/admin/stripe/account-session', { method: 'POST' });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create account session: ${text}`);
      }

      const { client_secret, account_id } = await response.json();
      setAccountId(account_id);
      return client_secret;
    };

    const initializeStripeConnect = async () => {
      try {
        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret,
          appearance: connectAppearance,
        });

        setStripeConnectInstance(instance);
      } catch (err: any) {
        logError(err, { layer: 'frontend', event: 'stripe_connect_init_failed' });
      }
    };

    initializeStripeConnect();
  }, [publishableKey]);

  if (!stripeConnectInstance) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-black border border-zinc-800 p-6">
            <div className="h-6 w-48 bg-zinc-900 mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-zinc-900" />
              <div className="h-4 w-3/4 bg-zinc-900" />
              <div className="h-32 w-full bg-zinc-900 mt-4" />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-center py-8">
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
          <div className="bg-black border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Account Setup</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Complete verification to receive payouts. All sensitive data is securely handled by Stripe.
            </p>
            <ConnectAccountOnboarding onExit={() => {}} />
          </div>
        ) : null}

        <div className="bg-black border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Bank Account</h2>
          <p className="text-sm text-zinc-400 mb-4">Manage your bank account used for payouts.</p>
          <ConnectAccountManagement
            collectionOptions={{ fields: 'eventually_due', futureRequirements: 'include' }}
          />
        </div>

        <div className="bg-black border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Balance</h2>
          <p className="text-sm text-zinc-400 mb-4">
            View your current balance. Payouts occur automatically on your schedule.
          </p>
          <ConnectBalances />
        </div>

        <div className="bg-black border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Payments & Refunds</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Review payments and issue refunds directly from Stripe.
          </p>
          <ConnectPayments />
        </div>

        <div className="bg-black border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Payout History</h2>
          <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800">
            <p className="text-xs text-zinc-400">
              <span className="text-zinc-300 font-medium">About Payouts:</span>
              <br />- Stripe processing fees are deducted from each sale
              <br />- Standard payouts (free) arrive in 2-5 business days
              <br />- Instant payouts available for 1.5% fee (if enabled)
              <br />- Fees are not refunded when issuing refunds
            </p>
          </div>
          <ConnectPayouts />
        </div>

        {accountId && <div className="text-xs text-zinc-600 font-mono">Account ID: {accountId}</div>}
      </div>
    </ConnectComponentsProvider>
  );
}
