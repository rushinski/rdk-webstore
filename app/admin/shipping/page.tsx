// app/admin/shipping/page.tsx
'use client';

import { Fragment, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { logError } from '@/lib/log';
import { CreateLabelForm } from '@/components/admin/shipping/CreateLabelForm';

type ShippingAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

type TabKey = 'label' | 'ready' | 'shipped' | 'delivered';

const PAGE_SIZE = 8;

const TABS: Array<{ key: TabKey; label: string; status: string }> = [
  { key: 'label', label: 'Review & Create Label', status: 'unfulfilled' },
  { key: 'ready', label: 'Need to Ship', status: 'ready_to_ship' },
  { key: 'shipped', label: 'Shipped', status: 'shipped' },
  { key: 'delivered', label: 'Delivered', status: 'delivered' },
];

const STATUS_LABELS: Record<string, string> = {
  unfulfilled: 'Review & Create Label',
  ready_to_ship: 'Need to Ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const getTrackingUrl = (carrier?: string | null, trackingNumber?: string | null) => {
  if (!trackingNumber) return null;
  const normalized = (carrier ?? '').toLowerCase();
  const encodedTracking = encodeURIComponent(trackingNumber);

  if (normalized.includes('ups')) {
    return `https://www.ups.com/track?loc=en_US&tracknum=${encodedTracking}`;
  }
  if (normalized.includes('usps')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodedTracking}`;
  }
  if (normalized.includes('fedex') || normalized.includes('fed ex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodedTracking}`;
  }
  if (normalized.includes('dhl')) {
    return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodedTracking}`;
  }

  return null;
};

const resolveShippingAddress = (value: unknown): ShippingAddress | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (value[0] ?? null) as ShippingAddress | null;
  }
  if (typeof value === 'object') {
    return value as ShippingAddress;
  }
  return null;
};

const formatAddress = (address: ShippingAddress | null) => {
  if (!address) return null;
  const clean = (value?: string | null) => (value ?? '').trim();
  const line1 = [clean(address.line1), clean(address.line2)].filter(Boolean).join(', ');
  const line2 = [clean(address.city), clean(address.state), clean(address.postal_code)]
    .filter(Boolean)
    .join(', ');
  const parts = [clean(address.name), line1, line2, clean(address.country)].filter(Boolean);
  return parts.join(' - ');
};

const formatPlacedAt = (value?: string | null) => {
  if (!value) return { date: '-', time: '' };
  const date = new Date(value);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const getCustomerHandle = (order: any) => {
  const email = order.customer?.email ?? null;
  if (email && email.includes('@')) {
    return email.split('@')[0];
  }
  const address = resolveShippingAddress(order.shipping);
  const name = address?.name?.trim();
  if (name) return name.split(' ')[0];
  return order.user_id ? order.user_id.slice(0, 6) : 'Guest';
};

const getPrimaryImage = (item: any) => {
  const images = item.product?.images ?? [];
  const primary = images.find((img: any) => img.is_primary) ?? images[0];
  return primary?.url ?? '/images/boxes.png';
};

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('label');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
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

  const currentPage = pageByTab[activeTab];
  const activeCount = counts[activeTab] ?? 0;
  const totalPages = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const results = await Promise.all(
          TABS.map(async (tab) => {
            const params = new URLSearchParams({
              fulfillment: 'ship',
              fulfillmentStatus: tab.status,
              limit: '1',
              page: '1',
            });
            const response = await fetch(`/api/admin/orders?${params.toString()}`);
            const data = await response.json();
            return { key: tab.key, count: Number(data.count ?? 0) };
          })
        );

        const nextCounts = { ...counts };
        results.forEach((result) => {
          nextCounts[result.key] = result.count;
        });
        setCounts(nextCounts);
      } catch (error) {
        logError(error, { layer: 'frontend', event: 'admin_load_shipping_counts' });
      }
    };

    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setSelectedOrderId(null);
      try {
        const tab = TABS.find((entry) => entry.key === activeTab) ?? TABS[0];
        const params = new URLSearchParams({
          fulfillment: 'ship',
          fulfillmentStatus: tab.status,
          limit: String(PAGE_SIZE),
          page: String(currentPage),
        });
        const response = await fetch(`/api/admin/orders?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }
        const data = await response.json();
        setOrders(data.orders || []);
        if (typeof data.count === 'number') {
          setCounts((prev) => ({ ...prev, [activeTab]: data.count }));
        }
      } catch (error) {
        logError(error, { layer: 'frontend', event: 'admin_load_shipping_orders' });
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

  const toggleOrder = (orderId: string) => {
    if (activeTab !== 'label') return;
    setSelectedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const toggleItems = (orderId: string) => {
    setExpandedItems((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleMarkShipped = async (order: any) => {
    setMarkingShippedId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: order.shipping_carrier ?? null,
          trackingNumber: order.tracking_number ?? null,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark as shipped');
      }
      setRefreshToken((token) => token + 1);
    } catch (error) {
      logError(error, { layer: 'frontend', event: 'admin_mark_shipped' });
    } finally {
      setMarkingShippedId(null);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

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
            setPageByTab((prev) => ({ ...prev, [activeTab]: Math.max(1, currentPage - 1) }))
          }
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300 disabled:text-zinc-600 disabled:border-zinc-900"
        >
          Previous
        </button>

        {start > 1 && (
          <button
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }))}
            className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300"
          >
            1
          </button>
        )}
        {start > 2 && <span className="text-gray-500">...</span>}

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: page }))}
            className={`px-3 py-2 rounded-sm border text-sm ${
              page === currentPage
                ? 'border-red-600 text-white'
                : 'border-zinc-800/70 text-gray-300'
            }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages - 1 && <span className="text-gray-500">...</span>}
        {end < totalPages && (
          <button
            type="button"
            onClick={() => setPageByTab((prev) => ({ ...prev, [activeTab]: totalPages }))}
            className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300"
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
          className="px-3 py-2 rounded-sm border border-zinc-800/70 text-sm text-gray-300 disabled:text-zinc-600 disabled:border-zinc-900"
        >
          Next
        </button>
      </div>
    );
  };

  const renderOrderCard = (order: any) => {
    const itemCount = (order.items ?? []).reduce(
      (sum: number, item: any) => sum + Number(item.quantity ?? 0),
      0
    );
    const address = resolveShippingAddress(order.shipping);
    const addressLine = formatAddress(address);
    const trackingUrl = getTrackingUrl(order.shipping_carrier, order.tracking_number);
    const placedAt = formatPlacedAt(order.created_at);
    const customerHandle = getCustomerHandle(order);
    const isExpanded = selectedOrderId === order.id;
    const itemsExpanded = expandedItems[order.id] ?? false;
    const status = order.fulfillment_status ?? 'unfulfilled';
    const statusLabel = STATUS_LABELS[status] ?? status;

    return (
      <Fragment key={order.id}>
        <div className="rounded-sm border border-zinc-800/70 bg-zinc-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="text-white font-semibold">#{order.id.slice(0, 8)}</div>
              <div className="text-zinc-400">{customerHandle}</div>
              <div className="text-zinc-500">
                {placedAt.date}
                {placedAt.time ? ` - ${placedAt.time}` : ''}
              </div>
              <div className="text-zinc-400">{statusLabel}</div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {activeTab === 'label' && (
                <button
                  onClick={() => toggleOrder(order.id)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  {isExpanded ? 'Close' : 'Create Label'}
                </button>
              )}
              {activeTab === 'ready' && (
                <button
                  onClick={() => handleMarkShipped(order)}
                  disabled={markingShippedId === order.id}
                  className="text-sm text-red-400 hover:text-red-300 disabled:text-zinc-600"
                >
                  {markingShippedId === order.id ? 'Marking...' : 'Mark shipped'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="min-w-[220px] flex-1 text-zinc-400">
              <span className="text-zinc-500">Destination:</span>{' '}
              {addressLine ? (
                <span className="text-zinc-200">{addressLine}</span>
              ) : (
                <span className="text-red-400">Missing shipping address</span>
              )}
            </div>
            <div className="text-zinc-400">
              <span className="text-zinc-500">Tracking:</span>{' '}
              {order.tracking_number ? (
                trackingUrl ? (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300"
                  >
                    {order.tracking_number}
                  </a>
                ) : (
                  <span className="text-zinc-300">{order.tracking_number}</span>
                )
              ) : (
                <span className="text-zinc-500">No label yet</span>
              )}
            </div>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => toggleItems(order.id)}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
            >
              <span>{itemsExpanded ? 'Hide items' : `View items (${itemCount})`}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${itemsExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {itemsExpanded && (
            <div className="mt-3 space-y-3">
              {(order.items ?? []).map((item: any) => {
                const imageUrl = getPrimaryImage(item);
                const title =
                  (item.product?.title_display ??
                    `${item.product?.brand ?? ''} ${item.product?.name ?? ''}`.trim()) ||
                  'Item';
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-10 w-10 object-cover border border-zinc-800/70 bg-black"
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{title}</div>
                      <div className="text-xs text-zinc-500">
                        Size {item.variant?.size_label ?? 'N/A'} - Qty {item.quantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {activeTab === 'label' && isExpanded && (
          <div className="mt-4 rounded-sm border border-zinc-800/70 bg-zinc-950 p-5">
            <CreateLabelForm
              order={order}
              onSuccess={() => setRefreshToken((t) => t + 1)}
            />
          </div>
        )}
      </Fragment>
    );
  };

  const tabBadge = (count: number) => {
    if (count > 99) return '99+';
    return String(count);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Shipping</h1>
        <p className="text-gray-400">Review, label, and ship your orders.</p>
      </div>

      <div className="border-b border-zinc-800/70 flex flex-wrap gap-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-red-600'
                : 'text-gray-400 hover:text-white border-b-2 border-transparent'
            }`}
          >
            {tab.label}
            <span className="text-[11px] px-2 py-0.5 rounded-sm bg-zinc-900 border border-zinc-800/70 text-gray-300">
              {tabBadge(counts[tab.key] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-sm border border-zinc-800/70 bg-zinc-900 p-6 text-sm text-zinc-500">
          No orders in this queue.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => renderOrderCard(order))}
        </div>
      )}

      {renderPagination()}
    </div>
  );
}
