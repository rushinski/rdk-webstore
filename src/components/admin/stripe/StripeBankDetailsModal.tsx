// src/components/admin/stripe/StripeBankDetailsModal.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { initStripeConnect } from '@/lib/stripe/connect-client';
import { connectAppearance } from '@/lib/stripe/connect-appearance';
import { logError } from '@/lib/log';

import {
  ConnectComponentsProvider,
  ConnectAccountManagement,
  ConnectBalances,
  ConnectPayouts,
} from '@stripe/react-connect-js';

type Tab = 'banks' | 'balances' | 'payouts';

export function StripeBankDetailsModal(props: {
  open: boolean;
  onClose: () => void;
  publishableKey: string;
  defaultTab?: Tab;
}) {
  const { open, onClose, publishableKey, defaultTab } = props;

  const [tab, setTab] = useState<Tab>(defaultTab ?? 'banks');
  const [isBooting, setIsBooting] = useState(false);
  const [bootError, setBootError] = useState('');
  const [connectInstance, setConnectInstance] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setTab(defaultTab ?? 'banks');
    setBootError('');
    setConnectInstance(null); // keep lazy + avoid loading unless user clicks
  }, [open, defaultTab]);

  const subtitle = useMemo(() => {
    if (tab === 'banks') return 'Add/edit payout banks and manage payout details (Stripe hosted).';
    if (tab === 'balances') return 'Available, pending, and upcoming payout information.';
    return 'Stripe payout history and details.';
  }, [tab]);

  const boot = async () => {
    if (!publishableKey) {
      setBootError('Stripe publishable key is missing.');
      return;
    }

    setIsBooting(true);
    setBootError('');

    try {
      const res = await fetch('/api/admin/stripe/account-session', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());

      const { client_secret } = await res.json();

      const instance = await initStripeConnect({
        publishableKey,
        clientSecret: client_secret,
        appearance: connectAppearance,
      });

      setConnectInstance(instance);
    } catch (err: any) {
      logError(err, { layer: 'frontend', event: 'stripe_bank_details_boot_failed' });
      setBootError('Could not load Stripe bank details. Please try again.');
    } finally {
      setIsBooting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl max-h-[92vh] bg-black border border-zinc-800 rounded-sm shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Stripe</p>
              <h2 className="text-lg font-semibold text-white">Bank details</h2>
              <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
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

          <div className="px-5 py-5 overflow-y-auto space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              {(['banks', 'balances', 'payouts'] as Tab[]).map((key) => {
                const active = key === tab;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={[
                      'px-3 py-2 text-sm border rounded-sm',
                      active
                        ? 'bg-zinc-900 border-zinc-700 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700',
                    ].join(' ')}
                  >
                    {key === 'banks' ? 'Banks' : key === 'balances' ? 'Balances' : 'Payouts'}
                  </button>
                );
              })}

              <div className="flex-1" />

              {!connectInstance ? (
                <button
                  type="button"
                  onClick={boot}
                  disabled={isBooting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-60 rounded-sm"
                >
                  {isBooting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isBooting ? 'Loading…' : 'Load'}
                </button>
              ) : null}
            </div>

            {/* Lazy boot */}
            {!connectInstance ? (
              <div className="rounded-sm border border-zinc-800 bg-zinc-950 p-4">
                {bootError ? (
                  <div className="mb-2 text-sm text-red-400">{bootError}</div>
                ) : (
                  <div className="text-sm text-zinc-400">
                    Stripe-hosted tools load only when you click <span className="text-zinc-200">Load</span>.
                  </div>
                )}
                <div className="mt-2 text-xs text-zinc-600">
                  Tip: this avoids loading embedded Stripe UI on every Bank page visit.
                </div>
              </div>
            ) : (
              <ConnectComponentsProvider connectInstance={connectInstance}>
                {tab === 'banks' ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-4">
                    <ConnectAccountManagement
                      collectionOptions={{ fields: 'eventually_due', futureRequirements: 'include' }}
                    />
                    <div className="mt-3 text-xs text-zinc-500">
                      Note: Stripe may show “linked external accounts” from one institution (multiple accounts/rails).
                      Your payout-capable banks are shown on the main Bank page.
                    </div>
                  </div>
                ) : null}

                {tab === 'balances' ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-4">
                    <ConnectBalances />
                  </div>
                ) : null}

                {tab === 'payouts' ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-4">
                    <ConnectPayouts />
                  </div>
                ) : null}
              </ConnectComponentsProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
