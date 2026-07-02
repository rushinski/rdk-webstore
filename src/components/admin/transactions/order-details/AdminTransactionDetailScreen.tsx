"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { type RefundableOrder } from "@/components/admin/orders/RefundOrderModal";
import {
  AdminOrderItemDetailsModal,
  getOrderItemFinancials,
} from "@/components/admin/orders/OrderItemDetailsModal";
import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Toast } from "@/components/ui/Toast";
import { useAdminTransactionDetailData } from "@/components/admin/transactions/order-details/useAdminTransactionDetailData";
import { useAdminTransactionDetailMutations } from "@/components/admin/transactions/order-details/useAdminTransactionDetailMutations";
import {
  buildTransactionDetailViewModel,
  fmtDate,
  getAvsLabel,
  getCvvLabel,
  getEmailTypeMeta,
  getEventMeta,
  getNoFraudBadge,
  getRelatedCheckoutLogs,
} from "@/components/admin/transactions/order-details/transactionDetailView";

import { EmailChecklistSection } from "./EmailChecklistSection";
import { EmailPreviewModal } from "./EmailPreviewModal";
import { PaymentEventDrawer } from "./PaymentEventDrawer";
import { SessionActivitySection } from "./SessionActivitySection";
import { TransactionHeaderActions } from "./TransactionHeaderActions";
import { TransactionFulfillmentPanels } from "./TransactionFulfillmentPanels";
import { TransactionPriceBreakdownSection } from "./TransactionPriceBreakdownSection";
import { TransactionSidebar } from "./TransactionSidebar";
import type { EmailLog, OrderItem } from "./types";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtMoney = (value: number | null | undefined) => fmt.format(Number(value ?? 0));

const getTransactionStatusTone = (
  status: string | null | undefined,
): "success" | "warning" | "danger" | "neutral" => {
  if (status === "failed" || status === "refund_failed") {
    return "danger";
  }
  if (
    status === "review" ||
    status === "refund_pending" ||
    status === "partially_refunded"
  ) {
    return "warning";
  }
  return "success";
};

export function AdminTransactionDetailScreen() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [emailPreview, setEmailPreview] = useState<EmailLog | null>(null);
  const [selectedPaymentEventId, setSelectedPaymentEventId] = useState<string | null>(
    null,
  );
  const [isPaymentDrawerVisible, setIsPaymentDrawerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminOrderItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  const {
    checkoutLogs,
    customerSummary,
    emailLogs,
    error,
    isLoading,
    loadTransaction,
    order,
    paymentEvents,
    paymentTx,
    trackingEvents,
  } = useAdminTransactionDetailData({
    orderId,
  });

  const {
    buildRefundableOrder,
    confirmRefund,
    handleResendEmail,
    isRefundSubmitting,
    refundOpen,
    resendingEmail,
    setRefundOpen,
    setToast,
    toast,
  } = useAdminTransactionDetailMutations({
    order,
    loadTransaction,
  });

  useEffect(() => {
    if (!selectedPaymentEventId) {
      setIsPaymentDrawerVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsPaymentDrawerVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedPaymentEventId]);

  useEffect(() => {
    if (!selectedPaymentEventId && !emailPreview) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [emailPreview, selectedPaymentEventId]);

  if (isLoading) {
    return (
      <div className="border border-brand-border bg-brand-surface px-6 py-24 text-center text-brand-muted">
        Loading...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/admin/transactions")}
          className="flex items-center gap-2 text-sm text-brand-muted transition-colors hover:text-brand-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </button>
        <AdminEmptyState
          title="Transaction Not Available"
          description={error ?? "Transaction not found."}
        />
      </div>
    );
  }

  const {
    checklistTypes,
    customerEmail,
    customerName,
    customerPhone,
    displayTotal,
    effectiveItemCost,
    isOrderPlaced,
    isPickup,
    isRefundable,
    items,
    paymentAttemptMade,
    processingFee,
    refundedAmount,
    refundedCents,
    selectedPaymentEvent,
    sellerRevenue,
    shipping,
    shippingAddr,
    showOrderProfit,
    showPriceBreakdown,
    statusMeta,
    subtotal,
    tax,
    totalProfit,
    sessionTimeline,
  } = buildTransactionDetailViewModel({
    emailLogs,
    order,
    paymentEvents,
    paymentTx,
    selectedPaymentEventId,
    items: order.items,
    getOrderItemFinancials,
  });
  const refundableOrder = buildRefundableOrder();
  const relatedCheckoutLogs = selectedPaymentEvent
    ? getRelatedCheckoutLogs(selectedPaymentEvent, checkoutLogs)
    : [];

  const closePaymentDrawer = () => {
    setIsPaymentDrawerVisible(false);
    window.setTimeout(() => {
      setSelectedPaymentEventId(null);
    }, 220);
  };

  const openItemModal = (item: OrderItem) => {
    setSelectedItem(item as unknown as AdminOrderItem);
    setItemModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-8xl">
      <button
        type="button"
        onClick={() => router.push("/admin/transactions")}
        className="flex items-center gap-2 text-sm text-brand-muted transition-colors hover:text-brand-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Transactions
      </button>

      <AdminPageHeader
        title={`#${order.id.slice(0, 8)}`}
        description={
          order.failure_reason
            ? order.failure_reason
            : `${isPickup ? "Pickup" : "Shipping"} order activity, payment state, and customer session detail.`
        }
        actions={
          <TransactionHeaderActions
            isRefundSubmitting={isRefundSubmitting}
            isRefundable={isRefundable}
            onConfirmRefund={confirmRefund}
            onOpenRefund={() => setRefundOpen(true)}
            onCloseRefund={() => setRefundOpen(false)}
            refundedAmount={refundedAmount}
            refundedCents={refundedCents}
            refundOpen={refundOpen}
            refundableOrder={refundableOrder as RefundableOrder}
            statusLabel={statusMeta.label}
            statusTone={getTransactionStatusTone(order.status)}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          <TransactionPriceBreakdownSection
            order={order}
            items={items}
            showPriceBreakdown={showPriceBreakdown}
            showOrderProfit={showOrderProfit}
            subtotal={subtotal}
            shipping={shipping}
            tax={tax}
            displayTotal={displayTotal}
            processingFee={processingFee}
            refundedCents={refundedCents}
            refundedAmount={refundedAmount}
            sellerRevenue={sellerRevenue}
            effectiveItemCost={effectiveItemCost}
            totalProfit={totalProfit}
            isOrderPlaced={isOrderPlaced}
            fmtMoney={fmtMoney}
            onOpenItemModal={openItemModal}
            getOrderItemFinancials={(item) =>
              getOrderItemFinancials(item as AdminOrderItem)
            }
          />

          <TransactionFulfillmentPanels
            order={order}
            shippingAddr={shippingAddr ?? null}
            trackingEvents={trackingEvents}
            paymentAttemptMade={paymentAttemptMade}
            paymentTx={paymentTx}
            fmtDate={fmtDate}
            getCvvLabel={getCvvLabel}
            getAvsLabel={getAvsLabel}
          />

          {isOrderPlaced && (
            <EmailChecklistSection
              checklistTypes={checklistTypes}
              emailLogs={emailLogs}
              isPickup={isPickup}
              resendingEmail={resendingEmail}
              onPreview={setEmailPreview}
              onResend={(emailType) => {
                void handleResendEmail(emailType);
              }}
              getEmailTypeMeta={getEmailTypeMeta}
              fmtDate={fmtDate}
            />
          )}

          <SessionActivitySection
            sessionTimeline={sessionTimeline}
            onSelectPaymentEvent={setSelectedPaymentEventId}
            onPreviewEmail={setEmailPreview}
            getEventMeta={getEventMeta}
            getEmailTypeMeta={getEmailTypeMeta}
            fmtDate={fmtDate}
          />
        </div>

        <TransactionSidebar
          order={order}
          paymentTx={paymentTx}
          statusLabel={statusMeta.label}
          isPickup={isPickup}
          refundedCents={refundedCents}
          refundedAmount={refundedAmount}
          customerSummary={customerSummary ?? null}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          shippingAddr={shippingAddr ?? null}
          fmtDate={fmtDate}
          fmtMoney={fmtMoney}
          getNoFraudBadge={getNoFraudBadge}
          onOpenCustomer={(routeId) => router.push(`/admin/customers/${routeId}`)}
        />
      </div>

      <EmailPreviewModal
        emailPreview={emailPreview}
        title={emailPreview ? getEmailTypeMeta(emailPreview.email_type).label : ""}
        onClose={() => setEmailPreview(null)}
      />

      <PaymentEventDrawer
        selectedPaymentEvent={selectedPaymentEvent}
        isVisible={isPaymentDrawerVisible}
        relatedCheckoutLogs={relatedCheckoutLogs}
        onClose={closePaymentDrawer}
        getEventMeta={getEventMeta}
        fmtDate={fmtDate}
      />

      <AdminOrderItemDetailsModal
        open={itemModalOpen}
        item={selectedItem}
        showProfit={showOrderProfit && !Boolean(selectedItem?.refunded_at)}
        onClose={() => {
          setItemModalOpen(false);
          setSelectedItem(null);
        }}
      />

      {toast && (
        <Toast
          open={Boolean(toast)}
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
