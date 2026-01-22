// src/services/refund-service.ts (OPTIONAL - Only if you want bulk refund capability)
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/stripe-server';
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { OrdersRepository } from '@/repositories/orders-repo';
import { ProfileRepository } from '@/repositories/profile-repo';
import { log, logError } from '@/lib/log';

/**
 * RefundService - Handles order refunds via tenant Stripe Connect accounts
 * 
 * NOTE: The main refund logic is in /api/admin/orders/[orderId]/refund/route.ts
 * This service is only needed if you want to support bulk refunds or 
 * programmatic refunds from other parts of your application.
 */
export class RefundService {
  private ordersRepo: OrdersRepository;
  private profileRepo: ProfileRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.ordersRepo = new OrdersRepository(supabase);
    this.profileRepo = new ProfileRepository(supabase);
  }

  async refundOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get order with tenant info
      const order = await this.ordersRepo.getOrderWithTenant(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'paid' && order.status !== 'shipped') {
        throw new Error('Order cannot be refunded');
      }

      const paymentIntentId = order.stripe_payment_intent_id;
      if (!paymentIntentId) {
        throw new Error('No payment intent found');
      }

      // Get tenant's Stripe Connect account
      const tenantId = order.tenant_id;
      if (!tenantId) {
        throw new Error('Tenant not found for order');
      }

      const stripeAccountId = await this.profileRepo.getStripeAccountIdForTenant(tenantId);
      if (!stripeAccountId) {
        throw new Error('Stripe Connect account not found for tenant');
      }

      log({
        level: 'info',
        layer: 'service',
        message: 'Processing refund',
        orderId,
        tenantId,
        stripeAccountId,
        paymentIntentId,
      });

      // ✅ Create refund on the Connect account (charges seller, not platform)
      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
        },
        {
          stripeAccount: stripeAccountId, // ✅ Critical: Refund from tenant's account
        }
      );

      // Update order status
      const refundAmount = refund.amount;
      await this.ordersRepo.markRefunded(orderId, refundAmount);

      log({
        level: 'info',
        layer: 'service',
        message: 'Refund completed',
        orderId,
        refundId: refund.id,
        amount: refundAmount,
      });

      return { success: true };
    } catch (error: any) {
      logError(error, {
        layer: 'service',
        event: 'refund_failed',
        orderId,
      });

      return {
        success: false,
        error: error.message || 'Refund failed',
      };
    }
  }

  async bulkRefund(orderIds: string[]): Promise<{
    success: boolean;
    results: Array<{ orderId: string; success: boolean; error?: string }>;
  }> {
    const results = await Promise.all(
      orderIds.map(async (orderId) => {
        const result = await this.refundOrder(orderId);
        return { orderId, ...result };
      })
    );

    const allSuccess = results.every((r) => r.success);

    return {
      success: allSuccess,
      results,
    };
  }
}
