// app/admin/bank/page.tsx (UPDATED WITH REQUIREMENTS HANDLING)
"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  Calendar,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

import { logError } from "@/lib/log";
import { StripeOnboardingModal } from "@/components/admin/stripe/StripeOnboardingModal";
import { BankAccountManagementModal } from "@/components/admin/stripe/BankAccountManagementModal";
import { PayoutsModal } from "@/components/admin/stripe/PayoutsModal";
import { Toast } from "@/components/ui/Toast";

type AccountSummary = {
  account: {
    id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    email: string | null;
  } | null;
  balance: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  } | null;
  payout_schedule: {
    interval: string;
    weekly_anchor?: string;
    monthly_anchor?: number;
  } | null;
  bank_accounts: Array<{
    id: string;
    bank_name: string | null;
    last4: string | null;
    currency: string | null;
    status: string | null;
    default_for_currency: boolean;
    account_holder_name: string | null;
  }>;
  upcoming_payout: {
    amount: number;
    currency: string;
    arrival_date: number | null;
  } | null;

  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
    pending_verification?: string[];
    disabled_reason?: string | null;
    errors?: Array<{
      code: string;
      reason: string;
      requirement: string;
    }>;
  } | null;
};

export default function BankPage() {
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showPayoutsModal, setShowPayoutsModal] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

  useEffect(() => {
    loadSummary();
  }, [refreshKey]);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/stripe/account");
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      logError(error, { layer: "frontend", event: "bank_load_summary" });
      setToast({ message: "Failed to load account details", tone: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleOnboardingComplete = () => {
    refresh();
    setToast({ message: "Verification completed", tone: "success" });
  };

  const handleBankUpdated = () => {
    refresh();
    setToast({ message: "Bank accounts updated", tone: "success" });
  };

  const requirements = summary?.requirements ?? null;
  const currentlyDue = requirements?.currently_due ?? [];
  const pastDue = requirements?.past_due ?? [];
  const pendingVerification = requirements?.pending_verification ?? [];
  const disabledReason = requirements?.disabled_reason ?? null;

  const hasAccount = Boolean(summary?.account?.id);
  const needsOnboarding = hasAccount && !summary?.account?.details_submitted;
  const payoutsEnabled = summary?.account?.payouts_enabled ?? false;
  const defaultBank =
    summary?.bank_accounts?.find((b) => b.default_for_currency) ??
    summary?.bank_accounts?.[0];

  const hasCurrentlyDue = currentlyDue.length > 0;
  const hasPastDue = pastDue.length > 0;
  const hasPendingVerification = pendingVerification.length > 0;
  const hasAnyRequirements = hasCurrentlyDue || hasPastDue || hasPendingVerification;

  const availableBalance =
    summary?.balance?.available?.find((b) => b.currency === "usd")?.amount ?? 0;
  const pendingBalance =
    summary?.balance?.pending?.find((b) => b.currency === "usd")?.amount ?? 0;
  const upcomingPayout = summary?.upcoming_payout;

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const compactNumber = useState(
    () =>
      new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }),
  )[0];
  const formatCompactAmount = (cents: number) => `$${compactNumber.format(cents / 100)}`;

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) {
      return "TBD";
    }
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getScheduleText = () => {
    if (!summary?.payout_schedule) {
      return "Not configured";
    }
    const {
      interval,
      weekly_anchor: weeklyAnchor,
      monthly_anchor: monthlyAnchor,
    } = summary.payout_schedule;
    if (interval === "daily") {
      return "Daily";
    }
    if (interval === "weekly") {
      return `Weekly on ${weeklyAnchor ?? "Monday"}`;
    }
    if (interval === "monthly") {
      return `Monthly on day ${monthlyAnchor ?? 1}`;
    }
    return interval;
  };

  // Format requirement names for display
  const formatRequirement = (req: string) => {
    return (
      req
        .split(".")
        .pop()
        ?.replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()) || req
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bank</h1>
          <p className="text-gray-400">Manage payouts and bank accounts</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Show "Complete Verification" if there are requirements OR initial onboarding needed */}
          {needsOnboarding || hasAnyRequirements ? (
            <button
              type="button"
              onClick={() => setShowOnboarding(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-sm text-sm transition"
            >
              {hasPastDue ? "Complete urgent verification" : "Complete verification"}
            </button>
          ) : payoutsEnabled ? (
            <button
              type="button"
              onClick={() => setShowBankModal(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-sm text-sm border border-zinc-800/70 transition"
            >
              Manage bank accounts
            </button>
          ) : null}

          {!hasAccount && (
            <button
              type="button"
              onClick={() => setShowOnboarding(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-sm text-sm transition"
            >
              Enable payouts
            </button>
          )}
        </div>
      </div>

      {/* Critical Requirements Alert (Past Due) */}
      {hasPastDue && (
        <div className="bg-red-950/30 border border-red-900/70 rounded p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-400 mb-2">
                Urgent: Action Required
              </h3>
              <p className="text-sm text-red-300 mb-3">
                Your account has overdue verification requirements. Complete these
                immediately to restore full functionality.
              </p>
              <ul className="space-y-1">
                {pastDue.map((req) => (
                  <li key={req} className="text-sm text-red-200">
                    • {formatRequirement(req)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Pending Verification Alert */}
      {hasPendingVerification && !hasPastDue && (
        <div className="bg-blue-950/20 border border-blue-900/70 rounded p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">
                Verification In Progress
              </h3>
              <p className="text-sm text-blue-300">
                We're reviewing your submitted information. This typically takes 1-2
                business days.
              </p>

              {pendingVerification.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {pendingVerification.map((req) => (
                    <li key={req} className="text-sm text-blue-200">
                      • {formatRequirement(req)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Currently Due Requirements Alert */}
      {hasCurrentlyDue && !hasPastDue && (
        <div className="bg-yellow-950/20 border border-yellow-900/70 rounded p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2">
                Verification Required
              </h3>
              <p className="text-sm text-yellow-300 mb-3">
                Complete the following to enable full payout functionality:
              </p>
              <ul className="space-y-1">
                {currentlyDue.map((req) => (
                  <li key={req} className="text-sm text-yellow-200">
                    • {formatRequirement(req)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Disabled Reason Alert */}
      {disabledReason && (
        <div className="bg-red-950/30 border border-red-900/70 rounded p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-400 mb-2">
                Account Restricted
              </h3>
              <p className="text-sm text-red-300">
                Reason: {disabledReason.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generic Payouts Disabled Alert (when no specific requirements shown) */}
      {!payoutsEnabled && hasAccount && !needsOnboarding && !hasAnyRequirements && (
        <div className="bg-yellow-950/20 border border-yellow-900/70 rounded p-4">
          <p className="text-sm text-yellow-400">
            Payouts are currently disabled. Please contact support or complete additional
            verification.
          </p>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            <span className="text-gray-400 text-[11px] sm:text-sm">Available</span>
          </div>
          <div className="text-base sm:text-3xl font-bold text-white">
            <span className="sm:hidden">{formatCompactAmount(availableBalance)}</span>
            <span className="hidden sm:inline">{formatAmount(availableBalance)}</span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
            Ready for payout
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span className="text-gray-400 text-[11px] sm:text-sm">Pending</span>
          </div>
          <div className="text-base sm:text-3xl font-bold text-white">
            <span className="sm:hidden">{formatCompactAmount(pendingBalance)}</span>
            <span className="hidden sm:inline">{formatAmount(pendingBalance)}</span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">Processing</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            <span className="text-gray-400 text-[11px] sm:text-sm">Upcoming</span>
          </div>
          {upcomingPayout ? (
            <>
              <div className="text-base sm:text-3xl font-bold text-white">
                <span className="sm:hidden">
                  {formatCompactAmount(upcomingPayout.amount)}
                </span>
                <span className="hidden sm:inline">
                  {formatAmount(upcomingPayout.amount)}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
                {formatDate(upcomingPayout.arrival_date)}
              </p>
            </>
          ) : (
            <>
              <div className="text-base sm:text-3xl font-bold text-gray-600">
                <span className="sm:hidden">$0</span>
                <span className="hidden sm:inline">$0.00</span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
                No payout
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {/* Payout Schedule */}
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Payout Schedule
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[12px] sm:text-base">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 whitespace-nowrap">{getScheduleText()}</span>
          </div>
        </div>

        {/* Bank Account */}
        {defaultBank && (
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 sm:p-6">
            <h2 className="text-[12px] sm:text-lg font-semibold text-white mb-3 sm:mb-4">
              Default Payout Account
            </h2>
            <div className="flex items-center gap-3 sm:gap-4">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <div className="min-w-0">
                <div className="text-[12px] sm:text-base text-white font-medium break-words">
                  {defaultBank.bank_name ?? "Bank Account"} ••••{defaultBank.last4}
                </div>
                {defaultBank.account_holder_name && (
                  <div className="text-[11px] sm:text-sm text-gray-400 break-words">
                    {defaultBank.account_holder_name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Payout History
          </h2>
          <button
            type="button"
            onClick={() => setShowPayoutsModal(true)}
            className="text-[11px] sm:text-sm text-red-400 hover:text-red-300 inline-flex items-center gap-1 whitespace-nowrap"
          >
            View payout history
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <StripeOnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        onCompleted={handleOnboardingComplete}
      />

      <BankAccountManagementModal
        open={showBankModal}
        onClose={() => setShowBankModal(false)}
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        onUpdated={handleBankUpdated}
      />

      <PayoutsModal open={showPayoutsModal} onClose={() => setShowPayoutsModal(false)} />

      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ""}
        tone={toast?.tone ?? "info"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
