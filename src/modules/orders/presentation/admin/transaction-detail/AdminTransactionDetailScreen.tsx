"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { type RefundableOrder } from "@/modules/orders/presentation/admin/refund-order";
import {
  AdminOrderItemDetailsModal,
  getOrderItemFinancials,
  type AdminOrderItem,
} from "@/modules/orders/presentation/admin/order-item-details";
import {
  useAdminTransactionDetailMutations,
  useAdminTransactionDetailData,
  useAdminTransactionDetailUi,
  EmailChecklistSection,
  EmailPreviewModal,
  PaymentEventDrawer,
  SessionActivitySection,
  TransactionFulfillmentPanels,
  TransactionHeaderActions,
  TransactionPriceBreakdownSection,
  TransactionSidebar,
  buildTransactionDetailViewModel,
  fmtDate,
  getAvsLabel,
  getCvvLabel,
  getEmailTypeMeta,
  getEventMeta,
  getRiskBadge,
  getRelatedCheckoutLogs,
} from "@/modules/orders/presentation/admin/transaction-detail";
import { AdminEmptyState } from "@/modules/shared/presentation/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";
import { Toast } from "@/components/ui/Toast";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtMoney = (value: number | null | undefined) => fmt.format(Number(value ?? 0));

export function AdminTransactionDetailScreen() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const {
    closeEmailPreview,
    closeItemModal,
    closePaymentDrawer,
    emailPreview,
    getStatusTone,
    isPaymentDrawerVisible,
    itemModalOpen,
    openItemModal,
    selectedItem,
    selectedPaymentEventId,
    setEmailPreview,
    setSelectedPaymentEventId,
  } = useAdminTransactionDetailUi();

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
            statusTone={getStatusTone(order.status)}
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
          getRiskBadge={getRiskBadge}
          onOpenCustomer={(routeId) => router.push(`/admin/customers/${routeId}`)}
        />
      </div>

      <EmailPreviewModal
        emailPreview={emailPreview}
        title={emailPreview ? getEmailTypeMeta(emailPreview.email_type).label : ""}
        onClose={closeEmailPreview}
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
        onClose={closeItemModal}
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

