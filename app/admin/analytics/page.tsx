'use client';

import { useEffect, useState } from 'react';
import { SalesChart } from '@/components/admin/charts/SalesChart';
import { TrafficChart } from '@/components/admin/charts/TrafficChart';
import { DollarSign, TrendingUp, Users, Eye } from 'lucide-react';

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, orders: 0 });
  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; revenue: number }>>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch(`/api/admin/analytics?range=${range}`);
        const data = await response.json();
        if (response.ok) {
          setSummary(data.summary || { revenue: 0, profit: 0, orders: 0 });
          setSalesTrend(data.salesTrend || []);
        }
      } catch (error) {
        console.error('Load analytics error:', error);
      }
    };

    loadAnalytics();
  }, [range]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-gray-400">Track your performance and insights</p>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-4">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="bg-zinc-900 text-white px-4 py-2 rounded border border-red-900/20"
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Traffic Section */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-4">Traffic</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Visits</span>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">3,456</div>
            <div className="text-green-400 text-sm mt-2">+8.2% from last week</div>
          </div>

          <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Unique Visitors</span>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">2,134</div>
            <div className="text-green-400 text-sm mt-2">+5.1% from last week</div>
          </div>

          <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Page Views</span>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">12,890</div>
            <div className="text-green-400 text-sm mt-2">+12.3% from last week</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Weekly Traffic</h3>
          <TrafficChart />
        </div>
      </div>

      {/* Financials Section */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-4">Financials</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Revenue</span>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">${summary.revenue.toFixed(2)}</div>
          </div>

          <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Profit</span>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">${summary.profit.toFixed(2)}</div>
          </div>

          <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Orders</span>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">{summary.orders}</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Revenue Trend</h3>
          <SalesChart data={salesTrend} />
        </div>
      </div>
    </div>
  );
}
