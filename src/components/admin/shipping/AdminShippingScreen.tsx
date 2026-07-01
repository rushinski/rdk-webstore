// src/components/admin/shipping/AdminShippingScreen.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  AdminOrderItemDetailsModal,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { CreateLabelForm } from "@/components/admin/shipping/CreateLabelForm";
import { OriginModal } from "@/components/admin/shipping/OriginModal";
import { ShippingOrdersTable } from "@/components/admin/shipping/ShippingOrdersTable";
import { ShippingPagination } from "@/components/admin/shipping/ShippingPagination";
import { ShippingTabBar } from "@/components/admin/shipping/ShippingTabBar";
import { useAdminShippingData } from "@/components/admin/shipping/useAdminShippingData";
import { useAdminShippingMutations } from "@/components/admin/shipping/useAdminShippingMutations";
import {
  buildPackageProfile,
  DEFAULT_PACKAGE,
  formatAddress,
  formatOriginAddress,
  formatPlacedAt,
  getCustomerName,
  getPrimaryImage,
  getTrackingUrl,
  resolveShippingAddress,
} from "@/components/admin/shipping/shippingView";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ShippingOrigin, TabKey } from "@/types/domain/shipping";
import type {
  ShippingOrder,
  ShippingOrderItem,
} from "@/components/admin/shipping/shippingTypes";

const PAGE_SIZE = 8;
const SHIPPING_ORDER_STATUSES = ["paid", "shipped"];
const EMPTY_ORIGIN: ShippingOrigin = {
  name: "",
  company: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

type OriginField = keyof ShippingOrigin;
type OriginErrors = Partial<Record<OriginField, string>>;

const TABS: Array<{ key: TabKey; label: string; status: string }> = [
  { key: "label", label: "Review & Create Label", status: "unfulfilled" },
  { key: "ready", label: "Need to Ship", status: "ready_to_ship" },
  { key: "shipped", label: "Shipped", status: "shipped" },
  { key: "delivered", label: "Delivered", status: "delivered" },
];

type OrderItem = ShippingOrderItem;

const extractOriginErrors = (
  issues: Record<string, { _errors?: string[] }> | undefined,
): OriginErrors => {
  const next: OriginErrors = {};
  if (!issues || typeof issues !== "object") {
    return next;
  }
  const fields: OriginField[] = [
    "name",
    "company",
    "phone",
    "line1",
    "line2",
    "city",
    "state",
    "postal_code",
    "country",
  ];
  fields.forEach((field) => {
    const entry = issues[field];
    if (entry?._errors?.length) {
      next[field] = entry._errors[0];
    }
  });
  return next;
};

const validateOrigin = (origin: ShippingOrigin): OriginErrors => {
  const errors: OriginErrors = {};
  const name = origin.name.trim();
  const company = (origin.company ?? "").trim();

  if (!name && !company) {
    const message = "Enter a contact name or company.";
    errors.name = message;
    errors.company = message;
  }
  if (!origin.line1.trim()) {
    errors.line1 = "Street address is required.";
  }
  if (!origin.city.trim()) {
    errors.city = "City is required.";
  }
  if (!origin.state.trim()) {
    errors.state = "State is required.";
  }
  if (!origin.postal_code.trim()) {
    errors.postal_code = "ZIP / postal code is required.";
  }
  if (!origin.country.trim()) {
    errors.country = "Country is required.";
  }

  return errors;
};

export function AdminShippingScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("label");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [confirmMarkShipped, setConfirmMarkShipped] = useState<ShippingOrder | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [originModalOpen, setOriginModalOpen] = useState(false);
  const [labelOrder, setLabelOrder] = useState<ShippingOrder | null>(null);

  const {
    counts,
    currentPage,
    isLoading,
    orders,
    originAddress,
    refreshShippingData,
    loadOriginAddress,
    setOriginAddress,
    setPageForActiveTab,
    shippingDefaults,
    totalPages,
  } = useAdminShippingData({
    activeTab,
    pageSize: PAGE_SIZE,
    tabs: TABS,
    shippingOrderStatuses: SHIPPING_ORDER_STATUSES,
  });

  const {
    handleLabelSuccess,
    handleMarkShipped,
    handleOriginChange,
    handleSaveOrigin,
    markingShippedId,
    originError,
    originFieldErrors,
    originMessage,
    resetOriginFeedback,
    savingOrigin,
    viewLabel,
  } = useAdminShippingMutations({
    emptyOrigin: EMPTY_ORIGIN,
    originAddress,
    refreshShippingData,
    setActiveTab,
    setLabelOrder,
    setOriginAddress,
    validateOrigin,
    extractOriginErrors,
  });

  useEffect(() => {
    if (!originModalOpen) {
      return;
    }
    resetOriginFeedback();
    void loadOriginAddress();
  }, [loadOriginAddress, originModalOpen, resetOriginFeedback]);

  const toggleItems = (orderId: string) => {
    setExpandedItems((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleDetails = (orderId: string) => {
    setExpandedDetails((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleOrderExpansion = (orderId: string) => {
    const nextExpanded = !(
      (expandedItems[orderId] ?? false) ||
      (expandedDetails[orderId] ?? false)
    );
    setExpandedItems((prev) => ({ ...prev, [orderId]: nextExpanded }));
    setExpandedDetails((prev) => ({ ...prev, [orderId]: nextExpanded }));
  };

  const openItemDetails = (item: OrderItem) => {
    setSelectedItem(item);
  };

  const originLine = formatOriginAddress(originAddress);

  const labelModalDefaults = useMemo(() => {
    if (!labelOrder) {
      return null;
    }
    return buildPackageProfile(labelOrder, shippingDefaults, DEFAULT_PACKAGE);
  }, [labelOrder, shippingDefaults]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Shipping"
        description="Review, label, and ship your orders."
      />

      {activeTab === "ready" && (
        <div className="border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700 sm:h-5 sm:w-5" />
            <div className="text-[12px] text-amber-700 sm:text-sm">
              <strong>Automatic tracking:</strong> Once you ship packages, Shippo will
              automatically update tracking status and send customer emails. The "Mark
              shipped" button should only be used if the carrier hasn't scanned the
              package yet.
            </div>
          </div>
        </div>
      )}

      <ShippingTabBar
        activeTab={activeTab}
        counts={counts}
        tabs={TABS.map(({ key, label }) => ({ key, label }))}
        onTabChange={setActiveTab}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-brand-text">
          <span className="text-brand-muted">Origin:</span>{" "}
          {originLine ? originLine : "Not set"}
        </div>
        <button
          type="button"
          onClick={() => setOriginModalOpen(true)}
          className={adminButtonStyles.secondary}
        >
          Change origin address
        </button>
      </div>

      {isLoading ? (
        <AdminEmptyState
          title="Loading Shipping Orders"
          description="Fetching the current queue."
        />
      ) : orders.length === 0 ? (
        <AdminEmptyState title="No Orders In This Queue" />
      ) : (
        <AdminSectionCard>
          <ShippingOrdersTable
            activeTab={activeTab}
            orders={orders}
            expandedItems={expandedItems}
            expandedDetails={expandedDetails}
            markingShippedId={markingShippedId}
            onToggleItems={toggleItems}
            onToggleDetails={toggleDetails}
            onToggleOrderExpansion={toggleOrderExpansion}
            onCreateLabel={setLabelOrder}
            onMarkShipped={setConfirmMarkShipped}
            onViewLabel={viewLabel}
            onOpenItemDetails={(item) => openItemDetails(item as AdminOrderItem)}
            resolveShippingAddress={resolveShippingAddress}
            formatAddress={formatAddress}
            getTrackingUrl={getTrackingUrl}
            formatPlacedAt={formatPlacedAt}
            getCustomerName={getCustomerName}
            getPrimaryImage={getPrimaryImage}
          />
        </AdminSectionCard>
      )}

      <ShippingPagination
        activeTab={activeTab}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPageForActiveTab}
      />

      <AdminOrderItemDetailsModal
        open={Boolean(selectedItem)}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
      <CreateLabelForm
        open={!!labelOrder}
        order={labelOrder}
        originLine={originLine}
        initialPackage={
          labelModalDefaults
            ? {
                weight: labelModalDefaults.weight,
                length: labelModalDefaults.length,
                width: labelModalDefaults.width,
                height: labelModalDefaults.height,
              }
            : null
        }
        onClose={() => setLabelOrder(null)}
        onSuccess={handleLabelSuccess}
      />

      <ConfirmDialog
        isOpen={!!confirmMarkShipped}
        title="Mark as shipped manually?"
        description="Important: This should only be used if the carrier hasn't scanned the package yet. Normally, Shippo automatically updates tracking status and sends customer emails when the carrier scans the package. Using this button will manually update the status without waiting for carrier confirmation."
        confirmLabel="Mark shipped anyway"
        onConfirm={() => {
          if (confirmMarkShipped) {
            void handleMarkShipped(confirmMarkShipped).finally(() =>
              setConfirmMarkShipped(null),
            );
          }
        }}
        onCancel={() => setConfirmMarkShipped(null)}
      />

      <OriginModal
        open={originModalOpen}
        originAddress={originAddress}
        emptyOrigin={EMPTY_ORIGIN}
        originError={originError}
        originMessage={originMessage}
        originFieldErrors={originFieldErrors}
        savingOrigin={savingOrigin}
        onClose={() => setOriginModalOpen(false)}
        onChange={handleOriginChange}
        onSave={() => {
          void handleSaveOrigin(() => setOriginModalOpen(false));
        }}
      />
    </div>
  );
}
