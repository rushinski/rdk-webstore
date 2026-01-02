// app/admin/bank/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { logError } from '@/lib/log';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [balance, setBalance] = useState<StripeBalance | null>(null);

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

  const handleConnectStripe = async () => {
    setIsConnecting(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/stripe/connect', {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage(data.error || 'Could not connect to Stripe. Please try again.');
        setIsConnecting(false);
      }
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'stripe_connect_onboarding_failed' });
      setErrorMessage('An unexpected error occurred. Please try again.');
      setIsConnecting(false);
    }
  };

  const renderStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading account details...</span>
        </div>
      );
    }

    if (errorMessage) {
      return <p className="text-red-500 text-sm">{errorMessage}</p>;
    }

    if (!account) {
      return (
        <>
          <p className="text-gray-400 mb-4">
            Connect your bank account via Stripe to receive payouts for your sales.
          </p>
          <button
            onClick={handleConnectStripe}
            disabled={isConnecting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
          >
            {isConnecting ? 'Connecting...' : 'Connect with Stripe'}
          </button>
        </>
      );
    }

    const isOnboardingComplete = account.details_submitted && account.payouts_enabled;

    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          {isOnboardingComplete ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          )}
          <h3 className="text-lg font-semibold text-white">
            {isOnboardingComplete ? 'Account Connected' : 'Onboarding Incomplete'}
          </h3>
        </div>
        <p className="text-gray-400 mb-2">
          <span className="font-medium text-gray-300">Stripe Account ID:</span> {account.id}
        </p>
        <p className="text-gray-400 mb-4">
          <span className="font-medium text-gray-300">Status:</span>{' '}
          {account.payouts_enabled ? 'Payouts Active' : 'Payouts Inactive'} |{' '}
          {account.charges_enabled ? 'Charges Active' : 'Charges Inactive'}
        </p>

        {balance && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800/50 p-4 rounded">
              <p className="text-sm text-gray-400 mb-1">Available for Payout</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(balance.available[0]?.amount ?? 0, balance.available[0]?.currency ?? 'usd')}
              </p>
            </div>
            <div className="bg-zinc-800/50 p-4 rounded">
              <p className="text-sm text-gray-400 mb-1">Pending</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(balance.pending[0]?.amount ?? 0, balance.pending[0]?.currency ?? 'usd')}
              </p>
            </div>
          </div>
        )}

        {!isOnboardingComplete && (
          <div>
            <p className="text-yellow-400 mb-4 text-sm">
              Please complete your Stripe onboarding to enable payouts.
            </p>
            <button
              onClick={handleConnectStripe}
              disabled={isConnecting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded transition"
            >
              {isConnecting ? 'Connecting...' : 'Continue Onboarding'}
            </button>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Bank</h1>
        <p className="text-gray-400">Manage your payouts and banking information</p>
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Payouts Dashboard</h2>
          {renderStatus()}
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Payout History</h2>
          <p className="text-gray-400 mb-4">
            Your payout history will be displayed here.
          </p>
          <div className="text-gray-500 italic">No payouts yet.</div>
        </div>
      </div>
    </div>
  );
}
