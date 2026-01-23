// src/components/admin/stripe/BankAccountManagementModal.tsx
"use client";

import { X } from "lucide-react";

import { EmbeddedAccount } from "@/components/admin/stripe/EmbeddedAccount";
import { ModalPortal } from "@/components/ui/ModalPortal";

type Props = {
  open: boolean;
  onClose: () => void;
  publishableKey: string;
  onUpdated?: () => Promise<void> | void;
};

export function BankAccountManagementModal({
  open,
  onClose,
  publishableKey,
  onUpdated,
}: Props) {
  if (!open) {
    return null;
  }

  const done = async () => {
    try {
      await onUpdated?.();
    } finally {
      onClose();
    }
  };

  return (
    <ModalPortal open={open} onClose={onClose} zIndexClassName="z-[9999]">
      <div className="w-[100vw] max-w-[100vw] h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:max-w-4xl bg-zinc-950 border border-zinc-800 sm:rounded-sm shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              Manage bank accounts
            </h2>
            <p className="hidden sm:block text-[12px] sm:text-sm text-zinc-400 mt-1">
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

        <div className="pl-2 pr-4 sm:px-6 py-3 sm:py-6 overflow-y-auto overflow-x-hidden flex-1 modal-scroll">
          <div className="stripe-connect-embed min-h-[calc(100dvh-160px)] sm:min-h-0">
            <EmbeddedAccount
              publishableKey={publishableKey}
              showOnboarding={false}
              showAccountManagement={true}
              showBalances={false}
              showPayouts={false}
              showAccountId={false}
              variant="plain"
            />
          </div>

          <div className="mt-4 sm:mt-6 flex justify-end">
            <button
              type="button"
              onClick={done}
              className="px-4 sm:px-6 py-2 bg-green-600 text-white text-[12px] sm:text-sm font-medium hover:bg-green-500 rounded-sm"
            >
              Done
            </button>
          </div>

          <div className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-zinc-500 hidden sm:block">
            Bank details are collected and stored by Stripe. Your app never receives
            account numbers.
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
