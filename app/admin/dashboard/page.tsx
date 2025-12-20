// app/admin/dashboard/page.tsx

import { SalesChart } from '@/components/admin/charts/SalesChart';
import { TrafficChart } from '@/components/admin/charts/TrafficChart';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  // Mock data
  const stats = [
    {
      title: 'Revenue',
      value: '$12,450',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
    },
    {
      title: 'Orders',
      value: '87',
      change: '+8.2%',
      trend: 'up',
      icon: ShoppingCart,
    },
    {
      title: 'Products',
      value: '234',
      change: '+5',
      trend: 'up',
      icon: Package,
    },
    {
      title: 'Visitors',
      value: '3,456',
      change: '-2.1%',
      trend: 'down',
      icon: Users,
    },
  ];

  const recentSales = [
    { id: '1', product: 'Air Jordan 1 High', customer: 'John D.', amount: 220, profit: 45 },
    { id: '2', product: 'Nike Dunk Low', customer: 'Sarah M.', amount: 180, profit: 35 },
    { id: '3', product: 'Yeezy Boost 350', customer: 'Mike R.', amount: 350, profit: 80 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-zinc-900 border border-red-900/20 rounded p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">{stat.title}</span>
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{stat.value}</span>
                <span
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Sales Trend</h2>
          <SalesChart />
        </div>

        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Traffic</h2>
          <TrafficChart />
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Sales</h2>
          <Link href="/admin/sales" className="text-red-500 hover:underline text-sm">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-red-900/20">
                <th className="text-left text-gray-400 font-semibold py-3">Product</th>
                <th className="text-left text-gray-400 font-semibold py-3">Customer</th>
                <th className="text-right text-gray-400 font-semibold py-3">Amount</th>
                <th className="text-right text-gray-400 font-semibold py-3">Profit</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale.id} className="border-b border-red-900/20">
                  <td className="py-3 text-white">{sale.product}</td>
                  <td className="py-3 text-gray-400">{sale.customer}</td>
                  <td className="py-3 text-right text-white">${sale.amount}</td>
                  <td className="py-3 text-right text-green-400">+${sale.profit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}