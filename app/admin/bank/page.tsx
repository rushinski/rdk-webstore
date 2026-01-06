'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Trash2, X } from 'lucide-react';
import { logError } from '@/lib/log';
import { Toast } from '@/components/ui/Toast';
import { StripeOnboardingModal } from '@/components/admin/stripe/StripeOnboardingModal';
import { StripeBankDetailsModal } from '@/components/admin/stripe/StripeBankDetailsModal';

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

type BankAccount = {
  id: string;
  bank_name: string | null;
  last4: string | null;
  currency: string | null;
  status: string | null;
  default_for_currency: boolean;
  account_holder_name: string | null;
};

type PayoutSchedule = {
  interval?: string | null;
  weekly_anchor?: string | null;
  monthly_anchor?: number | null;
};

type StripePayout = {
  id: string;
  amount: number;
  currency: string;
  arrival_date: number | null;
  status: string;
  method: string | null;
  type: string | null;
  created: number;
};

const WEEKLY_ANCHORS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
] as const;

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

const formatScheduleLabel = (schedule: PayoutSchedule | null) => {
  const interval = schedule?.interval;
  if (!interval) return 'Not set';
  if (interval === 'manual') return 'Manual';
  if (interval === 'daily') return 'Automatic — Daily';
  if (interval === 'weekly') {
    const anchor = schedule.weekly_anchor ?? 'monday';
    return `Automatic — Weekly (${anchor.charAt(0).toUpperCase()}${anchor.slice(1)})`;
  }
  if (interval === 'monthly') {
    return `Automatic — Monthly (Day ${schedule.monthly_anchor ?? 1})`;
  }
  return interval;
};

const formatPayoutDate = (value?: number | null) => {
  if (!value) return '-';
  return new Date(value * 1000).toLocaleDateString();
};

const formatPayoutTime = (value?: number | null) => {
  if (!value) return '';
  return new Date(value * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function estimateNextPayoutDate(schedule: PayoutSchedule | null): string {
  const interval = schedule?.interval ?? null;
  if (!interval || interval === 'manual') return '-';

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
    if (delta <= 0) delta += 7; // show "upcoming" (not today)
    const next = new Date(startOfToday);
    next.setDate(next.getDate() + delta);
    return next.toLocaleDateString();
  }

  if (interval === 'monthly') {
    const anchorDay =
      typeof schedule?.monthly_anchor === 'number' && schedule.monthly_anchor >= 1 && schedule.monthly_anchor <= 31
        ? schedule.monthly_anchor
        : 1;

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

type BankDetailsTab = 'banks' | 'balances' | 'payouts';

export default function BankPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule | null>(null);

  // Payout history – lazy loaded (only when modal opens)
  const [payouts, setPayouts] = useState<StripePayout[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(false);
  const [hasLoadedPayoutsOnce, setHasLoadedPayoutsOnce] = useState(false);

  // Modals
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const [bankDetailsOpen, setBankDetailsOpen] = useState(false);
  const [bankDetailsTab, setBankDetailsTab] = useState<BankDetailsTab>('banks');

  const [payoutHistoryOpen, setPayoutHistoryOpen] = useState(false);

  // Schedule modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<{
    interval: 'manual' | 'daily' | 'weekly' | 'monthly';
    weekly_anchor: typeof WEEKLY_ANCHORS[number]['value'];
    monthly_anchor: number;
  }>({ interval: 'daily', weekly_anchor: 'monday', monthly_anchor: 1 });

  // Default bank picker
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Payout now modal
  const [payoutNowOpen, setPayoutNowOpen] = useState(false);
  const [payoutNowAmount, setPayoutNowAmount] = useState<number>(0);
  const [payoutNowCurrency, setPayoutNowCurrency] = useState<string>('usd');
  const [payoutNowMethod, setPayoutNowMethod] = useState<'standard' | 'instant'>('standard');
  const [isCreatingPayout, setIsCreatingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  // Bank delete
  const [isDeletingBankId, setIsDeletingBankId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(
    null
  );

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  const fetchAccountStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/stripe/account', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch account status');
      const data = await response.json();

      setAccount(data.account ?? null);
      setBalance(data.balance ?? null);
      setBankAccounts(data.bank_accounts ?? []);
      setPayoutSchedule(data.payout_schedule ?? null);
      setErrorMessage('');
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'fetch_stripe_account_status' });
      setErrorMessage('Could not load your banking information.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayoutHistory = async () => {
    setIsLoadingPayouts(true);
    try {
      const response = await fetch('/api/admin/stripe/payouts', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch payouts');
      const data = await response.json();
      setPayouts(data.payouts ?? []);
      setHasLoadedPayoutsOnce(true);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'fetch_stripe_payouts' });
      setPayouts([]);
    } finally {
      setIsLoadingPayouts(false);
    }
  };

  useEffect(() => {
    fetchAccountStatus();
    // NOTE: do NOT fetch payouts on load (avoid unnecessary calls)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSetupComplete = !!account?.details_submitted && !!account?.payouts_enabled;

  const statusLabel = !account
    ? 'Not Connected'
    : isSetupComplete
    ? 'Active'
    : account.details_submitted && !account.payouts_enabled
    ? 'In Review'
    : 'Setup Required';

  const payoutStatusClass =
    statusLabel === 'Active'
      ? 'text-green-500'
      : statusLabel === 'In Review'
      ? 'text-yellow-500'
      : statusLabel === 'Setup Required'
      ? 'text-yellow-500'
      : 'text-zinc-500';

  const availableBalance = balance?.available?.[0];
  const pendingBalance = balance?.pending?.[0];

  const primaryBankAccount =
    bankAccounts.find((entry) => entry.default_for_currency) ?? bankAccounts[0] ?? null;

  const payoutSummary = useMemo(() => formatScheduleLabel(payoutSchedule), [payoutSchedule]);
  const nextPayoutEstimate = useMemo(() => estimateNextPayoutDate(payoutSchedule), [payoutSchedule]);

  const openAccountPicker = () => {
    setSelectedBankAccountId(primaryBankAccount?.id ?? bankAccounts[0]?.id ?? null);
    setAccountPickerOpen(true);
  };

  const openScheduleEditor = () => {
    const interval =
      payoutSchedule?.interval === 'manual' ||
      payoutSchedule?.interval === 'daily' ||
      payoutSchedule?.interval === 'weekly' ||
      payoutSchedule?.interval === 'monthly'
        ? (payoutSchedule.interval as 'manual' | 'daily' | 'weekly' | 'monthly')
        : 'daily';

    const weeklyAnchor =
      WEEKLY_ANCHORS.find((a) => a.value === payoutSchedule?.weekly_anchor)?.value ?? 'monday';

    const monthlyAnchor =
      typeof payoutSchedule?.monthly_anchor === 'number' &&
      payoutSchedule.monthly_anchor >= 1 &&
      payoutSchedule.monthly_anchor <= 31
        ? payoutSchedule.monthly_anchor
        : 1;

    setScheduleDraft({ interval, weekly_anchor: weeklyAnchor, monthly_anchor: monthlyAnchor });
    setScheduleModalOpen(true);
  };

  const handleUpdatePayoutAccount = async () => {
    if (!selectedBankAccountId) return;
    setIsSavingAccount(true);
    try {
      const response = await fetch('/api/admin/stripe/payout-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_account_id: selectedBankAccountId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Failed to update payout account');
      }

      await fetchAccountStatus();
      setToast({ message: 'Default payout bank updated.', tone: 'success' });
      setAccountPickerOpen(false);
    } catch {
      setToast({ message: 'Could not update payout bank.', tone: 'error' });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleUpdateSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const response = await fetch('/api/admin/stripe/payout-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleDraft),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Failed to update payout schedule');
      }

      const data = await response.json();
      setPayoutSchedule(data.schedule ?? scheduleDraft);
      setToast({ message: 'Payout schedule updated.', tone: 'success' });
      setScheduleModalOpen(false);
    } catch {
      setToast({ message: 'Could not update payout schedule.', tone: 'error' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const openPayoutNow = () => {
    setPayoutError('');
    setPayoutNowAmount(availableBalance?.amount ?? 0);
    setPayoutNowCurrency((availableBalance?.currency ?? 'usd').toLowerCase());
    setPayoutNowMethod('standard');
    setPayoutNowOpen(true);
  };

  const createPayoutNow = async () => {
    setIsCreatingPayout(true);
    setPayoutError('');
    try {
      const res = await fetch('/api/admin/stripe/payout-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payoutNowAmount,
          currency: payoutNowCurrency,
          method: payoutNowMethod,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Failed to create payout');

      setToast({ message: 'Payout created.', tone: 'success' });
      setPayoutNowOpen(false);

      // refresh light data
      await fetchAccountStatus();

      // payout history is likely relevant now, but still only load it if user opens the modal
      setHasLoadedPayoutsOnce(false);
      setPayouts([]);
    } catch (e: any) {
      setPayoutError(e?.message ?? 'Payout failed.');
    } finally {
      setIsCreatingPayout(false);
    }
  };

  const canDeleteBank = (bankId: string) => {
    const bank = bankAccounts.find((b) => b.id === bankId);
    if (!bank) return false;
    if (!bank.default_for_currency) return true;
    return bankAccounts.length > 1; // require switching default first
  };

  const deleteBank = async (bankId: string) => {
    setIsDeletingBankId(bankId);
    try {
      const res = await fetch('/api/admin/stripe/bank-account-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_account_id: bankId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Failed to delete bank');

      setToast({ message: 'Bank account removed.', tone: 'success' });
      await fetchAccountStatus();
    } catch {
      setToast({ message: 'Could not remove bank account.', tone: 'error' });
    } finally {
      setIsDeletingBankId(null);
    }
  };

  const openBankDetails = (tab: BankDetailsTab) => {
    setBankDetailsTab(tab);
    setBankDetailsOpen(true);
  };

  const openPayoutHistory = async () => {
    setPayoutHistoryOpen(true);
    if (!hasLoadedPayoutsOnce) {
      await fetchPayoutHistory();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bank</h1>
          <p className="text-zinc-400 text-sm">Manage payouts, balances, and banks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
              <div className="h-3 w-24 rounded bg-zinc-800 mb-3" />
              <div className="h-8 w-32 rounded bg-zinc-800" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center py-10">
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
          <p className="text-zinc-400 text-sm">Manage payouts, balances, and banks</p>
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
        onCompleted={() => fetchAccountStatus()}
      />

      <StripeBankDetailsModal
        open={bankDetailsOpen}
        onClose={() => setBankDetailsOpen(false)}
        publishableKey={publishableKey}
        defaultTab={bankDetailsTab}
      />

      {/* Payout history modal */}
      {payoutHistoryOpen && (
        <div className="fixed inset-0 z-[9999]">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setPayoutHistoryOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[92vh] bg-black border border-zinc-800 rounded-sm shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">Stripe</p>
                  <h2 className="text-lg font-semibold text-white">Payout history</h2>
                  <p className="text-sm text-zinc-400 mt-1">Recent payouts processed by Stripe.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchPayoutHistory}
                    className="px-3 py-2 border border-zinc-800/70 text-sm text-gray-300 hover:border-zinc-700"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutHistoryOpen(false)}
                    className="p-2 border border-zinc-800 hover:border-zinc-600"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-zinc-300" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 overflow-y-auto">
                {isLoadingPayouts ? (
                  <div className="rounded-sm border border-zinc-800/70 bg-zinc-950 p-6 text-sm text-zinc-500">
                    Loading payouts...
                  </div>
                ) : payouts.length === 0 ? (
                  <div className="rounded-sm border border-zinc-800/70 bg-zinc-950 p-6 text-sm text-zinc-500">
                    No payouts yet.
                  </div>
                ) : (
                  <div className="rounded-sm border border-zinc-800/70 bg-zinc-950 overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-zinc-900">
                          <th className="text-left text-gray-400 font-semibold p-4">Date</th>
                          <th className="text-left text-gray-400 font-semibold p-4">Arrival</th>
                          <th className="text-left text-gray-400 font-semibold p-4">Method</th>
                          <th className="text-left text-gray-400 font-semibold p-4">Status</th>
                          <th className="text-right text-gray-400 font-semibold p-4">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.map((payout) => {
                          const statusTone =
                            payout.status === 'paid'
                              ? 'text-green-400 border-green-500/20 bg-green-500/10'
                              : payout.status === 'failed'
                              ? 'text-red-400 border-red-500/20 bg-red-500/10'
                              : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';

                          return (
                            <tr key={payout.id} className="border-b border-zinc-800/70">
                              <td className="p-4 text-gray-300">
                                <div>{formatPayoutDate(payout.created)}</div>
                                <div className="text-xs text-gray-500">{formatPayoutTime(payout.created)}</div>
                              </td>
                              <td className="p-4 text-gray-300">{formatPayoutDate(payout.arrival_date)}</td>
                              <td className="p-4 text-gray-300">{payout.method ?? '-'}</td>
                              <td className="p-4">
                                <span className={`text-xs px-2 py-1 border rounded-sm ${statusTone}`}>
                                  {payout.status}
                                </span>
                              </td>
                              <td className="p-4 text-right text-white">
                                {formatCurrency(payout.amount, payout.currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Bank</h1>
          <p className="text-zinc-400 text-sm">Manage payouts, balances, and banks</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openBankDetails('banks')}
            className="px-4 py-2 border border-zinc-800/70 text-sm text-gray-300 hover:border-zinc-700"
          >
            Bank details
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isSetupComplete) setOnboardingOpen(true);
              else openPayoutNow();
            }}
            className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500"
          >
            {!account ? 'Setup payouts' : isSetupComplete ? 'Payout now' : 'Continue setup'}
          </button>
        </div>
      </div>

      <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-4">
        <p className="text-sm text-zinc-300">
          <span className="text-zinc-400">Stripe Status:</span>{' '}
          <span className={`${payoutStatusClass} font-semibold`}>{statusLabel}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {statusLabel === 'Active'
            ? 'Payouts are enabled.'
            : statusLabel === 'In Review'
            ? 'Your info is submitted. Stripe may be reviewing it.'
            : statusLabel === 'Setup Required'
            ? 'Complete verification to enable payouts.'
            : 'Click “Setup payouts” to begin.'}
        </p>
      </div>

      {/* Summary row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Available</p>
          <p className="text-2xl font-bold text-white">
            {availableBalance ? formatCurrency(availableBalance.amount, availableBalance.currency) : '$0.00'}
          </p>
          <button
            type="button"
            onClick={() => openBankDetails('balances')}
            className="mt-3 px-3 py-2 border border-zinc-800/70 text-sm text-gray-300 hover:border-zinc-700"
          >
            View next payout
          </button>
        </div>

        <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Pending</p>
          <p className="text-2xl font-bold text-white">
            {pendingBalance ? formatCurrency(pendingBalance.amount, pendingBalance.currency) : '$0.00'}
          </p>
        </div>

        <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Payout mode</p>
          <p className="text-lg font-semibold text-white">{payoutSummary}</p>
          <p className="text-xs text-zinc-500 mt-2">
            Estimated next payout date: <span className="text-zinc-200">{nextPayoutEstimate}</span>
          </p>
          <button
            type="button"
            onClick={openScheduleEditor}
            disabled={!account}
            className="mt-3 px-3 py-2 border border-zinc-800/70 text-sm text-gray-300 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit schedule
          </button>
        </div>
      </section>

      {/* Payout history entry point (button → popup) */}
      <section className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Payout history</h2>
          <p className="text-sm text-zinc-400">
            View past payouts (loads on demand).{' '}
            {hasLoadedPayoutsOnce && payouts.length > 0 ? (
              <span className="text-zinc-500">
                Last payout: {formatPayoutDate(payouts[0]?.created)} • {formatCurrency(payouts[0].amount, payouts[0].currency)}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openPayoutHistory}
            className="px-4 py-2 border border-zinc-800/70 text-sm text-gray-300 hover:border-zinc-700"
          >
            View payout history
          </button>
        </div>
      </section>

      {/* Payout actions + connected banks next to each other */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Actions */}
        <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Payout actions</h2>
              <p className="text-sm text-zinc-400">
                Manual payouts support Standard (no fee) or Instant (fee, if eligible).
              </p>
            </div>
            <button
              type="button"
              onClick={openPayoutNow}
              disabled={!isSetupComplete || !(availableBalance?.amount && availableBalance.amount > 0)}
              className="px-3 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:bg-zinc-700 disabled:cursor-not-allowed"
            >
              Payout now
            </button>
          </div>

          <div className="rounded-sm border border-zinc-800/70 bg-zinc-950 p-4 text-sm text-zinc-400">
            For exact upcoming payout timing + details, open <span className="text-zinc-200">Bank details</span> →{' '}
            <span className="text-zinc-200">Balances</span>.
          </div>
        </div>

        {/* Banks */}
        <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Connected payout banks</h2>
              <p className="text-sm text-zinc-400">
                Payout-capable banks: <span className="text-white font-semibold">{bankAccounts.length}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => openBankDetails('banks')}
              className="px-3 py-2 border border-zinc-800/70 text-sm text-gray-300 hover:border-zinc-700"
            >
              Manage banks
            </button>
          </div>

          {primaryBankAccount ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white font-semibold">
                  {primaryBankAccount.bank_name ?? 'Bank account'}{' '}
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-green-400">Default</span>
                </p>
                <p className="text-xs text-zinc-500">
                  {primaryBankAccount.account_holder_name ? `${primaryBankAccount.account_holder_name} - ` : ''}
                  {primaryBankAccount.last4 ? `**** ${primaryBankAccount.last4}` : 'Account ending unknown'}
                  {primaryBankAccount.currency ? ` - ${primaryBankAccount.currency.toUpperCase()}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={openAccountPicker}
                disabled={!account || bankAccounts.length === 0}
                className="px-3 py-2 border border-zinc-800/70 text-sm text-gray-300 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change default
              </button>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              No payout bank connected yet. Click <span className="text-white">Manage banks</span>.
            </p>
          )}

          {/* Simple list + delete */}
          {bankAccounts.length > 0 ? (
            <div className="rounded-sm border border-zinc-800/70 bg-zinc-950 overflow-hidden">
              <div className="divide-y divide-zinc-800/70">
                {bankAccounts.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="text-white font-semibold">
                        {b.bank_name ?? 'Bank account'}{' '}
                        {b.default_for_currency ? (
                          <span className="ml-2 text-[11px] uppercase tracking-wider text-green-400">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {b.account_holder_name ? `${b.account_holder_name} - ` : ''}
                        {b.last4 ? `**** ${b.last4}` : 'Account ending unknown'}
                        {b.currency ? ` - ${b.currency.toUpperCase()}` : ''}
                        {b.status ? ` - ${b.status}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteBank(b.id)}
                      disabled={!canDeleteBank(b.id) || isDeletingBankId === b.id}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-800/70 text-sm text-gray-300 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        b.default_for_currency && bankAccounts.length === 1
                          ? 'Set another bank as default before deleting.'
                          : 'Remove bank'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeletingBankId === b.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="text-xs text-zinc-500">
            If Stripe shows more “linked external accounts” in the bank-details popup, Stripe may be grouping multiple
            accounts from one institution. The list here is the payout-capable bank accounts returned by the Stripe API.
          </div>
        </div>
      </section>

      {/* Default bank picker */}
      {accountPickerOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-sm border border-zinc-800/70 bg-zinc-950 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Select default payout bank</h2>
                <p className="text-sm text-zinc-400">Stripe will send payouts to this bank.</p>
              </div>
              <button
                type="button"
                onClick={() => setAccountPickerOpen(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {bankAccounts.map((entry) => (
                <label
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-sm border border-zinc-800/70 bg-zinc-900 px-3 py-3 text-sm text-zinc-300 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payoutAccount"
                      className="rdk-checkbox"
                      checked={selectedBankAccountId === entry.id}
                      onChange={() => setSelectedBankAccountId(entry.id)}
                    />
                    <div>
                      <div className="text-white font-semibold">{entry.bank_name ?? 'Bank account'}</div>
                      <div className="text-xs text-zinc-500">
                        {entry.account_holder_name ? `${entry.account_holder_name} - ` : ''}
                        {entry.last4 ? `**** ${entry.last4}` : 'Account ending unknown'}
                        {entry.currency ? ` - ${entry.currency.toUpperCase()}` : ''}
                      </div>
                    </div>
                  </div>
                  {entry.default_for_currency ? (
                    <span className="text-[11px] uppercase tracking-wider text-green-400">Default</span>
                  ) : null}
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAccountPickerOpen(false)}
                className="px-4 py-2 border border-zinc-800/70 text-sm text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePayoutAccount}
                disabled={!selectedBankAccountId || isSavingAccount}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:bg-zinc-700"
              >
                {isSavingAccount ? 'Saving...' : 'Set default'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-sm border border-zinc-800/70 bg-zinc-950 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Payout schedule</h2>
                <p className="text-sm text-zinc-400">Automatic or manual payouts.</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1">Mode</label>
                <select
                  value={scheduleDraft.interval}
                  onChange={(event) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      interval: event.target.value as 'manual' | 'daily' | 'weekly' | 'monthly',
                    }))
                  }
                  className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
                >
                  <option value="manual">Manual</option>
                  <option value="daily">Automatic — Daily</option>
                  <option value="weekly">Automatic — Weekly</option>
                  <option value="monthly">Automatic — Monthly</option>
                </select>
              </div>

              {scheduleDraft.interval === 'weekly' && (
                <div>
                  <label className="block text-gray-400 mb-1">Weekly payout day</label>
                  <select
                    value={scheduleDraft.weekly_anchor}
                    onChange={(event) =>
                      setScheduleDraft((prev) => ({
                        ...prev,
                        weekly_anchor: event.target.value as typeof WEEKLY_ANCHORS[number]['value'],
                      }))
                    }
                    className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
                  >
                    {WEEKLY_ANCHORS.map((anchor) => (
                      <option key={anchor.value} value={anchor.value}>
                        {anchor.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scheduleDraft.interval === 'monthly' && (
                <div>
                  <label className="block text-gray-400 mb-1">Monthly payout day</label>
                  <select
                    value={scheduleDraft.monthly_anchor}
                    onChange={(event) =>
                      setScheduleDraft((prev) => ({
                        ...prev,
                        monthly_anchor: Number(event.target.value),
                      }))
                    }
                    className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
                  >
                    {Array.from({ length: 31 }, (_, idx) => idx + 1).map((day) => (
                      <option key={day} value={day}>
                        Day {day}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-xs text-zinc-500">
                Standard payouts are free. Instant payouts (fee) are available for manual payouts if eligible.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 border border-zinc-800/70 text-sm text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSchedule}
                disabled={isSavingSchedule}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:bg-zinc-700"
              >
                {isSavingSchedule ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Now modal */}
      {payoutNowOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-sm border border-zinc-800/70 bg-zinc-950 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Payout now</h2>
                <p className="text-sm text-zinc-400">Standard (no fee) or Instant (fee, if eligible).</p>
              </div>
              <button
                type="button"
                onClick={() => setPayoutNowOpen(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                Close
              </button>
            </div>

            {payoutError ? (
              <div className="mb-4 rounded-sm border border-red-900/70 bg-zinc-950 p-3 text-sm text-red-400">
                {payoutError}
              </div>
            ) : null}

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1">Amount (cents)</label>
                <input
                  type="number"
                  value={payoutNowAmount}
                  min={0}
                  onChange={(e) => setPayoutNowAmount(Number(e.target.value))}
                  className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
                />
                <div className="text-xs text-zinc-500 mt-1">
                  Available:{' '}
                  {availableBalance ? formatCurrency(availableBalance.amount, availableBalance.currency) : '$0.00'}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Method</label>
                <select
                  value={payoutNowMethod}
                  onChange={(e) => setPayoutNowMethod(e.target.value as 'standard' | 'instant')}
                  className="w-full bg-zinc-900 text-white px-3 py-2 border border-zinc-800/70"
                >
                  <option value="standard">Standard (no fee)</option>
                  <option value="instant">Instant (fee, if eligible)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPayoutNowOpen(false)}
                className="px-4 py-2 border border-zinc-800/70 text-sm text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createPayoutNow}
                disabled={isCreatingPayout || payoutNowAmount <= 0}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 disabled:bg-zinc-700"
              >
                {isCreatingPayout ? 'Creating…' : 'Create payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        tone={toast?.tone ?? 'info'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
