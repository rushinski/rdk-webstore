// app/admin/bank/transfers/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { logError } from "@/lib/log";

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

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp?: number | null) {
  if (!timestamp) {
    return "-";
  }
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timestamp?: number | null) {
  if (!timestamp) {
    return "";
  }
  return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "paid":
      return "bg-green-500/10 border-green-500/20 text-green-400";
    case "pending":
    case "in_transit":
      return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
    case "failed":
    case "canceled":
      return "bg-red-500/10 border-red-500/20 text-red-400";
    default:
      return "bg-zinc-500/10 border-zinc-500/20 text-zinc-400";
  }
}

export default function ViewTransfersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [payouts, setPayouts] = useState<StripePayout[]>([]);

  const fetchPayouts = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch("/api/admin/stripe/payouts?limit=50", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch payouts");
      }
      const data = await response.json();
      setPayouts(data.payouts ?? []);
      setErrorMessage("");
    } catch (error) {
      logError(error, { layer: "frontend", event: "fetch_all_payouts" });
      setErrorMessage("Could not load transfer history.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">All Transfers</h1>
            <p className="text-zinc-400 text-sm mt-1">Complete payout history</p>
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
            <h1 className="text-3xl font-bold text-white">All Transfers</h1>
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">All Transfers</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {payouts.length > 0 ? `${payouts.length} transfers` : "No transfers yet"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void fetchPayouts(true);
          }}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-800/70 text-sm text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Transfers List */}
      {payouts.length === 0 ? (
        <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 p-12 text-center">
          <p className="text-zinc-400 text-sm">No transfers yet</p>
          <p className="text-zinc-600 text-xs mt-2">
            Transfers will appear here once you receive your first payout
          </p>
        </div>
      ) : (
        <div className="rounded-sm bg-zinc-900 border border-zinc-800/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800/70">
                  <th className="text-left text-xs uppercase tracking-wider text-zinc-400 font-semibold px-6 py-4">
                    Date Created
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-zinc-400 font-semibold px-6 py-4">
                    Arrival Date
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-zinc-400 font-semibold px-6 py-4">
                    Method
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-zinc-400 font-semibold px-6 py-4">
                    Status
                  </th>
                  <th className="text-right text-xs uppercase tracking-wider text-zinc-400 font-semibold px-6 py-4">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-zinc-950/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white text-sm">
                        {formatDate(payout.created)}
                      </div>
                      <div className="text-zinc-500 text-xs mt-0.5">
                        {formatTime(payout.created)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-300 text-sm">
                        {formatDate(payout.arrival_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-300 text-sm capitalize">
                        {payout.method || "Standard"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-medium border rounded-sm capitalize ${getStatusStyle(payout.status)}`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-white font-medium">
                        {formatCurrency(payout.amount, payout.currency)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-sm bg-zinc-950 border border-zinc-800/70 p-4">
        <p className="text-xs text-zinc-500">
          <strong className="text-zinc-400">Note:</strong> Standard payouts typically
          arrive in 2-3 business days and are free. Instant payouts (if available) arrive
          within 30 minutes but may include a fee.
        </p>
      </div>
    </div>
  );
}
