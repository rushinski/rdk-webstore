'use client';

import { useEffect, useState } from 'react';
import { logError } from '@/lib/log';
import { SalesChart } from '@/components/admin/charts/SalesChart';
import { TrafficChart } from '@/components/admin/charts/TrafficChart';
import { DollarSign, TrendingUp, Users, Eye } from 'lucide-react';

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, orders: 0 });
  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; revenue: number }>>([]);
  const [trafficSummary, setTrafficSummary] = useState({
    visits: 0,
    uniqueVisitors: 0,
    pageViews: 0,
  });
  const [trafficTrend, setTrafficTrend] = useState<Array<{ date: string; visits: number }>>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch(`/api/admin/analytics?range=${range}`);
        const data = await response.json();
        if (response.ok) {
          setSummary(data.summary || { revenue: 0, profit: 0, orders: 0 });
          setSalesTrend(data.salesTrend || []);
          setTrafficSummary(
            data.trafficSummary || { visits: 0, uniqueVisitors: 0, pageViews: 0 }
          );
          setTrafficTrend(data.trafficTrend || []);
        }
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_analytics" });
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
          className="bg-zinc-900 text-white px-4 py-2 rounded border border-zinc-800/70"
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
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Visits</span>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">{trafficSummary.visits}</div>
            <div className="text-gray-500 text-sm mt-2">
              {range === 'today' ? 'Today' : `Last ${range.replace('d', '')} days`}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Unique Visitors</span>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">{trafficSummary.uniqueVisitors}</div>
            <div className="text-gray-500 text-sm mt-2">
              {range === 'today' ? 'Today' : `Last ${range.replace('d', '')} days`}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Page Views</span>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">{trafficSummary.pageViews}</div>
            <div className="text-gray-500 text-sm mt-2">
              {range === 'today' ? 'Today' : `Last ${range.replace('d', '')} days`}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Daily Traffic</h3>
          <TrafficChart data={trafficTrend} />
        </div>
      </div>

      {/* Financials Section */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-4">Financials</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Revenue</span>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">${summary.revenue.toFixed(2)}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Profit</span>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">${summary.profit.toFixed(2)}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Orders</span>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-white">{summary.orders}</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Revenue Trend</h3>
          <SalesChart data={salesTrend} />
        </div>
      </div>
    </div>
  );
}
