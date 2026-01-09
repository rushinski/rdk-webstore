// src/components/orders/OrderStatusView.tsx
"use client";

import type { OrderStatusResponse } from "@/types/views/checkout";

const formatEventType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function OrderStatusView({ status }: { status: OrderStatusResponse }) {
  const instructions = status.pickupInstructions
    ? status.pickupInstructions.split("\n").filter(Boolean)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Order status</h1>
        <p className="text-gray-400">Order ID: {status.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Status</h2>
            <div className="flex items-center justify-between text-gray-400">
              <span>Current</span>
              <span className="text-white font-semibold capitalize">{status.status}</span>
            </div>
            <div className="mt-4 space-y-3">
              {status.events.length === 0 ? (
                <p className="text-sm text-zinc-500">Timeline updates will appear here.</p>
              ) : (
                status.events.map((event) => (
                  <div
                    key={`${event.type}-${event.createdAt}`}
                    className="border border-zinc-800/70 rounded p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white">
                        {formatEventType(event.type)}
                      </span>
                      <span className="text-xs text-zinc-500">{formatDate(event.createdAt)}</span>
                    </div>
                    {event.message && (
                      <p className="text-sm text-zinc-400">{event.message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {status.fulfillment === "pickup" && instructions.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
              <h2 className="text-xl font-semibold text-white mb-3">Pickup instructions</h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                {instructions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Need help?</h2>
            <p className="text-sm text-zinc-400 mb-3">
              Email us at{" "}
              <a className="text-red-400 hover:text-red-300" href={`mailto:${status.supportEmail}`}>
                {status.supportEmail}
              </a>{" "}
              for order questions or scheduling pickup.
            </p>
            <p className="text-xs text-zinc-500">
              Prefer socials? DM us on{" "}
              <a
                href="https://instagram.com/realdealkickzllc"
                className="text-red-400 hover:text-red-300"
                target="_blank"
                rel="noreferrer"
              >
                Instagram @realdealkickzllc
              </a>
              .
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 h-fit">
          <h2 className="text-lg font-semibold text-white mb-4">Order summary</h2>
          <div className="space-y-2 text-sm text-zinc-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${status.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>
                {status.fulfillment === "pickup"
                  ? "Free (Pickup)"
                  : `$${status.shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="border-t border-zinc-800/70 pt-2 mt-2">
              <div className="flex justify-between text-white font-semibold">
                <span>Total</span>
                <span>${status.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
