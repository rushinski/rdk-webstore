// src/lib/stripe/connect-client.ts
"use client";

import { loadConnectAndInitialize } from "@stripe/connect-js";

export async function initStripeConnect(params: {
  publishableKey: string;
  clientSecret: string;
  appearance?: any; // Connect appearance object
}) {
  if (typeof window === "undefined") {
    throw new Error("initStripeConnect must be called on the client side");
  }

  if (!params.publishableKey) {
    throw new Error("Missing Stripe publishable key");
  }
  if (!params.clientSecret) {
    throw new Error("Missing Stripe account session client secret");
  }

  return loadConnectAndInitialize({
    publishableKey: params.publishableKey,
    fetchClientSecret: async () => params.clientSecret,
    appearance: params.appearance,
  });
}
