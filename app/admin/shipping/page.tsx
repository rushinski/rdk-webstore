// app/admin/shipping/page.tsx
'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
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
  }, [refreshToken]);

  const { approvalNeeded, labelCreation, needToShip } = useMemo(() => {
    const buckets = {
      approvalNeeded: [] as any[],
      labelCreation: [] as any[],
      needToShip: [] as any[],
    };

    orders.forEach((order) => {
      const address = resolveShippingAddress(order.shipping);
      const addressValid = Boolean(address?.line1 && address?.city && address?.postal_code);
      const hasLabel = Boolean(order.tracking_number);
      const status = (order.fulfillment_status ?? 'unfulfilled') as string;
      const isDelivered = status === 'delivered';

      if (isDelivered) return;

      if (!addressValid) {
        buckets.approvalNeeded.push(order);
      } else if (!hasLabel) {
        buckets.labelCreation.push(order);
      } else {
        buckets.needToShip.push(order);
      }
    });

    return buckets;
  }, [orders]);

  const toggleOrder = (orderId: string) => {
    setSelectedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const renderOrderCard = (order: any, options?: { allowLabel?: boolean }) => {
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

    return (
      <Fragment key={order.id}>
        <div className="rounded-sm border border-zinc-800/70 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-zinc-500 uppercase tracking-widest">Placed At</div>
              <div className="text-white text-sm">{placedAt.date}</div>
              {placedAt.time && <div className="text-xs text-zinc-500">{placedAt.time}</div>}
            </div>
            <div className="space-y-1">
              <div className="text-xs text-zinc-500 uppercase tracking-widest">Order</div>
              <div className="text-white text-sm">#{order.id.slice(0, 8)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-zinc-500 uppercase tracking-widest">Customer</div>
              <div className="text-white text-sm">{customerHandle}</div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-xs text-zinc-500 uppercase tracking-widest">Items</div>
              <div className="text-white text-sm">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Order Items</div>
              <div className="space-y-3">
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
                        className="h-12 w-12 object-cover border border-zinc-800/70 bg-black"
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
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Destination</div>
                {addressLine ? (
                  <div className="text-sm text-zinc-200">{addressLine}</div>
                ) : (
                  <div className="text-sm text-red-400">Missing shipping address</div>
                )}
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Tracking</div>
                {order.tracking_number ? (
                  trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      {order.tracking_number}
                    </a>
                  ) : (
                    <div className="text-sm text-zinc-300">{order.tracking_number}</div>
                  )
                ) : (
                  <div className="text-sm text-zinc-500">No label yet</div>
                )}
              </div>
            </div>
          </div>

          {options?.allowLabel ? (
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => toggleOrder(order.id)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                {isExpanded ? 'Close' : 'Create Label'}
              </button>
            </div>
          ) : null}
        </div>

        {options?.allowLabel && isExpanded && (
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

  const renderSection = (
    title: string,
    subtitle: string,
    ordersList: any[],
    options?: { allowLabel?: boolean }
  ) => {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
          <span className="text-sm text-zinc-400">{ordersList.length} orders</span>
        </div>
        {ordersList.length === 0 ? (
          <div className="rounded-sm border border-zinc-800/70 bg-zinc-900 p-6 text-sm text-zinc-500">
            No orders in this queue.
          </div>
        ) : (
          <div className="space-y-6">
            {ordersList.map((order) => renderOrderCard(order, options))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Shipping</h1>
        <p className="text-gray-400">Review, approve, and ship your orders.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-10">
          {renderSection(
            'Approval Needed',
            'Orders missing shipping details or needing review.',
            approvalNeeded
          )}
          {renderSection(
            'Label Creation',
            'Orders ready for label purchase and packaging.',
            labelCreation,
            { allowLabel: true }
          )}
          {renderSection(
            'Need to Ship',
            'Labels created. Packages ready to hand off.',
            needToShip
          )}
        </div>
      )}
    </div>
  );
}
