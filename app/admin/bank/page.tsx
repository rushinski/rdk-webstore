// app/admin/bank/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { logError } from '@/lib/log';
import { Loader2, AlertCircle } from 'lucide-react';
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

  // Get publishable key from env (will be added to env.ts)
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bank</h1>
          <p className="text-gray-400">Manage your payouts and banking information</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="ml-3 text-gray-400">Loading account details...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bank</h1>
          <p className="text-gray-400">Manage your payouts and banking information</p>
        </div>
        <div className="bg-red-900/20 border border-red-800 rounded p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-red-400">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Bank & Payouts</h1>
        <p className="text-gray-400">Manage your payouts and banking information</p>
      </div>

      {/* Quick Status Overview */}
      {account && (
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-800/50 p-4 rounded">
              <p className="text-sm text-gray-400 mb-1">Account Status</p>
              <p className="text-lg font-semibold text-white">
                {account.details_submitted && account.payouts_enabled
                  ? '✓ Active'
                  : '⚠ Setup Required'}
              </p>
            </div>
            {balance && (
              <>
                <div className="bg-zinc-800/50 p-4 rounded">
                  <p className="text-sm text-gray-400 mb-1">Available for Payout</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(
                      balance.available[0]?.amount ?? 0,
                      balance.available[0]?.currency ?? 'usd'
                    )}
                  </p>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded">
                  <p className="text-sm text-gray-400 mb-1">Pending</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(
                      balance.pending[0]?.amount ?? 0,
                      balance.pending[0]?.currency ?? 'usd'
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fee Information */}
      <div className="bg-yellow-900/10 border border-yellow-800/50 rounded p-4">
        <h3 className="text-sm font-semibold text-yellow-300 mb-2">💳 Processing Fees</h3>
        <p className="text-sm text-gray-300">
          Stripe processing fees (credit card processing, ACH, etc.) are automatically deducted from your payouts. These fees are paid by you, the seller, not the platform. When refunds occur, Stripe processing fees are generally not returned.
        </p>
      </div>

      {/* Embedded Components */}
      {publishableKey ? (
        <EmbeddedAccount publishableKey={publishableKey} />
      ) : (
        <div className="bg-red-900/20 border border-red-800 rounded p-6">
          <p className="text-red-400">
            Stripe publishable key is not configured. Please contact support.
          </p>
        </div>
      )}
    </div>
  );
}