// app/admin/bank/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { logError } from '@/lib/log';
import { Toast } from '@/components/ui/Toast';
import { StripeOnboardingModal } from '@/components/admin/stripe/StripeOnboardingModal';

type StripeAccount = {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  email: string | null;
};

type StripeBalance = {
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
};

type StripePayout = {
  id: string;
  amount: number;
  currency: string;
  arrival_date: number | null;
  status: string;
  created: number;
};

type PayoutSchedule = {
  interval?: string | null;
  weekly_anchor?: string | null;
  monthly_anchor?: number | null;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp?: number | null) {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleDateString();
}

function getNextPayoutEstimate(schedule: PayoutSchedule | null): string {
  const interval = schedule?.interval ?? null;
  if (!interval || interval === 'manual') return 'Manual payouts only';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (interval === 'daily') {
    const next = new Date(startOfToday);
    next.setDate(next.getDate() + 1);
    return next.toLocaleDateString();
  }

  if (interval === 'weekly') {
    const anchor = (schedule?.weekly_anchor ?? 'monday').toLowerCase();
    const order = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetIdx = order.indexOf(anchor);
    const todayIdx = startOfToday.getDay();
    let delta = targetIdx - todayIdx;
    if (delta <= 0) delta += 7;
    const next = new Date(startOfToday);
    next.setDate(next.getDate() + delta);
    return next.toLocaleDateString();
  }

  if (interval === 'monthly') {
    const anchorDay = schedule?.monthly_anchor ?? 1;
    const y = startOfToday.getFullYear();
    const m = startOfToday.getMonth();
    const d = startOfToday.getDate();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const thisMonthDay = Math.min(anchorDay, daysInMonth);
    let next = new Date(y, m, thisMonthDay);
    if (d >= thisMonthDay) {
      const daysInNextMonth = new Date(y, m + 2, 0).getDate();
      const nextMonthDay = Math.min(anchorDay, daysInNextMonth);
      next = new Date(y, m + 1, nextMonthDay);
    }
    return next.toLocaleDateString();
  }

  return '-';
}

function normalizeMoneyInput(value: string) {
  // Keep digits + single dot. No negative.
  const cleaned = value.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`; // collapse extra dots
}

function dollarsToCentsSafe(value: string) {
  const normalized = normalizeMoneyInput(value).trim();
  if (!normalized) return null;

  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;

  const cents = Math.round(num * 100);
  if (!Number.isInteger(cents) || cents <= 0) return null;

  return cents;
}

export default function BankPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule | null>(null);
  const [upcomingPayouts, setUpcomingPayouts] = useState<StripePayout[]>([]);
  const [payoutsScope, setPayoutsScope] = useState<"upcoming" | "recent">("upcoming");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);

  // Manual payout modal state
  const [manualPayoutOpen, setManualPayoutOpen] = useState(false);
  const [isCreatingPayout, setIsCreatingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>(''); // dollars input
  const [payoutMethod, setPayoutMethod] = useState<'standard' | 'instant'>('standard');

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  const fetchAccountStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/stripe/account', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch account status');
      const data = await response.json();

      setAccount(data.account ?? null);
      setBalance(data.balance ?? null);
      setPayoutSchedule(data.payout_schedule ?? null);
      setErrorMessage('');
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'fetch_stripe_account_status' });
      setErrorMessage('Could not load banking information.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUpcomingPayouts = async () => {
    try {
      const response = await fetch('/api/admin/stripe/payouts?limit=3', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const payouts = data.payouts ?? [];
      const pending = payouts.filter(
        (p: StripePayout) => p.status === 'pending' || p.status === 'in_transit'
      );
      if (pending.length > 0) {
        setUpcomingPayouts(pending.slice(0, 3));
        setPayoutsScope('upcoming');
      } else {
        setUpcomingPayouts(payouts.slice(0, 3));
        setPayoutsScope('recent');
      }
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'fetch_upcoming_payouts' });
    }
  };

  useEffect(() => {
    fetchAccountStatus();
    fetchUpcomingPayouts();
  }, []);

  const isSetupComplete = !!account?.details_submitted && !!account?.payouts_enabled;
  const manualMode = payoutSchedule?.interval === 'manual';

  const availableBalance = balance?.available?.[0];
  const pendingBalance = balance?.pending?.[0];

  const availableCurrency = useMemo(() => {
    return (availableBalance?.currency ?? 'usd').toLowerCase();
  }, [availableBalance?.currency]);

  const availableCents = useMemo(() => {
    const amt = availableBalance?.amount;
    return typeof amt === 'number' && Number.isFinite(amt) && amt >= 0 ? amt : 0;
  }, [availableBalance?.amount]);

  const nextPayoutDate = getNextPayoutEstimate(payoutSchedule);

  const payoutCents = useMemo(() => dollarsToCentsSafe(payoutAmount), [payoutAmount]);
  const exceedsAvailable = (payoutCents ?? 0) > availableCents;

  const closeManualPayout = () => {
    setManualPayoutOpen(false);
    setIsCreatingPayout(false);
    setPayoutAmount('');
    setPayoutMethod('standard');
  };

  const createManualPayout = async () => {
    if (!manualMode) {
      setToast({ message: 'Manual payouts are only available when payout mode is set to Manual.', tone: 'error' });
      return;
    }

    if (!account?.payouts_enabled) {
      setToast({ message: 'Payouts are not enabled yet. Complete setup first.', tone: 'error' });
      return;
    }

    if (availableCents <= 0) {
      setToast({ message: 'No available balance to payout.', tone: 'error' });
      return;
    }

    if (payoutCents == null) {
      setToast({ message: 'Enter a valid payout amount.', tone: 'error' });
      return;
    }

    if (payoutCents > availableCents) {
      setToast({ message: 'Amount exceeds your available balance.', tone: 'error' });
      return;
    }

    setIsCreatingPayout(true);
    try {
      const res = await fetch('/api/admin/stripe/payout-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payoutCents,
          currency: availableCurrency,
          method: payoutMethod,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Failed to create payout');

      setToast({ message: 'Payout created.', tone: 'success' });
      closeManualPayout();
      await fetchAccountStatus();
      await fetchUpcomingPayouts();
    } catch (err: any) {
      logError(err, { layer: 'frontend', event: 'create_manual_payout' });
      setToast({ message: err?.message ?? 'Failed to create payout.', tone: 'error' });
      setIsCreatingPayout(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bank</h1>
          <p className="text-zinc-400 text-sm">Manage your payouts and transfers</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-red-500" />
          <span className="ml-3 text-zinc-400 text-sm">Loading account details...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bank</h1>
          <p className="text-zinc-400 text-sm">Manage your payouts and transfers</p>
        </div>
        <div className="rounded-sm bg-zinc-900 border border-red-900/70 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-400 text-sm">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StripeOnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        publishableKey={publishableKey}
        onCompleted={() => {
          fetchAccountStatus();
          fetchUpcomingPayouts();
        }}
      />

      {/* Manual payout modal */}
      {manualPayoutOpen && (
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/80" onClick={closeManualPayout} aria-hidden="true" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-sm shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-xl font-semibold text-white">Create manual payout</h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    Send funds from your available balance to your linked bank account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeManualPayout}
                  className="p-2 border border-zinc-800 hover:border-zinc-600 rounded-sm"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-zinc-300" />
                </button>
              </div>

              <div className="px-6 py-6 overflow-y-auto">
                {!manualMode ? (
                  <div className="rounded-sm bg-zinc-900 border border-red-900/70 p-4">
                    <p className="text-sm text-red-400">
                      Manual payouts are only available when your payout mode is set to <strong>Manual</strong> in Transfer Settings.
                    </p>
                    <div className="mt-3">
                      <Link href="/admin/settings/transfers" className="text-sm text-red-500 hover:text-red-400">
                        Go to Transfer Settings
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Top context / availability */}
                    <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-zinc-400 uppercase tracking-wider">Available to payout</p>
                          <p className="text-2xl font-bold text-white mt-1">
                            {availableBalance
                              ? formatCurrency(availableBalance.amount, availableBalance.currency)
                              : formatCurrency(0, availableCurrency)}
                          </p>
                          <p className="text-xs text-zinc-500 mt-2">
                            You can't payout more than your available balance.
                          </p>
                        </div>
                        {!account?.payouts_enabled && (
                          <span className="px-2 py-1 text-xs rounded-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                            Setup required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Form */}
                    <div className="mt-5 grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm text-zinc-300 mb-2">
                          Amount ({availableCurrency.toUpperCase()})
                        </label>
                        <input
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(normalizeMoneyInput(e.target.value))}
                          inputMode="decimal"
                          placeholder="e.g. 25.00"
                          className="w-full bg-zinc-950 text-white px-4 py-2.5 border border-zinc-800/70 rounded-sm focus:outline-none focus:border-zinc-700"
                        />
                        {exceedsAvailable ? (
                          <p className="text-xs text-red-400 mt-2">
                            Amount exceeds available balance.
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-600 mt-2">
                            Enter a value up to{' '}
                            {availableBalance
                              ? formatCurrency(availableBalance.amount, availableBalance.currency)
                              : formatCurrency(0, availableCurrency)}
                            .
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-300 mb-2">Method</label>
                        <select
                          value={payoutMethod}
                          onChange={(e) => setPayoutMethod(e.target.value === 'instant' ? 'instant' : 'standard')}
                          className="w-full bg-zinc-950 text-white px-4 py-2.5 border border-zinc-800/70 rounded-sm focus:outline-none focus:border-zinc-700"
                        >
                          <option value="standard">Standard (2-3 business days)</option>
                          <option value="instant">Instant (if eligible)</option>
                        </select>

                        {/* Fees disclaimer placed directly under the method */}
                        <div className="mt-2 rounded-sm bg-zinc-950 border border-zinc-800/70 p-3">
                          <p className="text-xs text-zinc-500">
                            <strong className="text-zinc-400">Fees & timing:</strong> Standard payouts usually arrive in 2-3
                            business days and are typically free. Instant payouts (if available) generally arrive within ~30 minutes
                            but may include additional Stripe fees. Eligibility and timing can vary by account and bank.
                          </p>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={closeManualPayout}
                          className="px-4 py-2 border border-zinc-800/70 text-sm text-zinc-300 hover:border-zinc-700"
                          disabled={isCreatingPayout}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={createManualPayout}
                          disabled={
                            isCreatingPayout ||
                            !account?.payouts_enabled ||
                            availableCents <= 0 ||
                            payoutCents == null ||
                            payoutCents <= 0 ||
                            payoutCents > availableCents
                          }
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isCreatingPayout ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create payout'
                          )}
                        </button>
                      </div>

                      {/* Bottom note (reinforces fees + bank variance) */}
                      <div className="rounded-sm bg-zinc-950 border border-zinc-800/70 p-3">
                        <p className="text-xs text-zinc-500">
                          <strong className="text-zinc-400">Note:</strong> Some banks may post funds later than Stripe's estimate.
                          If instant payouts aren't eligible, Stripe may reject the payout and you can retry using Standard.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Bank</h1>
          <p className="text-zinc-400 text-sm">Manage your payouts and transfers</p>
        </div>
        {!isSetupComplete && (
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500"
          >
            {!account ? 'Setup payouts' : 'Continue setup'}
          </button>
        )}
      </div>

      {/* Setup Warning */}
      {!isSetupComplete && (
        <div className="rounded-sm bg-yellow-900/20 border border-yellow-500/30 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-200 text-sm font-medium">Setup Required</p>
              <p className="text-yellow-200/80 text-sm mt-1">
                Complete your Stripe verification to enable payouts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Balance */}
      <section className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">Current Balance</h2>

          {/* Manual payout button (top-right of Current Balance) */}
          {manualMode ? (
            <button
              type="button"
              onClick={() => setManualPayoutOpen(true)}
              disabled={!account?.payouts_enabled || availableCents <= 0}
              className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !account?.payouts_enabled
                  ? 'Payouts are not enabled yet'
                  : availableCents <= 0
                    ? 'No available balance to payout'
                    : 'Create a manual payout'
              }
            >
              Create manual payout
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Available</p>
            <p className="text-3xl font-bold text-white">
              {availableBalance ? formatCurrency(availableBalance.amount, availableBalance.currency) : '$0.00'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Ready to payout</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Pending</p>
            <p className="text-3xl font-bold text-white">
              {pendingBalance ? formatCurrency(pendingBalance.amount, pendingBalance.currency) : '$0.00'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Processing</p>
          </div>
        </div>

        {/* Small inline hint under balances when manual is enabled */}
        {manualMode ? (
          <div className="mt-4 rounded-sm bg-zinc-950 border border-zinc-800/70 p-3">
            <p className="text-xs text-zinc-500">
              <strong className="text-zinc-400">Manual mode:</strong> You control when payouts are sent.
              Use "Create manual payout" to send funds to your bank.
            </p>
          </div>
        ) : null}
      </section>

      {/* Upcoming Transfers */}
      <section className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {payoutsScope === 'recent' ? 'Recent Transfers' : 'Upcoming Transfers'}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {manualMode
                ? 'Manual payouts only'
                : payoutsScope === 'recent'
                  ? 'Latest payout activity from Stripe'
                  : `Next automatic payout: ${nextPayoutDate}`}
            </p>
          </div>
          <Link
            href="/admin/bank/transfers"
            className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingPayouts.length > 0 ? (
          <div className="space-y-3">
            {upcomingPayouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-4 rounded-sm bg-zinc-950 border border-zinc-800/70"
              >
                <div>
                  <p className="text-white font-medium">{formatCurrency(payout.amount, payout.currency)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Arriving {formatDate(payout.arrival_date)}</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                  {payout.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-500 text-sm">No transfers yet</p>
            <p className="text-zinc-600 text-xs mt-1">
              {manualMode
                ? 'Create a manual payout from your available balance.'
                : 'Transfers will appear here when scheduled'}
            </p>
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          href="/admin/settings/transfers"
          className="block rounded-sm bg-zinc-900 border border-zinc-800/70 p-6 hover:border-zinc-700 transition-colors"
        >
          <h3 className="text-lg font-semibold text-white mb-2">Transfer Settings</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Configure automatic or manual payouts, set frequency, and manage your bank account
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-red-500">
            Manage settings
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/admin/bank/transfers"
          className="block rounded-sm bg-zinc-900 border border-zinc-800/70 p-6 hover:border-zinc-700 transition-colors"
        >
          <h3 className="text-lg font-semibold text-white mb-2">View All Transfers</h3>
          <p className="text-sm text-zinc-400 mb-4">See complete history of all payouts and transfer details</p>
          <div className="inline-flex items-center gap-2 text-sm text-red-500">
            View history
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </section>

      {/* Global fees disclaimer */}
      <div className="rounded-sm bg-zinc-950 border border-zinc-800/70 p-4">
        <p className="text-xs text-zinc-500">
          <strong className="text-zinc-400">Note:</strong> Standard payouts typically arrive in 2-3 business days and are
          usually free. Instant payouts (if available) generally arrive within ~30 minutes but may include additional fees
          charged by Stripe. Actual timing and eligibility can vary by account and bank.
        </p>
      </div>

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        tone={toast?.tone ?? 'info'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
