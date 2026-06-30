// app/admin/shipping/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, AlertCircle } from "lucide-react";

import {
  AdminOrderItemDetailsModal,
  getOrderItemFinancials,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { logError } from "@/lib/utils/log";
import { CreateLabelForm } from "@/components/admin/shipping/CreateLabelForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import { OriginModal } from "../../../src/components/admin/shipping/OriginModal";
import type {
  ShippingAddress,
  ShippingDefault,
  ShippingOrigin,
  TabKey,
} from "../../../src/types/domain/shipping";

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

type OrderItem = AdminOrderItem;

type ShippingOrder = {
  id: string;
  created_at?: string | null;
  shipping?: unknown;
  user_id?: string | null;
  shipping_profile_name?: string | null;
  items?: OrderItem[] | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  label_url?: string | null;
};

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

const paginationButtonStyles =
  "border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page disabled:cursor-not-allowed disabled:text-brand-muted";

const paginationCurrentStyles =
  "border border-brand-text bg-brand-text px-3 py-2 text-sm text-brand-page";

const tabButtonBase =
  "flex items-center gap-1 whitespace-nowrap border-b-2 py-2.5 text-[10px] font-medium transition-colors sm:gap-2 sm:text-sm";

const tabActiveStyles = "border-brand-text text-brand-text";
const tabInactiveStyles = "border-transparent text-brand-muted hover:text-brand-text";
const tabCountStyles =
  "border border-brand-border bg-brand-page px-1 py-0.5 text-[9px] text-brand-text sm:px-2 sm:text-[11px]";

const tableShellStyles =
  "overflow-x-hidden overflow-y-visible border border-brand-border bg-brand-surface md:overflow-x-auto";

const tableHeaderCellStyles =
  "sticky top-0 z-10 bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

const rowStyles =
  "cursor-pointer border-b border-brand-border transition hover:bg-brand-page";
const mutedCellStyles = "p-3 text-brand-muted sm:p-4";
const strongCellStyles = "p-3 text-brand-text sm:p-4";
const actionLinkStyles = "text-sm text-brand-text transition hover:text-black";
const subtleActionLinkStyles =
  "text-sm text-brand-muted transition hover:text-brand-text";
const itemLabelStyles = "mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted";
const refundedPanelStyles = "border border-red-200 bg-red-50";
const refundedBadgeStyles =
  "inline-flex items-center border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700";

export default function ShippingPage() {
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

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setPageByTab((prev) => ({
              ...prev,
              [activeTab]: Math.max(1, currentPage - 1),
            }))
          }
          disabled={currentPage === 1}
          className={paginationButtonStyles}
        >
          Previous
        </button>

        {start > 1 && (
          <button
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }))}
            className={paginationButtonStyles}
          >
            1
          </button>
        )}
        {start > 2 && <span className="text-brand-muted">...</span>}

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: page }))}
            className={`${
              page === currentPage ? paginationCurrentStyles : paginationButtonStyles
            }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages - 1 && <span className="text-brand-muted">...</span>}
        {end < totalPages && (
          <button
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }))}
            className={paginationButtonStyles}
          >
            {totalPages}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            setPageByTab((prev) => ({
              ...prev,
              [activeTab]: Math.min(totalPages, currentPage + 1),
            }))
          }
          disabled={currentPage === totalPages}
          className={paginationButtonStyles}
        >
          Next
        </button>
      </div>
    );
  };

  const renderOrderRow = (order: ShippingOrder) => {
    const itemCount = (order.items ?? []).reduce(
      (sum: number, item: OrderItem) => sum + Number(item.quantity ?? 0),
      0,
    );
    const address = resolveShippingAddress(order.shipping);
    const addressLine = formatAddress(address);
    const trackingUrl = getTrackingUrl(order.shipping_carrier, order.tracking_number);
    const placedAt = formatPlacedAt(order.created_at);
    const customerName = getCustomerName(order);
    const itemsExpanded = expandedItems[order.id] ?? false;
    const detailsExpanded = expandedDetails[order.id] ?? false;
    const colSpan = 8;
    const labelUrl = order.label_url ?? null;

    const actionNode =
      activeTab === "label" ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setLabelOrder(order);
          }}
          className={actionLinkStyles}
        >
          Create label
        </button>
      ) : activeTab === "ready" ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setConfirmMarkShipped(order);
          }}
          disabled={markingShippedId === order.id}
          className={`${subtleActionLinkStyles} disabled:text-brand-muted`}
        >
          {markingShippedId === order.id ? "Marking..." : "Mark shipped"}
        </button>
      ) : (
        <span className="text-brand-muted">-</span>
      );

    return (
      <Fragment key={order.id}>
        <tr onClick={() => toggleOrderExpansion(order.id)} className={rowStyles}>
          <td className={mutedCellStyles}>
            {placedAt.date !== "-" ? (
              <div className="space-y-1">
                <div>{placedAt.date}</div>
                {placedAt.time && (
                  <div className="text-xs text-brand-muted">{placedAt.time}</div>
                )}
              </div>
            ) : (
              "-"
            )}
          </td>
          <td className={strongCellStyles}>#{order.id.slice(0, 8)}</td>
          <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
            {customerName}
          </td>
          <td className="hidden max-w-[320px] truncate p-3 text-brand-muted sm:p-4 md:table-cell">
            {addressLine ? (
              addressLine
            ) : (
              <span className="text-red-700">Missing address</span>
            )}
          </td>

          {/* SWAPPED: Tracking column now comes before Label */}
          <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
            {order.tracking_number ? (
              <div className="space-y-1">
                {trackingUrl ? (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="flex items-center gap-1 text-brand-text transition hover:text-black"
                  >
                    {order.tracking_number}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-brand-text">{order.tracking_number}</span>
                )}
              </div>
            ) : (
              <span className="text-brand-muted">No tracking yet</span>
            )}
          </td>

          <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
            {labelUrl ? (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  viewLabel(order);
                }}
                className={actionLinkStyles}
              >
                Print Label
              </button>
            ) : (
              <span className="text-brand-muted">No label yet</span>
            )}
          </td>

          <td className="p-3 sm:p-4 text-left md:text-right">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleItems(order.id);
              }}
              className="hidden items-center gap-2 text-sm text-brand-text transition hover:text-black md:inline-flex"
            >
              {itemsExpanded ? "Hide items" : `View items (${itemCount})`}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${itemsExpanded ? "rotate-180" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleDetails(order.id);
              }}
              className="inline-flex w-full items-center justify-start gap-1 whitespace-nowrap text-[12px] leading-none text-brand-text transition hover:text-black md:hidden"
            >
              {detailsExpanded ? "Hide label info" : "Label info"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${detailsExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </td>
          <td className="hidden md:table-cell p-3 sm:p-4 text-right">{actionNode}</td>
        </tr>

        {itemsExpanded && (
          <tr className="hidden bg-brand-page md:table-row">
            <td colSpan={colSpan} className="border-b border-brand-border p-0">
              <div className="flex flex-col">
                {(order.items ?? []).map((item: OrderItem) => {
                  const imageUrl = getPrimaryImage(item);
                  const title = item.product_name ?? item.product?.name ?? "Item";
                  const itemFinancials = getOrderItemFinancials(item);
                  const isPositive = itemFinancials.unitProfit >= 0;
                  const isRefunded = Boolean(item.refunded_at);

                  return (
                    <div
                      key={item.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        openItemDetails(item);
                      }}
                      className={`group relative cursor-pointer px-6 py-4 transition-colors ${
                        isRefunded ? refundedPanelStyles : "hover:bg-brand-surface"
                      }`}
                    >
                      {isRefunded && (
                        <span className="absolute inset-y-0 left-0 w-1 bg-red-300" />
                      )}
                      <div
                        className={`flex items-center justify-start gap-8 ${
                          isRefunded ? "opacity-60" : ""
                        }`}
                      >
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden border border-brand-border bg-brand-page">
                          <img
                            src={imageUrl}
                            alt={title}
                            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                          />
                        </div>

                        <div className="w-48 flex-shrink-0">
                          <div className={itemLabelStyles}>Product</div>
                          <div
                            className="truncate text-sm font-semibold text-brand-text"
                            title={title}
                          >
                            {title}
                          </div>
                        </div>

                        <div className="w-28 flex-shrink-0">
                          <div className={itemLabelStyles}>Size</div>
                          <div className="text-sm font-medium text-brand-text">
                            {item.variant?.size_label ?? "N/A"}
                          </div>
                        </div>

                        <div className="w-24 flex-shrink-0">
                          <div className={itemLabelStyles}>Qty</div>
                          <div className="text-sm font-medium text-brand-text">
                            {item.quantity}
                          </div>
                        </div>

                        <div className="w-32 flex-shrink-0 text-left">
                          <div className={itemLabelStyles}>Line Total</div>
                          <div className="text-sm font-bold text-brand-text">
                            ${Number(item.line_total ?? 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="w-32 flex-shrink-0 text-left">
                          <div className={itemLabelStyles}>Profit</div>
                          <div
                            className={`text-sm font-bold ${isPositive ? "text-emerald-700" : "text-red-700"}`}
                          >
                            {isPositive ? "+" : "-"}$
                            {Math.abs(itemFinancials.unitProfit).toFixed(2)}
                          </div>
                        </div>

                        <div className="w-20 flex-shrink-0">
                          {isRefunded ? (
                            <AdminStatusBadge tone="danger">Refunded</AdminStatusBadge>
                          ) : (
                            <span className="text-xs font-medium text-brand-text transition-colors group-hover:text-black">
                              Details
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </td>
          </tr>
        )}

        {detailsExpanded && (
          <tr className="border-b border-brand-border bg-brand-page md:hidden">
            <td colSpan={colSpan} className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-brand-muted">Customer</span>
                  <span className="text-brand-text">{customerName}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-brand-muted">Destination</span>
                  <span className="break-words text-brand-text">
                    {addressLine ? addressLine : "Missing address"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-brand-muted">Tracking</span>
                  <span className="text-brand-text">
                    {order.tracking_number ? (
                      trackingUrl ? (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-text transition hover:text-black"
                        >
                          {order.tracking_number}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        order.tracking_number
                      )
                    ) : (
                      <span className="text-brand-muted">No tracking yet</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-brand-muted">Label</span>
                  <span className="text-brand-text">
                    {labelUrl ? (
                      <button
                        onClick={() => viewLabel(order)}
                        className={actionLinkStyles}
                      >
                        Print label
                      </button>
                    ) : (
                      <span className="text-brand-muted">No label yet</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-brand-muted">Action</span>
                  <span className="text-brand-text">{actionNode}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-brand-border pt-4">
                <div className="mb-2 text-[11px] uppercase tracking-wide text-brand-muted">
                  Items
                </div>
                <div className="space-y-2">
                  {(order.items ?? []).map((item: OrderItem) => {
                    const imageUrl = getPrimaryImage(item);
                    const title = item.product_name ?? item.product?.name ?? "Item";
                    const itemFinancials = getOrderItemFinancials(item);
                    const formattedUnitProfit = `${
                      itemFinancials.unitProfit >= 0 ? "+" : "-"
                    }$${Math.abs(itemFinancials.unitProfit).toFixed(2)}`;
                    const isRefunded = Boolean(item.refunded_at);
                    return (
                      <div
                        key={item.id}
                        onClick={() => openItemDetails(item)}
                        className={`relative flex cursor-pointer items-start gap-3 rounded-sm p-2 text-base transition ${
                          isRefunded ? refundedPanelStyles : "hover:bg-brand-surface"
                        }`}
                      >
                        {isRefunded && (
                          <span className="absolute inset-y-0 left-0 w-1 rounded-l-sm bg-red-300" />
                        )}
                        <img
                          src={imageUrl}
                          alt={title}
                          className="h-14 w-14 flex-shrink-0 border border-brand-border bg-brand-page object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-brand-text">{title}</div>
                          <div className="text-sm text-brand-muted">
                            Size {item.size_label ?? item.variant?.size_label ?? "N/A"} -
                            Qty {item.quantity}
                          </div>
                          <div className="mt-0.5 text-sm font-medium text-brand-text">
                            ${Number(item.line_total ?? 0).toFixed(2)}
                          </div>
                          <div className="mt-0.5 text-xs text-brand-muted">
                            Price ${itemFinancials.unitPrice.toFixed(2)} - Profit{" "}
                            <span
                              className={
                                itemFinancials.unitProfit >= 0
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }
                            >
                              {formattedUnitProfit}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openItemDetails(item);
                            }}
                            className="mt-1 text-xs text-brand-text transition hover:text-black"
                          >
                            View more details
                          </button>
                        </div>
                        {isRefunded && (
                          <div className="absolute right-2 top-2">
                            <span className={refundedBadgeStyles}>Refunded</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  const tabBadge = (count: number) => (count > 99 ? "99+" : String(count));
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

      <div className="flex flex-nowrap gap-2 border-b border-brand-border sm:gap-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`${tabButtonBase} ${activeTab === tab.key ? tabActiveStyles : tabInactiveStyles}`}
          >
            {tab.label}
            <span className={tabCountStyles}>{tabBadge(counts[tab.key] ?? 0)}</span>
          </button>
        ))}
      </div>

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
          <div className={tableShellStyles}>
            <table className="w-full text-[12px] sm:text-sm">
              <thead>
                <tr className="bg-brand-page">
                  <th className={tableHeaderCellStyles}>Placed At</th>
                  <th className={tableHeaderCellStyles}>Order</th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Customer
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Destination
                  </th>

                  {/* SWAPPED: Tracking header now before Label */}
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Tracking
                  </th>
                  <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
                    Label
                  </th>

                  <th className={`${tableHeaderCellStyles} md:text-right`}>
                    <span className="hidden md:inline">Items</span>
                    <span className="md:hidden">Actions</span>
                  </th>
                  <th
                    className={`hidden text-right md:table-cell ${tableHeaderCellStyles}`}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>{orders.map((order) => renderOrderRow(order))}</tbody>
            </table>
          </div>
        </AdminSectionCard>
      )}

      {renderPagination()}

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
