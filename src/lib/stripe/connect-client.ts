// src/lib/stripe/connect-client.ts
"use client";

import { loadConnectAndInitialize } from "@stripe/connect-js";

type InitStripeConnectParams = {
  publishableKey: string;
  clientSecret: string;
  // connect-js version you're on doesn't export Appearance, so avoid `any`
  // Keep it flexible but typed.
  appearance?: Record<string, unknown>;
};

export function initStripeConnect(params: InitStripeConnectParams) {
  if (typeof window === "undefined") {
    throw new Error("initStripeConnect must be called on the client side");
  }

  const { publishableKey, clientSecret, appearance } = params;

  if (!publishableKey) {
    throw new Error("Missing Stripe publishable key");
  }
  if (!clientSecret) {
    throw new Error("Missing Stripe account session client secret");
  }

  return loadConnectAndInitialize({
    publishableKey,
    // types require Promise<string>
    fetchClientSecret: () => Promise.resolve(clientSecret),
    appearance,
  });
}
