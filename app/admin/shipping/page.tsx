'use client';

import { useEffect, useState } from 'react';

type TrackingInput = { carrier: string; trackingNumber: string };

export default function ShippingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, TrackingInput>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/orders?fulfillment=ship');
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Load shipping orders error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, []);

  const openOrders = orders.filter(
    (order) => order.fulfillment_status !== 'shipped'
  );

  const handleInputChange = (orderId: string, field: keyof TrackingInput, value: string) => {
    setTrackingInputs((prev) => ({
      ...prev,
      [orderId]: {
        carrier: prev[orderId]?.carrier ?? '',
        trackingNumber: prev[orderId]?.trackingNumber ?? '',
        [field]: value,
      },
    }));
  };

  const handleFulfill = async (orderId: string) => {
    const input = trackingInputs[orderId] ?? { carrier: '', trackingNumber: '' };
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: input.carrier,
          trackingNumber: input.trackingNumber,
        }),
      });

      if (response.ok) {
        setMessage('Order marked as shipped.');
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, fulfillment_status: 'shipped' } : order
          )
        );
      } else {
        setMessage('Failed to mark order shipped.');
      }
    } catch (error) {
      setMessage('Failed to mark order shipped.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Shipping</h1>
        <p className="text-gray-400">Manage fulfillment and tracking</p>
      </div>

      {message && <div className="text-gray-400 text-sm">{message}</div>}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : openOrders.length === 0 ? (
        <div className="text-gray-400">No orders awaiting shipment.</div>
      ) : (
        <div className="space-y-4">
          {openOrders.map((order) => {
            const shipping = Array.isArray(order.shipping) ? order.shipping[0] : order.shipping;
            const tracking = trackingInputs[order.id] ?? { carrier: '', trackingNumber: '' };
            return (
              <div key={order.id} className="bg-zinc-900 border border-red-900/20 rounded p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="text-white font-semibold">Order #{order.id.slice(0, 8)}</div>
                  <div className="text-gray-400 text-sm">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="text-sm text-gray-400 mb-2">Shipping Address</h3>
                    {shipping ? (
                      <div className="text-gray-300 text-sm space-y-1">
                        <div>{shipping.name}</div>
                        <div>{shipping.line1}</div>
                        {shipping.line2 && <div>{shipping.line2}</div>}
                        <div>
                          {shipping.city}, {shipping.state} {shipping.postal_code}
                        </div>
                        <div>{shipping.country}</div>
                        {shipping.phone && <div>{shipping.phone}</div>}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No shipping details</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-400 mb-2">Items</h3>
                    <div className="space-y-2 text-sm">
                      {(order.items || []).map((item: any) => (
                        <div key={item.id} className="text-gray-300">
                          {item.product?.title_display ??
                            `${item.product?.brand ?? ""} ${item.product?.name ?? ""}`.trim()}
                          {item.variant?.size_label ? ` (${item.variant.size_label})` : ''} x
                          {item.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Carrier</label>
                    <input
                      type="text"
                      value={tracking.carrier}
                      onChange={(e) => handleInputChange(order.id, 'carrier', e.target.value)}
                      className="w-full bg-zinc-800 text-white px-3 py-2 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Tracking Number</label>
                    <input
                      type="text"
                      value={tracking.trackingNumber}
                      onChange={(e) => handleInputChange(order.id, 'trackingNumber', e.target.value)}
                      className="w-full bg-zinc-800 text-white px-3 py-2 rounded text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleFulfill(order.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition"
                  >
                    Mark Shipped
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
