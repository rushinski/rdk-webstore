// app/order-status/[orderId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { OrderStatusResponse } from "@/types/views/checkout";
import { OrderStatusView } from "@/components/orders/OrderStatusView";

export default function OrderStatusPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const orderId = params?.orderId;

  const [status, setStatus] = useState<OrderStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    if (!token) {
      setError("Missing secure order link. Please check your email.");
      return;
    }

    const loadStatus = async () => {
      try {
        const response = await fetch(
          `/api/orders/${orderId}?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Unable to load order status.");
        }
        setStatus(data);
      } catch (err: any) {
        setError(err?.message ?? "Unable to load order status.");
      }
    };

    loadStatus();
  }, [orderId, token]);

  if (!orderId) {
    return null;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-6 rounded">
          <p className="text-lg font-semibold mb-2">Order status unavailable</p>
          <p>{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-16 h-16 text-red-600 mx-auto animate-spin" />
      </div>
    );
  }

  return <OrderStatusView status={status} />;
}
