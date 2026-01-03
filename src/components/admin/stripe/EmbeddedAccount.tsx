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
              // Match your pure black/white/red theme
              colorPrimary: '#dc2626',           // Your red accent
              colorBackground: '#000000',        // Pure black background
              colorText: '#ffffff',              // White text
              colorSecondaryText: '#a1a1aa',     // Zinc-400 for secondary text
              colorBorder: '#3f3f46',            // Zinc-700 borders
              colorDanger: '#dc2626',            // Red for errors
              
              // Layout & spacing
              fontFamily: 'Arial, Helvetica, sans-serif', // Match your font
              fontSize: '14px',
              borderRadius: '0px',               // Square corners!
              spacingUnit: '4px',
              
              // Additional theme colors
              buttonPrimaryColorBackground: '#dc2626',
              buttonPrimaryColorText: '#ffffff',
              buttonPrimaryColorBorder: '#dc2626',
              buttonSecondaryColorBackground: '#18181b',
              buttonSecondaryColorText: '#ffffff',
              buttonSecondaryColorBorder: '#3f3f46',
              
              // Form elements
              formBackgroundColor: '#0a0a0a',
              formBorderColor: '#3f3f46',
              formHighlightColorBorder: '#dc2626',
              
              // Action colors
              actionPrimaryColorText: '#dc2626',
              actionSecondaryColorText: '#a1a1aa',
              
              // Overlays (modals/dialogs)
              overlayBackgroundColor: '#000000',
              overlayBorderColor: '#3f3f46',
            },
            rules: {
              // Remove any border radius globally
              '.Input': {
                borderRadius: '0',
                backgroundColor: '#0a0a0a',
                borderColor: '#3f3f46',
                color: '#ffffff',
              },
              '.Button': {
                borderRadius: '0',
              },
              '.Tab': {
                borderRadius: '0',
                borderColor: '#3f3f46',
              },
              '.Tab--selected': {
                color: '#dc2626',
                borderBottomColor: '#dc2626',
              },
              '.Dialog': {
                borderRadius: '0',
                backgroundColor: '#000000',
                borderColor: '#3f3f46',
              },
              '.Label': {
                color: '#ffffff',
              },
              '.Text': {
                color: '#a1a1aa',
              },
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
      <div className="space-y-8">
        {/* Loading skeleton that matches your design */}
        {[1, 2, 3, 4].map((i) => (
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
          <span className="ml-3 text-zinc-400 text-sm">Loading components...</span>
        </div>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
      <div className="space-y-6">
        {/* Account Onboarding */}
        <div className="bg-black border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Account Setup</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Complete verification to receive payouts. All sensitive data is securely handled by Stripe.
          </p>
          <ConnectAccountOnboarding
            onExit={() => {
              console.log('Onboarding exited');
            }}
          />
        </div>

        {/* Account Management */}
        <div className="bg-black border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Bank Account</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Manage your bank account used for payouts.
          </p>
          <ConnectAccountManagement
            collectionOptions={{
              fields: 'eventually_due',
              futureRequirements: 'include',
            }}
          />
        </div>

        {/* Balance */}
        <div className="bg-black border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Balance</h2>
          <p className="text-sm text-zinc-400 mb-4">
            View your current balance. Payouts occur automatically on your schedule.
          </p>
          <ConnectBalances />
        </div>

        {/* Payouts */}
        <div className="bg-black border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Payout History</h2>
          <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800">
            <p className="text-xs text-zinc-400">
              <span className="text-zinc-300 font-medium">ⓘ About Payouts:</span>
              <br />• Stripe processing fees are deducted from each sale
              <br />• Standard payouts (free) arrive in 2-5 business days  
              <br />• Instant payouts available for 1.5% fee (if enabled)
              <br />• Fees are not refunded when issuing refunds
            </p>
          </div>
          <ConnectPayouts />
        </div>

        {accountId && (
          <div className="text-xs text-zinc-600 font-mono">
            Account ID: {accountId}
          </div>
        )}
      </div>
    </ConnectComponentsProvider>
  );
}