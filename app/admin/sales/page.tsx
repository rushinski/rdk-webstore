// app/admin/sales/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { MoreVertical, Search } from 'lucide-react';
import { logError } from '@/lib/log';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';

export default function SalesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pendingRefundId, setPendingRefundId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const activeMenus = Array.from(document.querySelectorAll(`[data-menu-id="${openMenuId}"]`));
      if (target && activeMenus.some((menu) => menu.contains(target))) return;
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId]);

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
        logError(error, { layer: "frontend", event: "admin_load_orders" });
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [statusFilter, refreshToken]);

  const getCustomerHandle = (order: any) => {
    const email = order.customer?.email ?? null;
    if (email && email.includes('@')) {
      return email.split('@')[0];
    }
    return order.user_id ? order.user_id.slice(0, 6) : 'Guest';
  };

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

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const handle = getCustomerHandle(order).toLowerCase();
      const createdAt = order.created_at ? new Date(order.created_at) : null;
      const dateString = createdAt ? createdAt.toLocaleDateString().toLowerCase() : '';
      const timeString = createdAt ? createdAt.toLocaleTimeString().toLowerCase() : '';
      const isoString = createdAt ? createdAt.toISOString().slice(0, 10) : '';
      const orderId = order.id ? String(order.id).toLowerCase() : '';

      return (
        handle.includes(query) ||
        dateString.includes(query) ||
        timeString.includes(query) ||
        isoString.includes(query) ||
        orderId.includes(query)
      );
    });
  }, [orders, searchQuery]);

  const requestRefund = (orderId: string) => {
    setOpenMenuId(null);
    setPendingRefundId(orderId);
  };

  const requestSelectedRefund = () => {
    if (!selectedOrderId) return;
    setPendingRefundId(selectedOrderId);
  };

  const confirmRefund = async () => {
    if (!pendingRefundId) return;
    const orderId = pendingRefundId;
    setPendingRefundId(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setToast({ message: 'Order refunded.', tone: 'success' });
        setRefreshToken((prev) => prev + 1);
      } else {
        setToast({ message: 'Refund failed.', tone: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Refund failed.', tone: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales</h1>
          <p className="text-gray-400">Track orders and profit</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={requestSelectedRefund}
            disabled={!selectedOrderId}
            className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-sm text-sm transition"
          >
            Refund selected
          </button>
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

      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/70 px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by date, customer, or order"
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
      </div>

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
                <th className="text-left text-gray-400 font-semibold p-4">
                  <span className="sr-only">Select</span>
                </th>
                <th className="text-left text-gray-400 font-semibold p-4">Placed At</th>
                <th className="text-left text-gray-400 font-semibold p-4">Order</th>
                <th className="text-left text-gray-400 font-semibold p-4">Customer</th>
                <th className="text-right text-gray-400 font-semibold p-4">Amount</th>
                <th className="text-right text-gray-400 font-semibold p-4">Profit</th>
                <th className="text-center text-gray-400 font-semibold p-4">Status</th>
                <th className="text-right text-gray-400 font-semibold p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const itemCost = (order.items || []).reduce((sum: number, item: any) => {
                  const unitCost = Number(item.unit_cost ?? (item.variant?.cost_cents ?? 0) / 100);
                  return sum + unitCost * Number(item.quantity ?? 0);
                }, 0);
                const refundAmount = Number(order.refund_amount ?? 0);
                const profit = Number(order.subtotal ?? 0) - itemCost - refundAmount;
                const status = order.status ?? 'pending';
                const canRefund = status === 'paid' || status === 'shipped';
                const createdAt = order.created_at ? new Date(order.created_at) : null;
                const customerHandle = getCustomerHandle(order);

                return (
                  <tr key={order.id} className="border-b border-zinc-800/70 hover:bg-zinc-800">
                    <td className="p-4">
                      <input
                        type="radio"
                        name="refundOrder"
                        className="rdk-checkbox"
                        checked={selectedOrderId === order.id}
                        onChange={() => setSelectedOrderId(order.id)}
                        aria-label={`Select order ${order.id}`}
                      />
                    </td>
                    <td className="p-4 text-gray-400">
                      {createdAt ? (
                        <div className="space-y-1">
                          <div>{createdAt.toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4 text-white">#{order.id.slice(0, 8)}</td>
                    <td className="p-4 text-gray-400">{customerHandle}</td>
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
                      <div className="relative" data-menu-id={order.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId((prev) => (prev === order.id ? null : order.id))
                          }
                          className="text-gray-400 hover:text-white p-1 cursor-pointer"
                          aria-label="Open actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === order.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-zinc-950 border border-zinc-800/70 shadow-xl z-30">
                            {canRefund ? (
                              <button
                                type="button"
                                onClick={() => requestRefund(order.id)}
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 cursor-pointer"
                              >
                                Refund
                              </button>
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                Refund unavailable
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingRefundId)}
        title="Refund order?"
        description={
          pendingRefundId
            ? `This will refund order #${pendingRefundId.slice(0, 8)} in full.`
            : undefined
        }
        confirmLabel="Refund"
        onConfirm={confirmRefund}
        onCancel={() => setPendingRefundId(null)}
      />
      <Toast
        open={Boolean(toast)}
        message={toast?.message ?? ''}
        tone={toast?.tone ?? 'info'}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
