import { env } from "@/config/env";
import type { AdminSupabaseClient } from "@/lib/supabase/service-role";
import { log } from "@/lib/utils/log";
import { OrderEventsRepository } from "@/repositories/order-events-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { OrderAccessTokenService } from "@/services/order-access-token-service";
import { OrderEmailService } from "@/services/order-email-service";
import type { Tables } from "@/types/db/database.types";

type OrderRow = Tables<"orders">;

export type RefundNotificationMetadata = {
  refundAmountCents: number;
  cumulativeRefundCents: number;
  createdAt: string;
};

type SendRefundNotificationResult =
  | { status: "sent"; metadata: RefundNotificationMetadata }
  | { status: "skipped_duplicate"; metadata: RefundNotificationMetadata }
  | { status: "skipped_missing_tenant" | "skipped_no_recipient" };

const PLACEHOLDER_EMAIL_DOMAIN = "@placeholder.local";
const REFUND_NOTIFICATION_EVENT = "refund_notification_sent";
const REFUND_MARKER_PREFIX = "refund_notification_v1:";
const RECENT_NOTIFICATION_WINDOW_MS = 15 * 60 * 1000;

function buildRefundMarker(metadata: Omit<RefundNotificationMetadata, "createdAt">) {
  return `${REFUND_MARKER_PREFIX}${metadata.refundAmountCents}:${metadata.cumulativeRefundCents}`;
}

function parseRefundMarker(
  message: string | null | undefined,
  createdAt: string,
): RefundNotificationMetadata | null {
  if (!message?.startsWith(REFUND_MARKER_PREFIX)) {
    return null;
  }

  const raw = message.slice(REFUND_MARKER_PREFIX.length);
  const [refundAmountRaw, cumulativeRaw] = raw.split(":");
  const refundAmountCents = Number.parseInt(refundAmountRaw ?? "", 10);
  const cumulativeRefundCents = Number.parseInt(cumulativeRaw ?? "", 10);

  if (!Number.isFinite(refundAmountCents) || !Number.isFinite(cumulativeRefundCents)) {
    return null;
  }

  return {
    refundAmountCents,
    cumulativeRefundCents,
    createdAt,
  };
}

export class RefundNotificationService {
  constructor(private readonly adminSupabase: AdminSupabaseClient) {}

  async sendRefundNotification(params: {
    order: OrderRow;
    refundAmountCents: number;
    cumulativeRefundCents: number;
    requestId?: string;
    skipIfAlreadySent?: boolean;
  }): Promise<SendRefundNotificationResult> {
    if (!params.order.tenant_id) {
      log({
        level: "warn",
        layer: "service",
        message: "refund_notification_missing_tenant",
        orderId: params.order.id,
        requestId: params.requestId,
      });
      return { status: "skipped_missing_tenant" };
    }

    const metadata: RefundNotificationMetadata = {
      refundAmountCents: params.refundAmountCents,
      cumulativeRefundCents: params.cumulativeRefundCents,
      createdAt: new Date().toISOString(),
    };

    if (params.skipIfAlreadySent) {
      const existing = await this.findRecentMatchingNotification({
        orderId: params.order.id,
        refundAmountCents: params.refundAmountCents,
        cumulativeRefundCents: params.cumulativeRefundCents,
      });
      if (existing) {
        return { status: "skipped_duplicate", metadata: existing };
      }
    }

    const recipientEmail = await this.resolveRecipientEmail(params.order);
    if (!recipientEmail) {
      log({
        level: "warn",
        layer: "service",
        message: "refund_notification_missing_recipient",
        orderId: params.order.id,
        requestId: params.requestId,
      });
      return { status: "skipped_no_recipient" };
    }

    const orderUrl = await this.buildOrderUrl(params.order);
    const emailService = new OrderEmailService(
      this.adminSupabase,
      params.order.tenant_id,
    );

    await emailService.sendOrderRefunded({
      to: recipientEmail,
      orderId: params.order.id,
      refundAmount: params.refundAmountCents,
      orderUrl,
    });

    const orderEventsRepo = new OrderEventsRepository(this.adminSupabase);
    await orderEventsRepo.insertEvent({
      orderId: params.order.id,
      type: REFUND_NOTIFICATION_EVENT,
      message: buildRefundMarker(metadata),
    });

    return { status: "sent", metadata };
  }

  async getLatestRefundNotification(
    orderId: string,
  ): Promise<RefundNotificationMetadata | null> {
    const events = await this.listRefundNotificationEvents(orderId);
    for (const event of events) {
      const parsed = parseRefundMarker(event.message, event.created_at);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }

  async findRecentMatchingNotification(params: {
    orderId: string;
    refundAmountCents: number;
    cumulativeRefundCents: number;
    windowMs?: number;
  }): Promise<RefundNotificationMetadata | null> {
    const windowMs = params.windowMs ?? RECENT_NOTIFICATION_WINDOW_MS;
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    const events = await this.listRefundNotificationEvents(params.orderId, cutoff);

    for (const event of events) {
      const parsed = parseRefundMarker(event.message, event.created_at);
      if (
        parsed &&
        parsed.refundAmountCents === params.refundAmountCents &&
        parsed.cumulativeRefundCents === params.cumulativeRefundCents
      ) {
        return parsed;
      }
    }

    return null;
  }

  private async resolveRecipientEmail(order: OrderRow): Promise<string | null> {
    let email: string | null = null;

    if (order.user_id) {
      const profilesRepo = new ProfileRepository(this.adminSupabase);
      email = (await profilesRepo.getByUserId(order.user_id))?.email ?? null;
    }

    if (!email) {
      email = order.guest_email ?? null;
    }

    if (email?.endsWith(PLACEHOLDER_EMAIL_DOMAIN)) {
      return null;
    }

    return email;
  }

  private async buildOrderUrl(order: OrderRow): Promise<string | null> {
    if (order.user_id || !order.guest_email) {
      return null;
    }

    const accessTokens = new OrderAccessTokenService(this.adminSupabase);
    const { token } = await accessTokens.createToken({ orderId: order.id });
    return `${env.NEXT_PUBLIC_SITE_URL}/order-status/${order.id}?token=${encodeURIComponent(token)}`;
  }

  private async listRefundNotificationEvents(orderId: string, since?: string) {
    let query = this.adminSupabase
      .from("order_events")
      .select("message, created_at")
      .eq("order_id", orderId)
      .eq("type", REFUND_NOTIFICATION_EVENT)
      .order("created_at", { ascending: false });

    if (since) {
      query = query.gte("created_at", since);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return data ?? [];
  }
}
