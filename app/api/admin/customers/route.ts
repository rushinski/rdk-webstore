import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import {
  buildCustomerDisplayId,
  buildCustomerRouteId,
  type CustomerIdentity,
} from "@/lib/admin/customer-identifiers";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

type CustomerOrderRow = {
  id: string;
  user_id?: string | null;
  guest_email?: string | null;
  status?: string | null;
  total?: number | null;
  refund_amount?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  profiles?: {
    id?: string | null;
    email?: string | null;
    full_name?: string | null;
    created_at?: string | null;
  } | null;
  shipping_address?:
    | {
        name?: string | null;
      }
    | Array<{
        name?: string | null;
      }>
    | null;
};

type PaymentRow = {
  id: string;
  order_id: string;
  payrilla_status?: string | null;
  card_type?: string | null;
  card_last4?: string | null;
  amount_authorized?: number | null;
  amount_captured?: number | null;
  amount_refunded?: number | null;
  customer_email?: string | null;
  billing_name?: string | null;
  created_at: string;
  updated_at?: string | null;
};

const SUCCESSFUL_ORDER_STATUSES = new Set([
  "paid",
  "shipped",
  "refunded",
  "partially_refunded",
  "refund_pending",
  "refund_failed",
]);

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const tenantId = session.profile?.tenant_id ?? null;
    const admin = createSupabaseAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ordersQuery = (admin as any)
      .from("orders")
      .select(
        `
        id,
        user_id,
        guest_email,
        status,
        total,
        refund_amount,
        created_at,
        updated_at,
        profiles!user_id(id, email, full_name, created_at),
        shipping_address:order_shipping(name)
        `,
      )
      .order("created_at", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let paymentsQuery = (admin as any)
      .from("payment_transactions")
      .select(
        "id, order_id, payrilla_status, card_type, card_last4, amount_authorized, amount_captured, amount_refunded, customer_email, billing_name, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (tenantId) {
      ordersQuery = ordersQuery.eq("tenant_id", tenantId);
      paymentsQuery = paymentsQuery.eq("tenant_id", tenantId);
    }

    const [{ data: orders }, { data: payments }] = await Promise.all([
      ordersQuery,
      paymentsQuery,
    ]);

    const paymentsByOrderId = new Map<string, PaymentRow[]>();
    for (const payment of (payments ?? []) as PaymentRow[]) {
      const bucket = paymentsByOrderId.get(payment.order_id) ?? [];
      bucket.push(payment);
      paymentsByOrderId.set(payment.order_id, bucket);
    }

    const customers = new Map<
      string,
      {
        routeId: string;
        displayId: string;
        kind: "account" | "guest";
        name: string;
        email: string | null;
        createdAt: string;
        lastPaymentAt: string | null;
        totalSpend: number;
        paymentCount: number;
        primaryPaymentMethod: string | null;
      }
    >();

    for (const order of (orders ?? []) as CustomerOrderRow[]) {
      const orderPayments = paymentsByOrderId.get(order.id) ?? [];
      const latestPayment = orderPayments[0] ?? null;
      const shippingAddress = Array.isArray(order.shipping_address)
        ? (order.shipping_address[0] ?? null)
        : (order.shipping_address ?? null);
      const email =
        order.profiles?.email ?? order.guest_email ?? latestPayment?.customer_email ?? null;
      const identity: CustomerIdentity | null = order.user_id
        ? { kind: "account", userId: order.user_id }
        : email
          ? { kind: "guest", email }
          : null;

      if (!identity) {
        continue;
      }

      const routeId = buildCustomerRouteId(identity);
      const displayId = buildCustomerDisplayId(identity);
      const createdAt =
        order.profiles?.created_at ?? order.created_at ?? latestPayment?.created_at ?? "";

      if (!createdAt) {
        continue;
      }

      const existing = customers.get(routeId);
      const successfulNet =
        SUCCESSFUL_ORDER_STATUSES.has(order.status ?? "") && order.total !== null
          ? Math.max(Number(order.total ?? 0) - Number(order.refund_amount ?? 0), 0)
          : 0;

      const candidatePrimaryPaymentMethod =
        latestPayment?.card_type || latestPayment?.card_last4
          ? [latestPayment.card_type ?? "", latestPayment.card_last4 ? `•••• ${latestPayment.card_last4}` : ""]
              .filter(Boolean)
              .join(" ")
          : null;

      if (!existing) {
        customers.set(routeId, {
          routeId,
          displayId,
          kind: identity.kind,
          name:
            shippingAddress?.name ??
            order.profiles?.full_name ??
            latestPayment?.billing_name ??
            email ??
            "Customer",
          email,
          createdAt,
          lastPaymentAt: latestPayment?.created_at ?? null,
          totalSpend: successfulNet,
          paymentCount: orderPayments.length,
          primaryPaymentMethod: candidatePrimaryPaymentMethod,
        });
        continue;
      }

      if (createdAt < existing.createdAt) {
        existing.createdAt = createdAt;
      }
      if (
        latestPayment?.created_at &&
        (!existing.lastPaymentAt || latestPayment.created_at > existing.lastPaymentAt)
      ) {
        existing.lastPaymentAt = latestPayment.created_at;
        existing.primaryPaymentMethod = candidatePrimaryPaymentMethod;
      }
      existing.totalSpend += successfulNet;
      existing.paymentCount += orderPayments.length;

      if (!existing.email && email) {
        existing.email = email;
      }
      if (
        existing.name === "Customer" &&
        (shippingAddress?.name || order.profiles?.full_name || latestPayment?.billing_name)
      ) {
        existing.name =
          shippingAddress?.name ??
          order.profiles?.full_name ??
          latestPayment?.billing_name ??
          existing.name;
      }
    }

    return NextResponse.json(
      {
        customers: Array.from(customers.values()).sort((a, b) => {
          const aTime = a.lastPaymentAt ?? a.createdAt;
          const bTime = b.lastPaymentAt ?? b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/customers",
    });
    return NextResponse.json(
      { error: "Failed to fetch customers", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
