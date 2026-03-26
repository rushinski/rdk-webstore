import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import {
  buildCustomerDisplayId,
  normalizeCustomerEmail,
  parseCustomerRouteId,
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
    payrilla_customer_token?: string | null;
  } | null;
  shipping?:
    | {
        name?: string | null;
        phone?: string | null;
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
      }
    | Array<{
        name?: string | null;
        phone?: string | null;
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
      }>
    | null;
};

type PaymentRow = {
  id: string;
  order_id: string;
  payrilla_status?: string | null;
  card_type?: string | null;
  card_last4?: string | null;
  card_expiry_month?: number | null;
  card_expiry_year?: number | null;
  amount_authorized?: number | null;
  amount_captured?: number | null;
  amount_refunded?: number | null;
  customer_email?: string | null;
  billing_name?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_zip?: string | null;
  billing_country?: string | null;
  billing_phone?: string | null;
  avs_result_code?: string | null;
  cvv2_result_code?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type AddressRow = {
  id: string;
  created_at?: string | null;
  name?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

const SUCCESSFUL_ORDER_STATUSES = new Set([
  "paid",
  "shipped",
  "refunded",
  "partially_refunded",
  "refund_pending",
  "refund_failed",
]);

function isPaymentAddressRow(address: AddressRow | PaymentRow): address is PaymentRow {
  return "billing_address" in address;
}

function getCustomerStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "paid":
    case "shipped":
      return "Succeeded";
    case "blocked":
    case "review":
      return "Blocked";
    case "failed":
      return "Failed";
    case "refunded":
    case "partially_refunded":
    case "refund_pending":
    case "refund_failed":
      return "Refunded";
    default:
      return status ?? "Unknown";
  }
}

function formatAddress(address: AddressRow | PaymentRow | null) {
  if (!address) {
    return null;
  }

  if (isPaymentAddressRow(address)) {
    return [
      address.billing_address,
      address.billing_city,
      address.billing_state,
      address.billing_zip,
      address.billing_country,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const tenantId = session.profile?.tenant_id ?? null;
    const { customerId } = await params;
    const identity = parseCustomerRouteId(customerId);

    if (!identity) {
      return NextResponse.json(
        { error: "Invalid customer id", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const admin = createSupabaseAdminClient();

    const buildOrdersQuery = () => {
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
          profiles!user_id(id, email, full_name, created_at, payrilla_customer_token),
          shipping:order_shipping(*)
          `,
        )
        .order("created_at", { ascending: false });

      if (tenantId) {
        ordersQuery = ordersQuery.eq("tenant_id", tenantId);
      }

      return ordersQuery;
    };

    let typedOrders: CustomerOrderRow[] = [];

    if (identity.kind === "account") {
      const { data: orders } = await buildOrdersQuery().eq("user_id", identity.userId);
      typedOrders = (orders ?? []) as CustomerOrderRow[];
    } else {
      const guestOrdersById = new Map<string, CustomerOrderRow>();

      const { data: exactGuestOrders } = await buildOrdersQuery()
        .is("user_id", null)
        .eq("guest_email", identity.email);

      for (const order of (exactGuestOrders ?? []) as CustomerOrderRow[]) {
        guestOrdersById.set(order.id, order);
      }

      if (guestOrdersById.size === 0) {
        const { data: fallbackGuestOrders } = await buildOrdersQuery()
          .is("user_id", null)
          .not("guest_email", "is", null);

        for (const order of (fallbackGuestOrders ?? []) as CustomerOrderRow[]) {
          if (normalizeCustomerEmail(order.guest_email ?? "") === identity.email) {
            guestOrdersById.set(order.id, order);
          }
        }
      }

      // Some historical guest orders only have the checkout email on payment rows.
      const buildGuestPaymentsQuery = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let guestPaymentsQuery = (admin as any)
          .from("payment_transactions")
          .select("order_id, customer_email, created_at")
          .not("customer_email", "is", null)
          .order("created_at", { ascending: false });

        if (tenantId) {
          guestPaymentsQuery = guestPaymentsQuery.eq("tenant_id", tenantId);
        }

        return guestPaymentsQuery;
      };

      const { data: paymentEmailRows } = await buildGuestPaymentsQuery();
      const paymentMatchedOrderIds = Array.from(
        new Set(
          ((paymentEmailRows ?? []) as Array<{
            order_id?: string | null;
            customer_email?: string | null;
          }>).flatMap((payment) =>
            payment.order_id &&
            normalizeCustomerEmail(payment.customer_email ?? "") === identity.email
              ? [payment.order_id]
              : [],
          ),
        ),
      );

      if (paymentMatchedOrderIds.length > 0) {
        const { data: paymentMatchedOrders } = await buildOrdersQuery()
          .is("user_id", null)
          .in("id", paymentMatchedOrderIds);

        for (const order of (paymentMatchedOrders ?? []) as CustomerOrderRow[]) {
          guestOrdersById.set(order.id, order);
        }
      }

      typedOrders = Array.from(guestOrdersById.values()).sort((a, b) => {
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
    }

    if (typedOrders.length === 0) {
      return NextResponse.json(
        { error: "Customer not found", requestId },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const orderIds = typedOrders.map((order) => order.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let paymentsQuery = (admin as any)
      .from("payment_transactions")
      .select(
        "id, order_id, payrilla_status, card_type, card_last4, card_expiry_month, card_expiry_year, amount_authorized, amount_captured, amount_refunded, customer_email, billing_name, billing_address, billing_city, billing_state, billing_zip, billing_country, billing_phone, avs_result_code, cvv2_result_code, created_at, updated_at",
      )
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });

    if (tenantId) {
      paymentsQuery = paymentsQuery.eq("tenant_id", tenantId);
    }

    const { data: payments } = await paymentsQuery;
    const paymentRows = (payments ?? []) as PaymentRow[];

    let shippingAddresses: AddressRow[] = [];
    let billingAddresses: AddressRow[] = [];
    let matchedProfile:
      | {
          id: string;
          created_at?: string | null;
          full_name?: string | null;
          email?: string | null;
          payrilla_customer_token?: string | null;
        }
      | null = null;

    if (identity.kind === "account") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: profile }, { data: shipping }, { data: billing }] = await Promise.all([
        (admin as any)
          .from("profiles")
          .select("id, created_at, full_name, email, payrilla_customer_token")
          .eq("id", identity.userId)
          .maybeSingle(),
        (admin as any)
          .from("user_addresses")
          .select("*")
          .eq("user_id", identity.userId)
          .order("created_at", { ascending: false }),
        (admin as any)
          .from("user_billing_addresses")
          .select("*")
          .eq("user_id", identity.userId)
          .order("created_at", { ascending: false }),
      ]);

      matchedProfile = profile ?? null;
      shippingAddresses = (shipping ?? []) as AddressRow[];
      billingAddresses = (billing ?? []) as AddressRow[];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (admin as any)
        .from("profiles")
        .select("id, created_at, full_name, email, payrilla_customer_token")
        .eq("email", identity.email)
        .maybeSingle();

      matchedProfile = profile ?? null;

      if (!matchedProfile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: fallbackProfiles } = await (admin as any)
          .from("profiles")
          .select("id, created_at, full_name, email, payrilla_customer_token")
          .not("email", "is", null);

        matchedProfile =
          (
            (fallbackProfiles ?? []) as Array<{
              id: string;
              created_at?: string | null;
              full_name?: string | null;
              email?: string | null;
              payrilla_customer_token?: string | null;
            }>
          ).find((candidate) => normalizeCustomerEmail(candidate.email ?? "") === identity.email) ??
          null;
      }
    }

    const latestOrder = typedOrders[0] ?? null;
    const latestPayment = paymentRows[0] ?? null;
    const latestShipping = Array.isArray(latestOrder?.shipping)
      ? (latestOrder?.shipping[0] ?? null)
      : (latestOrder?.shipping ?? null);
    const latestBilling = billingAddresses[0] ?? null;
    const customerEmail =
      latestOrder?.profiles?.email ??
      latestOrder?.guest_email ??
      latestPayment?.customer_email ??
      matchedProfile?.email ??
      null;
    const customerName =
      latestShipping?.name ??
      latestOrder?.profiles?.full_name ??
      latestPayment?.billing_name ??
      matchedProfile?.full_name ??
      customerEmail ??
      "Customer";
    const customerSince =
      identity.kind === "account"
        ? matchedProfile?.created_at ?? latestOrder?.created_at ?? latestPayment?.created_at
        : typedOrders[typedOrders.length - 1]?.created_at ?? latestPayment?.created_at;
    const lastUpdated = [latestOrder?.updated_at, latestPayment?.updated_at, latestPayment?.created_at]
      .filter(Boolean)
      .sort()
      .at(-1) as string | undefined;
    const totalSpend = typedOrders.reduce((sum, order) => {
      if (!SUCCESSFUL_ORDER_STATUSES.has(order.status ?? "")) {
        return sum;
      }
      return sum + Math.max(Number(order.total ?? 0) - Number(order.refund_amount ?? 0), 0);
    }, 0);

    const paymentRowsByOrderId = new Map<string, PaymentRow[]>();
    for (const payment of paymentRows) {
      const bucket = paymentRowsByOrderId.get(payment.order_id) ?? [];
      bucket.push(payment);
      paymentRowsByOrderId.set(payment.order_id, bucket);
    }

    const paymentsTable = typedOrders.map((order) => {
      const orderPayment = paymentRowsByOrderId.get(order.id)?.[0] ?? null;

      return {
        id: orderPayment?.id ?? order.id,
        orderId: order.id,
        amount:
          orderPayment?.amount_captured ??
          orderPayment?.amount_authorized ??
          Number(order.total ?? 0),
        status: getCustomerStatusLabel(order.status),
        createdAt: orderPayment?.created_at ?? order.created_at ?? "",
      };
    });

    const paymentMethodsMap = new Map<
      string,
      {
        id: string;
        label: string;
        lastUsedAt: string;
        expires: string | null;
        customerName: string | null;
        last4: string | null;
        billingAddress: string | null;
        phone: string | null;
        email: string | null;
        origin: string;
        cvcCheck: string | null;
        streetZipCheck: string | null;
      }
    >();

    for (const payment of paymentRows) {
      if (!payment.card_last4 && !payment.card_type) {
        continue;
      }

      const key = [
        payment.card_type ?? "",
        payment.card_last4 ?? "",
        payment.card_expiry_month ?? "",
        payment.card_expiry_year ?? "",
      ].join("|");

      if (!paymentMethodsMap.has(key)) {
        paymentMethodsMap.set(key, {
          id: payment.id,
          label: [payment.card_type ?? "Card", payment.card_last4 ? `•••• ${payment.card_last4}` : ""]
            .filter(Boolean)
            .join(" "),
          lastUsedAt: payment.created_at,
          expires:
            payment.card_expiry_month && payment.card_expiry_year
              ? `${String(payment.card_expiry_month).padStart(2, "0")} / ${payment.card_expiry_year}`
              : null,
          customerName: payment.billing_name ?? null,
          last4: payment.card_last4 ?? null,
          billingAddress: formatAddress(payment),
          phone: payment.billing_phone ?? null,
          email: payment.customer_email ?? null,
          origin: "Payrilla transaction history",
          cvcCheck: payment.cvv2_result_code ?? null,
          streetZipCheck: payment.avs_result_code ?? null,
        });
      }
    }

    const activityLog: Array<{
      id: string;
      title: string;
      description: string;
      createdAt: string;
    }> = [];

    if (identity.kind === "guest" && customerSince) {
      activityLog.push({
        id: "guest-created",
        title: "Guest profile created",
        description:
          "Guest was created to show payments that weren’t associated with an account.",
        createdAt: customerSince,
      });
    }

    if (identity.kind === "account" && matchedProfile?.created_at) {
      activityLog.push({
        id: "account-created",
        title: "Account created",
        description: "Customer account was created.",
        createdAt: matchedProfile.created_at,
      });
    }

    if (identity.kind === "guest" && matchedProfile?.created_at) {
      activityLog.push({
        id: "matching-account-created",
        title: "Matching account created",
        description:
          "An account now exists with the same email address as this guest customer.",
        createdAt: matchedProfile.created_at,
      });
    }

    for (const order of typedOrders) {
      const createdAt = order.created_at ?? null;
      if (!createdAt) {
        continue;
      }

      activityLog.push({
        id: `order-${order.id}`,
        title: `Payment ${getCustomerStatusLabel(order.status).toLowerCase()}`,
        description: `Order #${order.id.slice(0, 8)} was recorded for this customer.`,
        createdAt,
      });
    }

    for (const address of shippingAddresses) {
      if (!address.created_at) {
        continue;
      }

      activityLog.push({
        id: `shipping-${address.id}`,
        title: "Shipping address saved",
        description: formatAddress(address) ?? "Shipping address added to account.",
        createdAt: address.created_at,
      });
    }

    for (const address of billingAddresses) {
      if (!address.created_at) {
        continue;
      }

      activityLog.push({
        id: `billing-${address.id}`,
        title: "Billing address saved",
        description: formatAddress(address) ?? "Billing address added to account.",
        createdAt: address.created_at,
      });
    }

    activityLog.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json(
      {
        customer: {
          routeId: customerId,
          displayId: buildCustomerDisplayId(identity as CustomerIdentity),
          kind: identity.kind,
          name: customerName,
          email: customerEmail,
          phone: latestShipping?.phone ?? latestBilling?.phone ?? latestPayment?.billing_phone ?? null,
          customerSince: customerSince ?? null,
          lastUpdated: lastUpdated ?? null,
          billingDetails: formatAddress(latestBilling) ?? formatAddress(latestPayment) ?? null,
          totalSpend,
          paymentCount: paymentsTable.length,
          primaryPaymentMethod: paymentMethodsMap.values().next().value?.label ?? null,
          payrillaCustomerToken: matchedProfile?.payrilla_customer_token ?? null,
        },
        payments: paymentsTable.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
        paymentMethods: Array.from(paymentMethodsMap.values()).sort(
          (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
        ),
        activityLog,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/customers/[customerId]",
    });
    return NextResponse.json(
      { error: "Failed to fetch customer", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
