// src/components/admin/stripe/BankAccountManagementModal.tsx
'use client';

import { X } from 'lucide-react';
import { EmbeddedAccount } from '@/components/admin/stripe/EmbeddedAccount';

type Props = {
  open: boolean;
  onClose: () => void;
  publishableKey: string;
  onUpdated?: () => Promise<void> | void;
};

export function BankAccountManagementModal({ open, onClose, publishableKey, onUpdated }: Props) {
  if (!open) return null;

  const done = async () => {
    try {
      await onUpdated?.();
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-sm shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-semibold text-white">Manage bank accounts</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Add, remove, or set your default payout account (powered by Stripe).
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

          <div className="px-6 py-6 overflow-y-auto">
            <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-6">
              <EmbeddedAccount
                publishableKey={publishableKey}
                showOnboarding={false}
                showAccountManagement={true}
                showBalances={false}
                showPayouts={false}
                showAccountId={false}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={done}
                className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium hover:bg-green-500 rounded-sm"
              >
                Done
              </button>
            </div>

            <div className="mt-4 text-xs text-zinc-500">
              Bank details are collected and stored by Stripe. Your app never receives account numbers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
