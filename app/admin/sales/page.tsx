'use client';

import { useEffect, useMemo, useState } from 'react';

export default function SalesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        const response = await fetch(`/api/admin/orders?${params.toString()}`);
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Load orders error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [statusFilter, refreshToken]);

  const summary = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let totalSales = 0;

    orders.forEach((order) => {
      if (order.status === 'paid' || order.status === 'shipped' || order.status === 'refunded') {
        totalSales += 1;
      }
      const total = Number(order.total ?? 0);
      const refundAmount = Number(order.refund_amount ?? 0);
      revenue += total - refundAmount;

      const itemCost = (order.items || []).reduce((sum: number, item: any) => {
        const unitCost = Number(item.unit_cost ?? (item.variant?.cost_cents ?? 0) / 100);
        return sum + unitCost * Number(item.quantity ?? 0);
      }, 0);
      profit += Number(order.subtotal ?? 0) - itemCost - refundAmount;
    });

    return { revenue, profit, totalSales };
  }, [orders]);

  const handleRefund = async (orderId: string) => {
    if (!confirm('Refund this order in full?')) return;

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setMessage('Order refunded.');
        setRefreshToken((prev) => prev + 1);
      } else {
        setMessage('Refund failed.');
      }
    } catch (error) {
      setMessage('Refund failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales</h1>
          <p className="text-gray-400">Track orders and profit</p>
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 text-white px-4 py-2 rounded border border-zinc-800/70 text-sm"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {message && <div className="text-gray-400 text-sm">{message}</div>}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <span className="text-gray-400 text-sm">Total Sales</span>
          <div className="text-3xl font-bold text-white mt-2">{summary.totalSales}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <span className="text-gray-400 text-sm">Revenue</span>
          <div className="text-3xl font-bold text-white mt-2">${summary.revenue.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <span className="text-gray-400 text-sm">Profit</span>
          <div className="text-3xl font-bold text-green-400 mt-2">${summary.profit.toFixed(2)}</div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/70 bg-zinc-800">
                <th className="text-left text-gray-400 font-semibold p-4">Date</th>
                <th className="text-left text-gray-400 font-semibold p-4">Order</th>
                <th className="text-left text-gray-400 font-semibold p-4">Customer</th>
                <th className="text-right text-gray-400 font-semibold p-4">Amount</th>
                <th className="text-right text-gray-400 font-semibold p-4">Profit</th>
                <th className="text-center text-gray-400 font-semibold p-4">Status</th>
                <th className="text-right text-gray-400 font-semibold p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const itemCost = (order.items || []).reduce((sum: number, item: any) => {
                  const unitCost = Number(item.unit_cost ?? (item.variant?.cost_cents ?? 0) / 100);
                  return sum + unitCost * Number(item.quantity ?? 0);
                }, 0);
                const refundAmount = Number(order.refund_amount ?? 0);
                const profit = Number(order.subtotal ?? 0) - itemCost - refundAmount;
                const status = order.status ?? 'pending';

                return (
                  <tr key={order.id} className="border-b border-zinc-800/70 hover:bg-zinc-800">
                    <td className="p-4 text-gray-400">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-white">#{order.id.slice(0, 8)}</td>
                    <td className="p-4 text-gray-400">{order.user_id ? order.user_id.slice(0, 6) : 'Guest'}</td>
                    <td className="p-4 text-right text-white">${Number(order.total ?? 0).toFixed(2)}</td>
                    <td className="p-4 text-right text-green-400">+${profit.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                        status === 'paid' || status === 'shipped' ? 'bg-green-900/20 text-green-400' :
                        status === 'pending' ? 'bg-yellow-900/20 text-yellow-400' :
                        'bg-red-900/20 text-red-400'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {(status === 'paid' || status === 'shipped') && (
                        <button
                          onClick={() => handleRefund(order.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
