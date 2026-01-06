// app/admin/bank/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
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

export default function BankPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule | null>(null);
  const [upcomingPayouts, setUpcomingPayouts] = useState<StripePayout[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);

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
      const pending = data.payouts?.filter((p: StripePayout) => 
        p.status === 'pending' || p.status === 'in_transit'
      ) || [];
      setUpcomingPayouts(pending.slice(0, 3));
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'fetch_upcoming_payouts' });
    }
  };

  useEffect(() => {
    fetchAccountStatus();
    fetchUpcomingPayouts();
  }, []);

  const isSetupComplete = !!account?.details_submitted && !!account?.payouts_enabled;
  const availableBalance = balance?.available?.[0];
  const pendingBalance = balance?.pending?.[0];
  const nextPayoutDate = getNextPayoutEstimate(payoutSchedule);

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
                Complete your Stripe verification to enable automatic payouts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Balance */}
      <section className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Current Balance</h2>
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
      </section>

      {/* Upcoming Transfers */}
      <section className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Upcoming Transfers</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {payoutSchedule?.interval === 'manual' 
                ? 'Manual payouts only' 
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
                  <p className="text-white font-medium">
                    {formatCurrency(payout.amount, payout.currency)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Arriving {formatDate(payout.arrival_date)}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs rounded-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                  {payout.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-500 text-sm">No upcoming transfers</p>
            <p className="text-zinc-600 text-xs mt-1">
              {payoutSchedule?.interval === 'manual' 
                ? 'Set up automatic payouts in Transfer Settings' 
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
          <p className="text-sm text-zinc-400 mb-4">
            See complete history of all payouts and transfer details
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-red-500">
            View history
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </section>

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        tone={toast?.tone ?? 'info'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}