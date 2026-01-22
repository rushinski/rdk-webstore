// src/components/admin/stripe/PayoutsModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { logError } from '@/lib/log';

type Payout = {
  id: string;
  amount: number;
  currency: string;
  arrival_date: number | null;
  status: string;
  method: string | null;
  type: string | null;
  created: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PayoutsModal({ open, onClose }: Props) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPayouts();
    }
  }, [open]);

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/stripe/payouts?limit=50');
      const data = await response.json();
      setPayouts(data.payouts || []);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'load_payouts' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Pending';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'in_transit':
        return 'text-blue-400';
      case 'canceled':
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-sm shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-semibold text-white">Payout History</h2>
              <p className="text-sm text-zinc-400 mt-1">
                View all past and upcoming payouts
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
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                <span className="ml-3 text-zinc-400">Loading payouts...</span>
              </div>
            ) : payouts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No payouts found</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800/70 bg-zinc-800">
                      <th className="text-left text-gray-400 font-semibold p-4">Date</th>
                      <th className="text-left text-gray-400 font-semibold p-4">Amount</th>
                      <th className="text-left text-gray-400 font-semibold p-4">Status</th>
                      <th className="text-left text-gray-400 font-semibold p-4">Arrival Date</th>
                      <th className="text-left text-gray-400 font-semibold p-4">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-zinc-800/70 hover:bg-zinc-800">
                        <td className="p-4 text-gray-400">
                          {formatDate(payout.created)}
                        </td>
                        <td className="p-4 text-white font-medium">
                          {formatAmount(payout.amount)}
                        </td>
                        <td className="p-4">
                          <span className={`${getStatusColor(payout.status)} capitalize`}>
                            {getStatusLabel(payout.status)}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400">
                          {formatDate(payout.arrival_date)}
                        </td>
                        <td className="p-4 text-gray-400 capitalize">
                          {payout.method || 'Standard'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {payouts.length} most recent payouts
              </p>
              <a
                href="https://dashboard.stripe.com/payouts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-red-400 hover:text-red-300 inline-flex items-center gap-1"
              >
                View in Stripe Dashboard
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}