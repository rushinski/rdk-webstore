'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, CheckCircle2 } from 'lucide-react';
import { initStripeConnect } from '@/lib/stripe/connect-client';
import { logError } from '@/lib/log';

import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectPayouts,
} from '@stripe/react-connect-js';
import { connectAppearance } from '@/lib/stripe/connect-appearance';

type WizardStep = 'intro' | 'onboarding' | 'bank' | 'payouts' | 'done';

export function StripeSetupWizardModal(props: {
  open: boolean;
  onClose: () => void;
  publishableKey: string;
  onCompleted: () => Promise<void> | void; // called after “Done” to refresh bank page status
}) {
  const { open, onClose, publishableKey, onCompleted } = props;

  const [step, setStep] = useState<WizardStep>('intro');
  const [isBooting, setIsBooting] = useState(false);
  const [bootError, setBootError] = useState<string>('');
  const [connectInstance, setConnectInstance] = useState<any>(null);

  const stepOrder = useMemo<WizardStep[]>(
    () => ['intro', 'onboarding', 'bank', 'payouts', 'done'],
    []
  );

  const stepIndex = stepOrder.indexOf(step);

  // Boot Stripe Connect ONLY when modal opens (not on page load).
  useEffect(() => {
    if (!open) return;

    // reset
    setStep('intro');
    setBootError('');
    setConnectInstance(null);
  }, [open]);

  const bootStripe = async () => {
    if (!publishableKey) {
      setBootError('Stripe publishable key is missing. Contact support.');
      return;
    }

    setIsBooting(true);
    setBootError('');

    try {
      const res = await fetch('/api/admin/stripe/account-session', { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create account session: ${text}`);
      }

      const { client_secret } = await res.json();

      const instance = await initStripeConnect({
        publishableKey,
        clientSecret: client_secret,
        appearance: connectAppearance,
      });

      setConnectInstance(instance);
      setStep('onboarding');
    } catch (err: any) {
      logError(err, { layer: 'frontend', event: 'stripe_connect_wizard_boot_failed' });
      setBootError('Could not start Stripe setup. Please try again.');
    } finally {
      setIsBooting(false);
    }
  };

  const goNext = () => {
    const next = stepOrder[Math.min(stepIndex + 1, stepOrder.length - 1)];
    setStep(next);
  };

  const goBack = () => {
    const prev = stepOrder[Math.max(stepIndex - 1, 0)];
    setStep(prev);
  };

  const finish = async () => {
    try {
      await onCompleted();
    } finally {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl max-h-[92vh] bg-black border border-zinc-800 rounded-sm shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Stripe Setup</p>
              <h2 className="text-lg font-semibold text-white">Set up payouts</h2>
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

          {/* Stepper */}
          <div className="px-5 pt-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {['Intro', 'Verify', 'Bank', 'Payouts', 'Done'].map((label, i) => {
                const active = i === stepIndex;
                const done = i < stepIndex;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className={[
                        'h-6 w-6 flex items-center justify-center border rounded-sm',
                        done
                          ? 'border-green-700 text-green-400'
                          : active
                          ? 'border-red-600 text-red-400'
                          : 'border-zinc-800 text-zinc-500',
                      ].join(' ')}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={active ? 'text-white' : ''}>{label}</span>
                    {i < 4 && <span className="text-zinc-700">—</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-5 overflow-y-auto">
            {bootError ? (
              <div className="border border-red-900/70 bg-zinc-950 p-4">
                <p className="text-sm text-red-400">{bootError}</p>
              </div>
            ) : null}

            {step === 'intro' ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-300">
                  This is a one-time setup to enable payouts. Stripe will collect and verify your
                  required information securely.
                </p>

                <div className="text-xs text-zinc-500 border border-zinc-800 p-4 bg-zinc-950">
                  <p className="text-zinc-300 font-medium mb-2">What you’ll do:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Verify identity/business details</li>
                    <li>Add a bank account for payouts</li>
                    <li>Confirm payout schedule</li>
                  </ul>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={bootStripe}
                    disabled={isBooting}
                    className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-60"
                  >
                    {isBooting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Starting…
                      </span>
                    ) : (
                      'Start Setup'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-zinc-800 text-zinc-200 text-sm hover:border-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {step !== 'intro' && !connectInstance ? (
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                Loading Stripe components…
              </div>
            ) : null}

            {connectInstance ? (
              <ConnectComponentsProvider connectInstance={connectInstance}>
                {step === 'onboarding' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-white font-semibold">Step 1 — Verification</h3>
                      <p className="text-sm text-zinc-400">
                        Provide the required verification details. When finished, click “Next”.
                      </p>
                    </div>
                    <div className="border border-zinc-800 p-4 bg-black">
                      <ConnectAccountOnboarding onExit={() => {}} />
                    </div>
                  </div>
                ) : null}

                {step === 'bank' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-white font-semibold">Step 2 — Bank account</h3>
                      <p className="text-sm text-zinc-400">
                        Add or update the bank account where payouts will be sent.
                      </p>
                    </div>
                    <div className="border border-zinc-800 p-4 bg-black">
                      <ConnectAccountManagement
                        collectionOptions={{ fields: 'eventually_due', futureRequirements: 'include' }}
                      />
                    </div>
                  </div>
                ) : null}

                {step === 'payouts' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-white font-semibold">Step 3 — Payout schedule</h3>
                      <p className="text-sm text-zinc-400">
                        Review payout schedule settings. Standard payouts are free.
                      </p>
                    </div>
                    <div className="border border-zinc-800 p-4 bg-black">
                      <ConnectPayouts />
                    </div>
                    <p className="text-xs text-zinc-500">
                      If Stripe needs to review your details, this page will show “In review” on the
                      Bank page afterward.
                    </p>
                  </div>
                ) : null}

                {step === 'done' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <h3 className="text-white font-semibold">Setup complete</h3>
                    </div>
                    <p className="text-sm text-zinc-400">
                      We’ll refresh your account status now. If Stripe is still reviewing your info,
                      you’ll see that clearly on the Bank page.
                    </p>
                  </div>
                ) : null}
              </ConnectComponentsProvider>
            ) : null}
          </div>

          {/* Footer Nav */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 'intro' || step === 'onboarding'}
              className="px-4 py-2 border border-zinc-800 text-zinc-200 text-sm hover:border-zinc-600 disabled:opacity-40"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              {step !== 'intro' && step !== 'done' ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500"
                >
                  Next
                </button>
              ) : null}

              {step === 'done' ? (
                <button
                  type="button"
                  onClick={finish}
                  className="px-4 py-2 bg-green-700 text-white text-sm hover:bg-green-600"
                >
                  Done
                </button>
              ) : null}

              {/* If user is on payouts step and clicks next -> done */}
              {step === 'payouts' ? (
                <button
                  type="button"
                  onClick={() => setStep('done')}
                  className="px-4 py-2 border border-zinc-800 text-zinc-200 text-sm hover:border-zinc-600"
                >
                  Finish
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
