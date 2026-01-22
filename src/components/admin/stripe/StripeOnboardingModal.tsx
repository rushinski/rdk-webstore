// src/components/admin/stripe/StripeOnboardingModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { initStripeConnect } from '@/lib/stripe/connect-client';
import { connectAppearance } from '@/lib/stripe/connect-appearance';
import { logError } from '@/lib/log';
import { 
  ConnectComponentsProvider, 
  ConnectAccountOnboarding,
  ConnectNotificationBanner 
} from '@stripe/react-connect-js';

interface StripeOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  publishableKey: string;
  onCompleted: () => Promise<void> | void;
}

export function StripeOnboardingModal({ open, onClose, publishableKey, onCompleted }: StripeOnboardingModalProps) {
  const [isBooting, setIsBooting] = useState(false);
  const [bootError, setBootError] = useState<string>('');
  const [connectInstance, setConnectInstance] = useState<any>(null);

  useEffect(() => {
    if (!open) {
      setIsBooting(false);
      setBootError('');
      setConnectInstance(null);
      return;
    }
  }, [open]);

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
      logError(err, { layer: 'frontend', event: 'stripe_onboarding_boot_failed' });
      setBootError('Could not start Stripe onboarding. Please try again.');
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
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-sm shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-semibold text-white">Complete Verification</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Complete all requirements to enable payouts
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-zinc-800 hover:border-zinc-600 rounded-sm"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-zinc-300" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto">
            {bootError && (
              <div className="mb-4 rounded-sm border border-red-900/70 bg-red-950/20 p-4">
                <p className="text-sm text-red-400">{bootError}</p>
              </div>
            )}

            {!connectInstance ? (
              <div className="space-y-6">
                <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
                  <p className="text-sm text-zinc-300 mb-4">
                    Stripe will securely collect the information needed to enable payouts to your bank account.
                  </p>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>Business or personal information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>Bank account details for payouts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>Identity verification documents</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={boot}
                  disabled={isBooting}
                  className="w-full px-6 py-3 bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                >
                  {isBooting ? (
                    <span className="inline-flex items-center gap-2 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Start Verification'
                  )}
                </button>
              </div>
            ) : (
              <ConnectComponentsProvider connectInstance={connectInstance}>
                <div className="space-y-4">
                  {/* Notification Banner - Shows outstanding requirements automatically */}
                  <div className="rounded-sm border border-zinc-800 bg-zinc-900 overflow-hidden">
                    <ConnectNotificationBanner />
                  </div>

                  {/* Account Onboarding Component */}
                  <div className="rounded-sm border border-zinc-800 bg-zinc-900 p-4">
                    <ConnectAccountOnboarding 
                      onExit={() => {
                        // User clicked a "Done" or similar button in the embedded component
                        done();
                      }} 
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 rounded-sm border border-zinc-700"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={done}
                    className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium hover:bg-green-500 rounded-sm"
                  >
                    Save & Continue
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