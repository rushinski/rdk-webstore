// src/components/admin/stripe/StripeBankDetailsDrawer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { initStripeConnect } from '@/lib/stripe/connect-client';
import { connectAppearance } from '@/lib/stripe/connect-appearance';
import { logError } from '@/lib/log';

import { ConnectComponentsProvider, ConnectAccountManagement } from '@stripe/react-connect-js';

export function StripeBankDetailsDrawer(props: {
  isOpen: boolean;
  onClose: () => void;
  publishableKey: string;
}) {
  const { isOpen, onClose, publishableKey } = props;

  const [connectInstance, setConnectInstance] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setConnectInstance(null);
    setError('');

    const boot = async () => {
      if (!publishableKey) {
        setError('Stripe publishable key is missing.');
        return;
      }

      try {
        const res = await fetch('/api/admin/stripe/account-session?mode=banks', { method: 'POST' });
        if (!res.ok) throw new Error(await res.text());
        const { client_secret } = await res.json();

        const instance = await initStripeConnect({
          publishableKey,
          clientSecret: client_secret,
          appearance: connectAppearance,
        });

        if (!cancelled) setConnectInstance(instance);
      } catch (e: any) {
        logError(e, { layer: 'frontend', event: 'stripe_bank_details_boot_failed' });
        if (!cancelled) setError('Failed to load bank details.');
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [isOpen, publishableKey]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Bank details"
      subtitle="Add/edit payout bank accounts (Stripe-hosted)."
      side="right"
      widthClassName="w-[720px] max-w-[92vw]"
      zIndexClassName="z-[10000]"
    >
      {error ? (
        <div className="rounded-sm bg-zinc-900 border border-red-900/70 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : !connectInstance ? (
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          Loading bank tools...
        </div>
      ) : (
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-4">
            <ConnectAccountManagement
              collectionOptions={{ fields: 'eventually_due', futureRequirements: 'include' }}
            />
            <div className="mt-3 text-xs text-zinc-500">
              Note: Stripe may show more “linked external accounts” than payout banks — that’s normal when
              an institution link contains multiple accounts.
            </div>
          </div>
        </ConnectComponentsProvider>
      )}
    </Drawer>
  );
}
