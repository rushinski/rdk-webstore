// src/repositories/stripe-events-repo.ts
//
// @deprecated — Use PaymentWebhookEventsRepository from payment-webhook-events-repo.ts
// This file is kept as a re-export shim for any remaining references during the
// Stripe → PayRilla migration transition. Remove once all callers are updated.

export { PaymentWebhookEventsRepository as StripeEventsRepository } from "@/repositories/payment-webhook-events-repo";
