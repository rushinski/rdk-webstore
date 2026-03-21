// src/services/order-email-service.ts
import { env } from "@/config/env";
import { emailSubjects } from "@/config/constants/email";
import { sendEmailWithRetry } from "@/lib/email/mailer";
import {
  buildOrderConfirmationEmail,
  buildOrderDeliveredEmail,
  buildOrderInTransitEmail,
  buildOrderLabelCreatedEmail,
  buildOrderRefundedEmail,
  buildPickupInstructionsEmail,
  type OrderConfirmationEmailInput,
  type OrderDeliveredEmailInput,
  type OrderInTransitEmailInput,
  type OrderLabelCreatedEmailInput,
  type OrderRefundedEmailInput,
  type PickupInstructionsEmailInput,
  type OrderItemEmail,
} from "@/lib/email/orders";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { EvidenceService } from "@/services/evidence-service";

type EmailContent = { html: string; text: string };

/**
 * Mapper types: the "detailed" row shape you get from repo joins like:
 * order_items(*, product:products(..., images:product_images(...)), variant:product_variants(...))
 */
type ProductImageRow = {
  url: string;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

type DetailedOrderItemRow = {
  quantity: number;
  unit_price?: number | null;
  line_total: number;
  product: {
    name?: string | null;
    brand?: string | null;
    model?: string | null;
    category?: string | null;
    sku?: string | null;
    title_display?: string | null;
    images?: ProductImageRow[] | null;
  } | null;
  variant: { size_label?: string | null } | null;
};

const safeHttpsUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

const pickPrimaryImage = (images?: ProductImageRow[] | null) => {
  if (!images?.length) {
    return null;
  }

  const primary = images.find((img) => img.is_primary);
  if (primary?.url) {
    return safeHttpsUrl(primary.url);
  }

  const sorted = [...images].sort(
    (a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999),
  );
  return safeHttpsUrl(sorted[0]?.url ?? null);
};

const mapOrderItemsToEmailItems = (rows: DetailedOrderItemRow[]): OrderItemEmail[] =>
  rows.map((row) => {
    const product = row.product;
    const title = product?.title_display ?? product?.name ?? "Item";

    return {
      title,
      sizeLabel: row.variant?.size_label ?? null,
      quantity: row.quantity,
      unitPrice: row.unit_price ?? 0,
      lineTotal: row.line_total,

      imageUrl: pickPrimaryImage(product?.images ?? null),
      brand: product?.brand ?? null,
      model: product?.model ?? null,
      category: product?.category ?? null,
      sku: product?.sku ?? null,
    };
  });

export class OrderEmailService {
  private evidenceService: EvidenceService | null;

  /**
   * @param supabase - When provided, email sends are recorded in email_audit_log
   * @param tenantId - Required to scope audit log entries
   */
  constructor(
    supabase?: TypedSupabaseClient | null,
    private readonly tenantId?: string | null,
  ) {
    this.evidenceService = supabase && tenantId ? new EvidenceService(supabase) : null;
  }

  private async send(
    to: string,
    subject: string,
    content: EmailContent,
    orderId?: string | null,
    emailType?: string,
  ) {
    const result = await sendEmailWithRetry(
      {
        to,
        subject,
        html: content.html,
        text: content.text,
        replyTo: env.SUPPORT_INBOX_EMAIL,
      },
      { maxAttempts: 3, baseDelayMs: 750, timeoutMs: 5000 },
    );

    // Record in audit log (non-blocking, never throws)
    if (this.evidenceService && this.tenantId && emailType) {
      void this.evidenceService.recordEmailSent({
        orderId: orderId ?? null,
        tenantId: this.tenantId,
        emailType,
        recipientEmail: to,
        subject,
        htmlSnapshot: content.html,
        plainTextSnapshot: content.text,
        messageId: result?.messageId ?? null,
      });
    }
  }

  /**
   * Existing path (still supported): caller already supplies email-ready items.
   */
  async sendOrderConfirmation(input: OrderConfirmationEmailInput) {
    if (!input.to) {
      return;
    }
    const content = buildOrderConfirmationEmail(input);
    await this.send(
      input.to,
      emailSubjects.orderConfirmation(),
      content,
      input.orderId,
      "order_confirmation",
    );
  }

  /**
   * Preferred path when you have detailed repo-joined items and want guaranteed images + details.
   */
  async sendOrderConfirmationFromDetailed(params: {
    to: string | null;
    order: Omit<OrderConfirmationEmailInput, "items" | "to">;
    itemsDetailed: DetailedOrderItemRow[];
  }) {
    if (!params.to) {
      return;
    }

    const items = mapOrderItemsToEmailItems(params.itemsDetailed);

    const input: OrderConfirmationEmailInput = {
      ...params.order,
      to: params.to,
      items,
    };

    const content = buildOrderConfirmationEmail(input);
    await this.send(
      params.to,
      emailSubjects.orderConfirmation(),
      content,
      params.order.orderId,
      "order_confirmation",
    );
  }

  async sendPickupInstructions(input: PickupInstructionsEmailInput) {
    if (!input.to) {
      return;
    }
    const content = buildPickupInstructionsEmail(input);
    await this.send(
      input.to,
      emailSubjects.pickupInstructions(input.orderId),
      content,
      input.orderId,
      "pickup_instructions",
    );
  }

  async sendOrderLabelCreated(input: OrderLabelCreatedEmailInput) {
    if (!input.to) {
      return;
    }
    const content = buildOrderLabelCreatedEmail(input);
    await this.send(
      input.to,
      emailSubjects.orderLabelCreated(input.orderId),
      content,
      input.orderId,
      "shipping_update",
    );
  }

  async sendOrderInTransit(input: OrderInTransitEmailInput) {
    if (!input.to) {
      return;
    }
    const content = buildOrderInTransitEmail(input);
    await this.send(
      input.to,
      emailSubjects.orderInTransit(input.orderId),
      content,
      input.orderId,
      "shipping_update",
    );
  }

  async sendOrderDelivered(input: OrderDeliveredEmailInput) {
    if (!input.to) {
      return;
    }
    const content = buildOrderDeliveredEmail(input);
    await this.send(
      input.to,
      emailSubjects.orderDelivered(input.orderId),
      content,
      input.orderId,
      "delivery_confirmation",
    );
  }

  async sendOrderRefunded(input: OrderRefundedEmailInput) {
    if (!input.to) {
      return;
    }
    const content = buildOrderRefundedEmail(input);
    await this.send(
      input.to,
      emailSubjects.orderRefunded(input.orderId),
      content,
      input.orderId,
      "refund_notification",
    );
  }
}
