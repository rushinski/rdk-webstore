// src/services/order-service.ts

import type { OrdersRepo } from "@/repositories/orders-repo";
import type { ProfilesRepo } from "@/repositories/profiles-repo";
import { z } from "zod";

const checkoutSchema = z.object({
  userId: z.string().uuid(),
  subtotal: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  total: z.number().nonnegative(),
  stripeSessionId: z.string().min(1),
  tenantId: z.string().uuid().nullable().optional(),
  sellerId: z.string().uuid().nullable().optional(),
  marketplaceId: z.string().uuid().nullable().optional(),
});

export class OrderService {
  private orders: OrdersRepo;
  private profiles: ProfilesRepo;
  private requestId?: string;
  private userId?: string | null;

  constructor(opts: {
    repos: {
      orders: OrdersRepo;
      profiles: ProfilesRepo;
    };
    requestId?: string;
    userId?: string | null;
  }) {
    this.orders = opts.repos.orders;
    this.profiles = opts.repos.profiles;
    this.requestId = opts.requestId;
    this.userId = opts.userId;
  }

  /**
   * Called from /api/checkout BEFORE redirecting to Stripe.
   */
  async createPendingOrder(input: z.infer<typeof checkoutSchema>) {
    const validated = checkoutSchema.parse(input);

    if (validated.userId !== this.userId) {
      throw new Error("Unauthorized: userId mismatch");
    }

    return this.orders.createPending({
      user_id: validated.userId,
      subtotal: validated.subtotal,
      shipping: validated.shipping,
      total: validated.total,
      stripe_session_id: validated.stripeSessionId,
      tenant_id: validated.tenantId ?? null,
      seller_id: validated.sellerId ?? null,
      marketplace_id: validated.marketplaceId ?? null,
    });
  }

  /**
   * Called ONLY from Stripe webhook using AdminClient
   */
  async finalizeOrderFromStripe(stripeSessionId: string, total: number) {
    return this.orders.finalizeStripeOrder(stripeSessionId, {
      status: "paid",
      total,
    });
  }

  async listUserOrders(userId: string) {
    return this.orders.listForUser(userId);
  }

  async getOrder(id: string) {
    return this.orders.getById(id);
  }
}
