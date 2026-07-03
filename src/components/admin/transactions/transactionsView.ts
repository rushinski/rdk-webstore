import type { TransactionOrder } from "@/components/admin/transactions/useAdminTransactionsData";
import { getOrderNetProfitDollars, shouldShowOrderProfit } from "@/lib/orders/metrics";

type OrderShipping = {
  name?: string | null;
};

type PaymentSummary = {
  card_type?: string | null;
  card_last4?: string | null;
  paymentStatus?: string | null;
} | null;

export function getStatusMeta(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return { label: "Succeeded", tone: "success" as const };
    case "shipped":
      return { label: "Shipped", tone: "neutral" as const };
    case "refunded":
      return { label: "Refunded", tone: "danger" as const };
    case "refund_pending":
      return { label: "Refund pending", tone: "warning" as const };
    case "refund_failed":
      return { label: "Refund failed", tone: "danger" as const };
    case "partially_refunded":
      return { label: "Partially refunded", tone: "warning" as const };
    case "failed":
      return { label: "Failed", tone: "danger" as const };
    case "blocked":
      return { label: "Blocked", tone: "danger" as const };
    case "review":
      return { label: "Under review", tone: "warning" as const };
    case "pending":
      return { label: "Incomplete", tone: "neutral" as const };
    default:
      return { label: status ?? "Unknown", tone: "neutral" as const };
  }
}

function resolveShipping(value: unknown): OrderShipping | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return (value[0] ?? null) as OrderShipping | null;
  }
  return value as OrderShipping;
}

function resolvePayment(value: unknown): PaymentSummary | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return (value[0] ?? null) as PaymentSummary | null;
  }
  return value as PaymentSummary;
}

export function getCustomerName(order: TransactionOrder) {
  return (
    resolveShipping(order.shipping)?.name?.trim() ||
    (order.shipping_profile_name ?? "").trim() ||
    "-"
  );
}

export function getCustomerEmail(order: TransactionOrder) {
  return (order.profiles?.email ?? order.guest_email ?? "").trim() || "-";
}

export function getPaymentDisplay(order: TransactionOrder) {
  const payment = resolvePayment(order.payment);
  if (!payment?.card_type && !payment?.card_last4) {
    return "-";
  }

  const type = payment.card_type ?? "";
  const last4 = payment.card_last4 ? `.... ${payment.card_last4}` : "";
  return [type, last4].filter(Boolean).join(" ");
}

export function getProfit(order: TransactionOrder): number | null {
  if (!shouldShowOrderProfit(order.status)) {
    return null;
  }

  const items = order.items;
  if (!items || items.length === 0) {
    return null;
  }

  return getOrderNetProfitDollars({
    subtotal: order.subtotal ?? order.total ?? 0,
    total: order.total ?? 0,
    refundAmountRaw: order.refund_amount ?? 0,
    items,
    resolveUnitCost: (item) => Number(item.unit_cost ?? 0),
  });
}

export function buildFilteredTransactions(
  orders: TransactionOrder[],
  searchQuery: string,
) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return orders;
  }

  return orders.filter((order) => {
    const name = getCustomerName(order).toLowerCase();
    const email = getCustomerEmail(order).toLowerCase();
    const id = order.id.toLowerCase();
    const fulfillment = (order.fulfillment ?? "").toLowerCase();
    const createdAt = order.created_at ? new Date(order.created_at) : null;
    const dateStr = createdAt ? createdAt.toLocaleDateString().toLowerCase() : "";
    const isoStr = createdAt ? createdAt.toISOString().slice(0, 10) : "";

    return (
      name.includes(query) ||
      email.includes(query) ||
      id.includes(query) ||
      fulfillment.includes(query) ||
      dateStr.includes(query) ||
      isoStr.includes(query)
    );
  });
}

export function buildPaginationWindow(page: number, totalPages: number) {
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let nextPage = start; nextPage <= end; nextPage += 1) {
    pages.push(nextPage);
  }

  return { end, pages, start };
}

export function buildTransactionRowModel(order: TransactionOrder) {
  return {
    createdAt: order.created_at ? new Date(order.created_at) : null,
    customerName: getCustomerName(order),
    fulfillmentLabel: order.fulfillment === "pickup" ? "Pickup" : "Ship",
    orderHref: `/admin/transactions/${order.id}`,
    paymentDisplay: getPaymentDisplay(order),
    profit: getProfit(order),
    statusMeta: getStatusMeta(order.status),
  };
}
