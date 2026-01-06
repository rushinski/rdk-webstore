// app/admin/settings/transfers/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { logError } from '@/lib/log';
import { Toast } from '@/components/ui/Toast';
import { BankAccountManagementModal } from '@/components/admin/stripe/BankAccountManagementModal';

type PayoutSchedule = {
  interval?: string | null;
  weekly_anchor?: string | null;
  monthly_anchor?: number | null;
};

type BankAccount = {
  id: string;
  bank_name: string | null;
  last4: string | null;
  currency: string | null;
  account_holder_name: string | null;
  default_for_currency: boolean;
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

export default function TransferSettingsPage() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const [bankModalOpen, setBankModalOpen] = useState(false);

  const [scheduleForm, setScheduleForm] = useState<{
    interval: 'manual' | 'daily' | 'weekly' | 'monthly';
    weekly_anchor: typeof WEEKLY_ANCHORS[number]['value'];
    monthly_anchor: number;
  }>({ interval: 'daily', weekly_anchor: 'monday', monthly_anchor: 1 });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/stripe/account', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch account data');
      const data = await response.json();

      setPayoutSchedule(data.payout_schedule ?? null);
      setBankAccounts(data.bank_accounts ?? []);

      const interval = data.payout_schedule?.interval || 'daily';
      const validInterval = ['manual', 'daily', 'weekly', 'monthly'].includes(interval) ? interval : 'daily';
      const weeklyAnchor =
        WEEKLY_ANCHORS.find(a => a.value === data.payout_schedule?.weekly_anchor)?.value ?? 'monday';
      const monthlyAnchor = data.payout_schedule?.monthly_anchor ?? 1;

      setScheduleForm({
        interval: validInterval as any,
        weekly_anchor: weeklyAnchor,
        monthly_anchor: monthlyAnchor,
      });

      setErrorMessage('');
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'fetch_transfer_settings' });
      setErrorMessage('Could not load transfer settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/stripe/payout-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Failed to update schedule');
      }

      const data = await response.json();
      setPayoutSchedule(data.schedule ?? scheduleForm);
      setToast({ message: 'Transfer settings saved successfully', tone: 'success' });
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'save_payout_schedule' });
      setToast({ message: 'Failed to save transfer settings', tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const primaryBank = useMemo(() => {
    return bankAccounts.find(b => b.default_for_currency) ?? bankAccounts[0] ?? null;
  }, [bankAccounts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Transfer Settings</h1>
            <p className="text-zinc-400 text-sm mt-1">Configure your payout preferences</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-red-500" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Transfer Settings</h1>
          </div>
        </div>
        <div className="rounded-sm bg-zinc-900 border border-red-900/70 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-400 text-sm">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Transfer Settings</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure your payout preferences</p>
        </div>
      </div>

      {/* Payout Mode */}
      <section className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Payout Mode</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Choose between automatic scheduled payouts or manual payouts when you need them.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Mode</label>
            <select
              value={scheduleForm.interval}
              onChange={(e) =>
                setScheduleForm(prev => ({
                  ...prev,
                  interval: e.target.value as any,
                }))
              }
              className="w-full max-w-md bg-zinc-950 text-white px-4 py-2.5 border border-zinc-800/70 rounded-sm focus:outline-none focus:border-zinc-700"
            >
              <option value="manual">Manual - Payout when I choose</option>
              <option value="daily">Automatic - Every day</option>
              <option value="weekly">Automatic - Once per week</option>
              <option value="monthly">Automatic - Once per month</option>
            </select>
          </div>

          {scheduleForm.interval === 'weekly' && (
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Day of week</label>
              <select
                value={scheduleForm.weekly_anchor}
                onChange={(e) =>
                  setScheduleForm(prev => ({
                    ...prev,
                    weekly_anchor: e.target.value as any,
                  }))
                }
                className="w-full max-w-md bg-zinc-950 text-white px-4 py-2.5 border border-zinc-800/70 rounded-sm focus:outline-none focus:border-zinc-700"
              >
                {WEEKLY_ANCHORS.map(anchor => (
                  <option key={anchor.value} value={anchor.value}>
                    {anchor.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scheduleForm.interval === 'monthly' && (
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Day of month</label>
              <select
                value={scheduleForm.monthly_anchor}
                onChange={(e) =>
                  setScheduleForm(prev => ({
                    ...prev,
                    monthly_anchor: Number(e.target.value),
                  }))
                }
                className="w-full max-w-md bg-zinc-950 text-white px-4 py-2.5 border border-zinc-800/70 rounded-sm focus:outline-none focus:border-zinc-700"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scheduleForm.interval === 'manual' ? (
            <div className="rounded-sm bg-zinc-950 border border-zinc-800/70 p-4 text-sm text-zinc-400">
              Manual mode is enabled. Create payouts from the <span className="text-zinc-200">Bank</span> page.
            </div>
          ) : null}

          <div className="pt-4">
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Linked Bank Account */}
      <section className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Linked Bank Account</h2>
            <p className="text-sm text-zinc-400">Your payouts will be sent to this bank account.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!publishableKey) {
                setToast({
                  message: 'Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.',
                  tone: 'error',
                });
                return;
              }
              setBankModalOpen(true);
            }}
            className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-500 whitespace-nowrap"
          >
            Manage bank accounts
          </button>
        </div>

        <div className="mt-6">
          {primaryBank ? (
            <div className="rounded-sm bg-zinc-950 border border-zinc-800/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-white font-medium text-lg">
                      {primaryBank.bank_name ?? 'Bank Account'}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 rounded-sm">
                      Default
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    {primaryBank.account_holder_name && (
                      <p className="text-zinc-400">
                        <span className="text-zinc-500">Account holder:</span> {primaryBank.account_holder_name}
                      </p>
                    )}
                    {primaryBank.last4 && (
                      <p className="text-zinc-400">
                        <span className="text-zinc-500">Account ending:</span> •••• {primaryBank.last4}
                      </p>
                    )}
                    {primaryBank.currency && (
                      <p className="text-zinc-400">
                        <span className="text-zinc-500">Currency:</span> {primaryBank.currency.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-sm bg-zinc-950 border border-zinc-800/70 p-6 text-center">
              <p className="text-zinc-400 text-sm mb-2">No bank account connected yet.</p>
              <p className="text-zinc-600 text-xs">Click “Manage bank accounts” to add one.</p>
            </div>
          )}

          <div className="mt-4 p-4 rounded-sm bg-zinc-950 border border-zinc-800/70">
            <p className="text-xs text-zinc-500">
              <strong className="text-zinc-400">Note:</strong> Bank account management is handled through embedded Stripe tools.
              Your app never receives bank account numbers.
            </p>
          </div>
        </div>
      </section>

      <BankAccountManagementModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        publishableKey={publishableKey}
        onUpdated={fetchData}
      />

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        tone={toast?.tone ?? 'info'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
