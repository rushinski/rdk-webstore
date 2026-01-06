// src/components/admin/stripe/StripeBalancesPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { initStripeConnect } from '@/lib/stripe/connect-client';
import { connectAppearance } from '@/lib/stripe/connect-appearance';
import { logError } from '@/lib/log';

import { ConnectComponentsProvider, ConnectBalances } from '@stripe/react-connect-js';

export function StripeBalancesPanel(props: { publishableKey: string }) {
  const { publishableKey } = props;
  const [connectInstance, setConnectInstance] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!publishableKey) {
        setError('Stripe publishable key is missing.');
        return;
      }

      try {
        const res = await fetch('/api/admin/stripe/account-session?mode=balances', { method: 'POST' });
        if (!res.ok) throw new Error(await res.text());
        const { client_secret } = await res.json();

        const instance = await initStripeConnect({
          publishableKey,
          clientSecret: client_secret,
          appearance: connectAppearance,
        });

        if (!cancelled) setConnectInstance(instance);
      } catch (e: any) {
        logError(e, { layer: 'frontend', event: 'stripe_balances_boot_failed' });
        if (!cancelled) setError('Failed to load balances.');
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [publishableKey]);

  if (error) {
    return (
      <div className="rounded-sm bg-zinc-900 border border-red-900/70 p-6 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!connectInstance) {
    return (
      <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          Loading balances...
        </div>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-4">
        <ConnectBalances />
      </div>
    </ConnectComponentsProvider>
  );
}
