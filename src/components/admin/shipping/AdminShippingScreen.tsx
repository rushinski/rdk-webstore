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
import { logError } from "@/lib/utils/log";
import { CreateLabelForm } from "@/components/admin/shipping/CreateLabelForm";
import { OriginModal } from "@/components/admin/shipping/OriginModal";
import { ShippingOrdersTable } from "@/components/admin/shipping/ShippingOrdersTable";
import { ShippingPagination } from "@/components/admin/shipping/ShippingPagination";
import { ShippingTabBar } from "@/components/admin/shipping/ShippingTabBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type {
  ShippingAddress,
  ShippingDefault,
  ShippingOrigin,
  TabKey,
} from "@/types/domain/shipping";
import type {
  ShippingOrder,
  ShippingOrderItem,
} from "@/components/admin/shipping/shippingTypes";

const PAGE_SIZE = 8;
const DEFAULT_PACKAGE = { weight: 16, length: 12, width: 12, height: 12 };
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

const getTrackingUrl = (carrier?: string | null, trackingNumber?: string | null) => {
  if (!trackingNumber) {
    return null;
  }
  const normalized = (carrier ?? "").toLowerCase();
  const encodedTracking = encodeURIComponent(trackingNumber);

  if (normalized.includes("ups")) {
    return `https://www.ups.com/track?loc=en_US&tracknum=${encodedTracking}`;
  }
  if (normalized.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodedTracking}`;
  }
  if (normalized.includes("fedex") || normalized.includes("fed ex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodedTracking}`;
  }
  if (normalized.includes("dhl")) {
    return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodedTracking}`;
  }

  return null;
};

const resolveShippingAddress = (value: unknown): ShippingAddress | null => {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return (value[0] ?? null) as ShippingAddress | null;
  }
  if (typeof value === "object") {
    return value as ShippingAddress;
  }
  return null;
};

const formatAddress = (address: ShippingAddress | null) => {
  if (!address) {
    return null;
  }
  const clean = (value?: string | null) => (value ?? "").trim();
  const line1 = [clean(address.line1), clean(address.line2)].filter(Boolean).join(", ");
  const line2 = [clean(address.city), clean(address.state), clean(address.postal_code)]
    .filter(Boolean)
    .join(", ");
  const parts = [clean(address.name), line1, line2, clean(address.country)].filter(
    Boolean,
  );
  return parts.join(" - ");
};

const formatOriginAddress = (origin: ShippingOrigin | null) => {
  if (!origin) {
    return null;
  }
  const clean = (value?: string | null) => (value ?? "").trim();
  const line1 = [clean(origin.line1), clean(origin.line2)].filter(Boolean).join(", ");
  const line2 = [clean(origin.city), clean(origin.state), clean(origin.postal_code)]
    .filter(Boolean)
    .join(", ");
  const parts = [
    clean(origin.name),
    clean(origin.company),
    line1,
    line2,
    clean(origin.country),
  ].filter(Boolean);
  return parts.join(" - ");
};

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

const formatPlacedAt = (value?: string | null) => {
  if (!value) {
    return { date: "-", time: "" };
  }
  const date = new Date(value);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

const getCustomerName = (order: ShippingOrder) => {
  const address = resolveShippingAddress(order.shipping);
  const name = address?.name?.trim();
  if (name) {
    return name;
  }
  const profileName = (order.shipping_profile_name ?? "").trim();
  return profileName || "-";
};

const getPrimaryImage = (item: OrderItem) => {
  const images = item.product?.images ?? [];
  const primary = images.find((img) => img.is_primary) ?? images[0];
  return primary?.url ?? "/images/rdk-logo.png";
};

export function AdminShippingScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("label");
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [shippingDefaults, setShippingDefaults] = useState<
    Record<string, ShippingDefault>
  >({});
  const [pageByTab, setPageByTab] = useState<Record<TabKey, number>>({
    label: 1,
    ready: 1,
    shipped: 1,
    delivered: 1,
  });
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    label: 0,
    ready: 0,
    shipped: 0,
    delivered: 0,
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [markingShippedId, setMarkingShippedId] = useState<string | null>(null);
  const [confirmMarkShipped, setConfirmMarkShipped] = useState<ShippingOrder | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [originAddress, setOriginAddress] = useState<ShippingOrigin | null>(null);
  const [originModalOpen, setOriginModalOpen] = useState(false);
  const [originMessage, setOriginMessage] = useState("");
  const [originError, setOriginError] = useState("");
  const [originFieldErrors, setOriginFieldErrors] = useState<OriginErrors>({});
  const [savingOrigin, setSavingOrigin] = useState(false);

  const [labelOrder, setLabelOrder] = useState<ShippingOrder | null>(null);

  const currentPage = pageByTab[activeTab];
  const activeCount = counts[activeTab] ?? 0;
  const totalPages = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));

  const loadShippingDefaults = async () => {
    try {
      const response = await fetch("/api/admin/shipping/defaults", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load shipping defaults");
      }
      const data = await response.json();
      const defaultsMap: Record<string, ShippingDefault> = {};
      (data.defaults ?? []).forEach((entry: ShippingDefault) => {
        defaultsMap[entry.category] = entry;
      });
      setShippingDefaults(defaultsMap);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_shipping_defaults" });
    }
  };

  const loadOriginAddress = async () => {
    try {
      const response = await fetch("/api/admin/shipping/origin", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load shipping origin");
      }
      const data = await response.json();
      setOriginAddress(data.origin ?? null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_load_shipping_origin" });
      setOriginAddress(null);
    }
  };

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const results = await Promise.all(
          TABS.map(async (tab) => {
            const params = new URLSearchParams({
              fulfillment: "ship",
              fulfillmentStatus: tab.status,
              limit: "1",
              page: "1",
            });
            SHIPPING_ORDER_STATUSES.forEach((status) => params.append("status", status));
            const response = await fetch(`/api/admin/orders?${params.toString()}`);
            const data = await response.json();
            return { key: tab.key, count: Number(data.count ?? 0) };
          }),
        );

        const nextCounts = { ...counts };
        results.forEach((result) => {
          nextCounts[result.key] = result.count;
        });
        setCounts(nextCounts);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_shipping_counts" });
      }
    };

    loadCounts();
  }, [refreshToken]);

  useEffect(() => {
    loadShippingDefaults();
    loadOriginAddress();
  }, []);

  useEffect(() => {
    if (!originModalOpen) {
      return;
    }
    setOriginError("");
    setOriginMessage("");
    setOriginFieldErrors({});
    loadOriginAddress();
  }, [originModalOpen]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const tab = TABS.find((entry) => entry.key === activeTab) ?? TABS[0];
        const params = new URLSearchParams({
          fulfillment: "ship",
          fulfillmentStatus: tab.status,
          limit: String(PAGE_SIZE),
          page: String(currentPage),
        });
        SHIPPING_ORDER_STATUSES.forEach((status) => params.append("status", status));
        const response = await fetch(`/api/admin/orders?${params.toString()}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch orders: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        setOrders(data.orders || []);
        if (typeof data.count === "number") {
          setCounts((prev) => ({ ...prev, [activeTab]: data.count }));
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_shipping_orders" });
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [activeTab, currentPage, refreshToken]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }));
    }
  }, [currentPage, totalPages, activeTab]);

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

  const getPackageProfile = (order: ShippingOrder) => {
    const items = order.items ?? [];
    if (items.length === 0) {
      return {
        weight: DEFAULT_PACKAGE.weight,
        length: DEFAULT_PACKAGE.length,
        width: DEFAULT_PACKAGE.width,
        height: DEFAULT_PACKAGE.height,
        costCents: 0,
      };
    }

    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    let maxCost = 0;

    items.forEach((item: OrderItem) => {
      const quantity = Math.max(1, Number(item.quantity ?? 0));
      const category = item.product?.category ?? null;
      const defaults = category ? shippingDefaults[category] : null;
      const weight = Number(defaults?.default_weight_oz ?? DEFAULT_PACKAGE.weight);
      const length = Number(defaults?.default_length_in ?? DEFAULT_PACKAGE.length);
      const width = Number(defaults?.default_width_in ?? DEFAULT_PACKAGE.width);
      const height = Number(defaults?.default_height_in ?? DEFAULT_PACKAGE.height);
      const cost = Number(defaults?.shipping_cost_cents ?? 0);

      totalWeight += weight * quantity;
      maxLength = Math.max(maxLength, length);
      maxWidth = Math.max(maxWidth, width);
      maxHeight = Math.max(maxHeight, height);
      maxCost = Math.max(maxCost, cost);
    });

    return {
      weight: totalWeight > 0 ? totalWeight : DEFAULT_PACKAGE.weight,
      length: maxLength > 0 ? maxLength : DEFAULT_PACKAGE.length,
      width: maxWidth > 0 ? maxWidth : DEFAULT_PACKAGE.width,
      height: maxHeight > 0 ? maxHeight : DEFAULT_PACKAGE.height,
      costCents: maxCost,
    };
  };

  const handleMarkShipped = async (order: ShippingOrder) => {
    setMarkingShippedId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier: order.shipping_carrier ?? null,
          trackingNumber: order.tracking_number ?? null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to mark as shipped");
      }
      setRefreshToken((token) => token + 1);
      setConfirmMarkShipped(null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_mark_shipped" });
    } finally {
      setMarkingShippedId(null);
    }
  };

  const handleOriginChange = (field: keyof ShippingOrigin, value: string) => {
    setOriginAddress((prev) => ({ ...(prev ?? EMPTY_ORIGIN), [field]: value }));
    if (originFieldErrors[field]) {
      setOriginFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (originError) {
      setOriginError("");
    }
  };

  const handleSaveOrigin = async () => {
    const payload = originAddress ?? EMPTY_ORIGIN;
    setSavingOrigin(true);
    setOriginError("");
    setOriginMessage("");
    setOriginFieldErrors({});

    const validationErrors = validateOrigin(payload);
    if (Object.keys(validationErrors).length > 0) {
      setOriginFieldErrors(validationErrors);
      setOriginError("Please fix the highlighted fields.");
      setSavingOrigin(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/shipping/origin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fieldErrors = extractOriginErrors(data?.issues);
        if (Object.keys(fieldErrors).length > 0) {
          setOriginFieldErrors(fieldErrors);
          setOriginError("Please fix the highlighted fields.");
          return;
        }
        throw new Error(data?.error || "Failed to save origin");
      }
      setOriginAddress(data.origin ?? payload);
      setOriginMessage("Origin address updated.");
      setOriginModalOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save origin.";
      setOriginError(message);
    } finally {
      setSavingOrigin(false);
    }
  };

  const handleLabelSuccess = () => {
    setLabelOrder(null);
    setRefreshToken((t) => t + 1);
    // Optionally switch to "Need to Ship" tab
    setActiveTab("ready");
  };

  const viewLabel = (order: ShippingOrder) => {
    // Get label URL - you'll need to add this to your order model
    const labelUrl = order.label_url ?? null;
    if (labelUrl) {
      window.open(labelUrl, "_blank", "noopener,noreferrer");
    }
  };

  const originLine = formatOriginAddress(originAddress);

  const labelModalDefaults = useMemo(() => {
    if (!labelOrder) {
      return null;
    }
    return getPackageProfile(labelOrder);
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
        onPageChange={(page) =>
          setPageByTab((prev) => ({
            ...prev,
            [activeTab]: page,
          }))
        }
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
            void handleMarkShipped(confirmMarkShipped);
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
          void handleSaveOrigin();
        }}
      />
    </div>
  );
}
