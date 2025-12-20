// app/admin/analytics/page.tsx

import { SalesChart } from '@/components/admin/charts/SalesChart';
import { TrafficChart } from '@/components/admin/charts/TrafficChart';
import { DollarSign, TrendingUp, Users, Eye, Lock } from 'lucide-react';

export default function AnalyticsPage() {
  const isFinancialsConnected = false; // Mock state

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-gray-400">Track your performance and insights</p>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-4">
        <select className="bg-zinc-900 text-white px-4 py-2 rounded border border-red-900/20">
          <option>Today</option>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
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

        {!isFinancialsConnected ? (
          <div className="bg-zinc-900 border border-red-900/20 rounded p-12 text-center">
            <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Connect your bank to view financials
            </h3>
            <p className="text-gray-400 mb-6">
              Link your bank account to track revenue, profits, and payouts
            </p>
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded transition">
              Connect Financials
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Revenue</span>
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white">$12,450</div>
                <div className="text-green-400 text-sm mt-2">+15.2% from last week</div>
              </div>

              <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Profit</span>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white">$3,210</div>
                <div className="text-green-400 text-sm mt-2">+22.8% from last week</div>
              </div>

              <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Next Payout</span>
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white">$1,850</div>
                <div className="text-gray-400 text-sm mt-2">In 3 days</div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-red-900/20 rounded p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Revenue Trend</h3>
              <SalesChart />
            </div>
          </>
        )}
      </div>
    </div>
  );
}