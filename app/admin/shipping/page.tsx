// app/admin/shipping/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { logError } from '@/lib/log';
import { CreateLabelForm } from '@/components/admin/shipping/CreateLabelForm';

type FulfillmentStatus = 'unfulfilled' | 'shipped' | 'delivered';

const TABS: { key: FulfillmentStatus, label: string }[] = [
  { key: 'unfulfilled', label: 'Need to Ship' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Completed' },
];

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState<FulfillmentStatus>('unfulfilled');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setSelectedOrderId(null); // Close any open forms when tab changes
      try {
        const params = new URLSearchParams({
          fulfillmentStatus: activeTab,
          fulfillment: 'ship', // Only show shippable orders
        });
        const response = await fetch(`/api/admin/orders?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_shipping_orders" });
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [activeTab]);

  const toggleOrder = (orderId: string) => {
    setSelectedOrderId(prev => (prev === orderId ? null : orderId));
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center py-12 text-gray-400">Loading orders...</div>;
    }

    if (orders.length === 0) {
      return <div className="text-center py-12 text-gray-400">No orders found for this status.</div>;
    }

    return (
        <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800/70 bg-zinc-800">
            <th className="text-left text-gray-400 font-semibold p-4">Date</th>
            <th className="text-left text-gray-400 font-semibold p-4">Order</th>
            <th className="text-left text-gray-400 font-semibold p-4">Customer</th>
            <th className="text-left text-gray-400 font-semibold p-4">Tracking</th>
            <th className="text-right text-gray-400 font-semibold p-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <>
                <tr key={order.id} className="border-b border-zinc-800/70 hover:bg-zinc-800">
                <td className="p-4 text-gray-400">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="p-4 text-white">#{order.id.slice(0, 8)}</td>
                <td className="p-4 text-gray-400">{order.shipping?.name ?? 'Guest'}</td>
                <td className="p-4 text-gray-400">{order.tracking_number ?? 'N/A'}</td>
                <td className="p-4 text-right">
                    <button 
                        onClick={() => toggleOrder(order.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                    >
                        {activeTab === 'unfulfilled'
                            ? (selectedOrderId === order.id ? 'Close' : 'Create Label')
                            : 'View Details'
                        }
                    </button>
                </td>
                </tr>
                {selectedOrderId === order.id && (
                    <tr>
                        <td colSpan={5} className="p-4 bg-zinc-950">
                           <CreateLabelForm order={order} />
                        </td>
                    </tr>
                )}
            </>
          ))}
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
                // : 'text-gray-400 hover:text-white'
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