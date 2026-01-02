// app/admin/shipping/page.tsx
'use client';

import { Fragment, useEffect, useState } from 'react';
import { logError } from '@/lib/log';
import { CreateLabelForm } from '@/components/admin/shipping/CreateLabelForm';

type FulfillmentStatus = 'unfulfilled' | 'shipped' | 'delivered';

type ShippingAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

const TABS: { key: FulfillmentStatus; label: string }[] = [
  { key: 'unfulfilled', label: 'Need to Ship' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Completed' },
];

const STATUS_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: 'Need to Ship',
  shipped: 'In Transit',
  delivered: 'Completed',
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
  return parts.join(' • ');
};

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState<FulfillmentStatus>('unfulfilled');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setSelectedOrderId(null);
      try {
        const params = new URLSearchParams({
          fulfillmentStatus: activeTab,
          fulfillment: 'ship',
        });
        const response = await fetch(`/api/admin/orders?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (error) {
        logError(error, { layer: 'frontend', event: 'admin_load_shipping_orders' });
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [activeTab, refreshToken]);

  const toggleOrder = (orderId: string) => {
    if (activeTab !== 'unfulfilled') return;
    setSelectedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center py-12 text-gray-400">Loading...</div>;
    }

    if (orders.length === 0) {
      return <div className="text-center py-12 text-gray-400">No orders in this queue.</div>;
    }

    return (
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800/70 bg-zinc-800">
            <th className="text-left text-gray-400 font-semibold p-4">Date</th>
            <th className="text-left text-gray-400 font-semibold p-4">Order</th>
            <th className="text-left text-gray-400 font-semibold p-4">Customer</th>
            <th className="text-left text-gray-400 font-semibold p-4">Items</th>
            <th className="text-left text-gray-400 font-semibold p-4">Destination</th>
            <th className="text-left text-gray-400 font-semibold p-4">Status</th>
            <th className="text-right text-gray-400 font-semibold p-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const itemCount = (order.items ?? []).reduce(
              (sum: number, item: any) => sum + Number(item.quantity ?? 0),
              0
            );
            const address = resolveShippingAddress(order.shipping);
            const addressLine = formatAddress(address);
            const status = (order.fulfillment_status ?? 'unfulfilled') as FulfillmentStatus;
            const trackingUrl = getTrackingUrl(order.shipping_carrier, order.tracking_number);
            const isExpanded = selectedOrderId === order.id;

            return (
              <Fragment key={order.id}>
                <tr className="border-b border-zinc-800/70 hover:bg-zinc-800">
                  <td className="p-4 text-gray-400">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4 text-white">#{order.id.slice(0, 8)}</td>
                  <td className="p-4 text-gray-400">
                    {order.user_id ? order.user_id.slice(0, 6) : 'Guest'}
                  </td>
                  <td className="p-4 text-gray-400">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </td>
                  <td className="p-4 text-gray-400">
                    {addressLine ? (
                      <span className="text-sm">{addressLine}</span>
                    ) : (
                      <span className="text-sm text-gray-500">No address</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-block w-fit px-3 py-1 rounded text-xs font-semibold ${
                          status === 'delivered'
                            ? 'bg-green-900/20 text-green-400'
                            : status === 'shipped'
                              ? 'bg-blue-900/20 text-blue-400'
                              : 'bg-yellow-900/20 text-yellow-400'
                        }`}
                      >
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      {order.tracking_number && (
                        trackingUrl ? (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Tracking {order.tracking_number}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Tracking {order.tracking_number}
                          </span>
                        )
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {activeTab === 'unfulfilled' ? (
                      <button
                        onClick={() => toggleOrder(order.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        {isExpanded ? 'Close' : 'Create Label'}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={7} className="p-4 bg-zinc-950">
                      <CreateLabelForm
                        order={order}
                        onSuccess={() => setRefreshToken((t) => t + 1)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Shipping</h1>
        <p className="text-gray-400">Manage and fulfill your shippable orders.</p>
      </div>

      <div className="border-b border-zinc-800/70 flex space-x-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-red-600'
                : 'text-gray-400 hover:text-white border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
