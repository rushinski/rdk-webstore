// app/admin/bank/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { logError } from '@/lib/log';
import { Loader2, AlertCircle, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import { EmbeddedAccount } from '@/components/admin/stripe/EmbeddedAccount';

type StripeAccount = {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  email: string;
};

type StripeBalance = {
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function BankPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [balance, setBalance] = useState<StripeBalance | null>(null);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  useEffect(() => {
    const fetchAccountStatus = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/stripe/account');
        if (!response.ok) {
          throw new Error('Failed to fetch account status');
        }
        const data = await response.json();
        setAccount(data.account);
        setBalance(data.balance);
      } catch (error) {
        logError(error, { layer: 'frontend', event: 'fetch_stripe_account_status' });
        setErrorMessage('Could not load your banking information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountStatus();
  }, []);

  const isSetupComplete = account?.details_submitted && account?.payouts_enabled;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Bank & Payouts</h1>
          <p className="text-zinc-400 text-sm">Manage your payouts and banking information</p>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-black border border-zinc-800 p-6">
              <div className="h-4 w-24 bg-zinc-900 mb-3" />
              <div className="h-8 w-32 bg-zinc-900" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
          <span className="ml-3 text-zinc-400 text-sm">Loading account details...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Bank & Payouts</h1>
          <p className="text-zinc-400 text-sm">Manage your payouts and banking information</p>
        </div>
        <div className="bg-black border border-red-900 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-400 text-sm">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Bank & Payouts</h1>
        <p className="text-zinc-400 text-sm">Manage your payouts and banking information</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Account Status */}
        <div className="bg-black border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Account Status</p>
          </div>
          <p className="text-xl font-bold text-white">
            {isSetupComplete ? (
              <span className="text-green-500">● Active</span>
            ) : account ? (
              <span className="text-yellow-500">● Setup Required</span>
            ) : (
              <span className="text-zinc-500">● Not Connected</span>
            )}
          </p>
        </div>

        {/* Available Balance */}
        <div className="bg-black border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-zinc-400" />
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Available</p>
          </div>
          <p className="text-xl font-bold text-white">
            {balance?.available[0]
              ? formatCurrency(balance.available[0].amount, balance.available[0].currency)
              : '$0.00'}
          </p>
        </div>

        {/* Pending Balance */}
        <div className="bg-black border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Pending</p>
          </div>
          <p className="text-xl font-bold text-white">
            {balance?.pending[0]
              ? formatCurrency(balance.pending[0].amount, balance.pending[0].currency)
              : '$0.00'}
          </p>
        </div>
      </div>

      {/* Payout Schedule Info */}
      {isSetupComplete && (
        <div className="bg-zinc-950 border border-zinc-800 p-4">
          <div className="flex items-start gap-3">
            <div className="text-zinc-400 text-xs mt-0.5">ⓘ</div>
            <div className="flex-1">
              <p className="text-xs text-zinc-300 font-medium mb-1">Automatic Payouts Enabled</p>
              <p className="text-xs text-zinc-500">
                Funds are automatically transferred to your bank account daily. Standard payouts (free) typically arrive within 2-5 business days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Fees Notice */}
      <div className="bg-black border border-zinc-800 p-4">
        <div className="flex items-start gap-3">
          <div className="text-zinc-400 text-xs mt-0.5">💳</div>
          <div className="flex-1">
            <p className="text-xs text-zinc-300 font-medium mb-2">Processing Fees</p>
            <div className="space-y-1 text-xs text-zinc-500">
              <p>• Stripe processing fees are deducted from each transaction</p>
              <p>• Standard payouts are free (2-5 business days)</p>
              <p>• Instant payouts incur a 1.5% fee (disabled by default)</p>
              <p>• Processing fees are not refunded when issuing refunds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Components */}
      {publishableKey ? (
        <EmbeddedAccount publishableKey={publishableKey} />
      ) : (
        <div className="bg-black border border-red-900 p-6">
          <p className="text-red-400 text-sm">
            Stripe publishable key is not configured. Contact support.
          </p>
        </div>
      )}
    </div>
  );
}