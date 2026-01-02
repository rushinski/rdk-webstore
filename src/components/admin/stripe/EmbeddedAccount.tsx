// src/components/admin/stripe/EmbeddedAccount.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { initStripeConnect } from '@/lib/stripe/connect-client';
import { logError } from '@/lib/log';

interface EmbeddedAccountProps {
  publishableKey: string;
}

type ConnectComponent = {
  mount: (el: HTMLElement) => void;
  unmount?: () => void;
};

export function EmbeddedAccount({ publishableKey }: EmbeddedAccountProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');

  const onboardingRef = useRef<HTMLDivElement>(null);
  const accountManagementRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<HTMLDivElement>(null);
  const payoutsRef = useRef<HTMLDivElement>(null);

  const stripeConnectInstanceRef = useRef<any>(null);
  const componentsRef = useRef<{
    onboarding?: ConnectComponent;
    accountManagement?: ConnectComponent;
    payments?: ConnectComponent;
    payouts?: ConnectComponent;
  }>({});

  // Prevent duplicate init in React Strict Mode (dev)
  const initOnceRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const abort = new AbortController();

    async function initializeComponents() {
      try {
        setIsLoading(true);
        setError('');

        if (!publishableKey) {
          throw new Error('Missing Stripe publishable key');
        }

        // In dev StrictMode, effects can run twice.
        // We guard to avoid double POST + double mount attempts.
        if (initOnceRef.current) return;
        initOnceRef.current = true;

        // Fetch account session (server: OK)
        const response = await fetch('/api/admin/stripe/account-session', {
          method: 'POST',
          signal: abort.signal,
          headers: { 'Cache-Control': 'no-store' },
        });

        if (!response.ok) {
          throw new Error(`Failed to create account session (${response.status})`);
        }

        const { client_secret, account_id } = (await response.json()) as {
          client_secret: string;
          account_id: string;
        };

        if (!mounted) return;

        setAccountId(account_id);

        // Initialize Stripe Connect via supported loader
        stripeConnectInstanceRef.current = await initStripeConnect({
          publishableKey,
          clientSecret: client_secret,
        });

        if (!mounted) return;

        const stripeConnect = stripeConnectInstanceRef.current;
        if (!stripeConnect) throw new Error('Stripe Connect instance missing after init');

        // Create and mount components
        const onboarding = stripeConnect.create('account-onboarding');
        const accountManagement = stripeConnect.create('account-management');
        const payments = stripeConnect.create('payments');
        const payouts = stripeConnect.create('payouts');

        componentsRef.current = {
          onboarding,
          accountManagement,
          payments,
          payouts,
        };

        if (onboardingRef.current) onboarding.mount(onboardingRef.current);
        if (accountManagementRef.current) accountManagement.mount(accountManagementRef.current);
        if (paymentsRef.current) payments.mount(paymentsRef.current);
        if (payoutsRef.current) payouts.mount(payoutsRef.current);

        setIsLoading(false);
      } catch (err: any) {
        logError(err, {
          layer: 'frontend',
          event: 'embedded_account_init_failed',
        });

        if (mounted) {
          setError('Failed to load banking components. Please refresh the page.');
          setIsLoading(false);
        }
      }
    }

    initializeComponents();

    return () => {
      mounted = false;
      abort.abort();

      Object.values(componentsRef.current).forEach((component) => {
        try {
          component?.unmount?.();
        } catch {
          // ignore
        }
      });

      componentsRef.current = {};
      stripeConnectInstanceRef.current = null;
      initOnceRef.current = false;
    };
  }, [publishableKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="ml-3 text-gray-400">Loading banking components...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Account Onboarding */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Setup</h2>
        <p className="text-sm text-gray-400 mb-4">
          Complete your account verification to start receiving payouts. All sensitive information (SSN, bank details) is securely collected and stored by Stripe.
        </p>
        <div ref={onboardingRef} />
      </div>

      {/* Account Management */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Details</h2>
        <p className="text-sm text-gray-400 mb-4">
          Manage your business information and bank account details.
        </p>
        <div ref={accountManagementRef} />
      </div>

      {/* Payments/Balance */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Balance & Transactions</h2>
        <p className="text-sm text-gray-400 mb-4">
          View your available balance and recent transactions.
        </p>
        <div ref={paymentsRef} />
      </div>

      {/* Payouts */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Payout History</h2>
        <p className=" text-yellow-400 mb-2 text-xs">
          ⓘ Stripe processing fees (card processing, ACH, etc.) are deducted from your payouts. These fees are paid by you, the seller, not the platform.
        </p>
        <p className="text-sm text-gray-400 mb-4">
          View and manage your payout schedule and history. Refunds may appear as negative transactions.
        </p>
        <div ref={payoutsRef} />
      </div>

      {accountId && (
        <div className="text-xs text-gray-500">
          Stripe Account ID: {accountId}
        </div>
      )}
    </div>
  );
}
