// src/components/admin/stripe/EmbeddedAccount.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectBalances,
  ConnectPayouts,
} from '@stripe/react-connect-js';
import { logError } from '@/lib/log';

interface EmbeddedAccountProps {
  publishableKey: string;
}

export function EmbeddedAccount({ publishableKey }: EmbeddedAccountProps) {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [accountId, setAccountId] = useState<string>('');

  useEffect(() => {
    const fetchClientSecret = async () => {
      const response = await fetch('/api/admin/stripe/account-session', {
        method: 'POST',
      });

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
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: '#dc2626', // Match your red theme
            },
          },
        });

        setStripeConnectInstance(instance);
      } catch (err: any) {
        logError(err, {
          layer: 'frontend',
          event: 'stripe_connect_init_failed',
        });
      }
    };

    initializeStripeConnect();
  }, [publishableKey]);

  if (!stripeConnectInstance) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="ml-3 text-gray-400">Loading banking components...</span>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
      <div className="space-y-8">
        {/* Account Onboarding */}
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account Setup</h2>
          <p className="text-sm text-gray-400 mb-4">
            Complete your account verification to start receiving payouts. All sensitive information (SSN, bank details) is securely collected and stored by Stripe.
          </p>
          <ConnectAccountOnboarding
            onExit={() => {
              console.log('Onboarding exited');
            }}
          />
        </div>

        {/* Account Management */}
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account Details</h2>
          <p className="text-sm text-gray-400 mb-4">
            Manage your business information and bank account details.
          </p>
          <ConnectAccountManagement
            collectionOptions={{
              fields: 'eventually_due',
              futureRequirements: 'include',
            }}
          />
        </div>

        {/* Balance */}
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Balance</h2>
          <p className="text-sm text-gray-400 mb-4">
            View your available balance and perform payouts.
          </p>
          <ConnectBalances />
        </div>

        {/* Payouts */}
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Payout History</h2>
          <p className="text-yellow-400 mb-2 text-xs">
            ⓘ Stripe processing fees (card processing, ACH, etc.) are deducted from your payouts. These fees are paid by you, the seller, not the platform. When refunds occur, Stripe processing fees are generally not returned.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            View your payout schedule and history.
          </p>
          <ConnectPayouts />
        </div>

        {accountId && (
          <div className="text-xs text-gray-500">
            Stripe Account ID: {accountId}
          </div>
        )}
      </div>
    </ConnectComponentsProvider>
  );
}