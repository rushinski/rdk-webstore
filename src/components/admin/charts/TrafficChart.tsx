// src/components/admin/charts/TrafficChart.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatDay = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function TrafficChart({ data }: { data: Array<{ date: string; visits: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
        No traffic data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" stroke="#999" tickFormatter={formatDay} />
        <YAxis stroke="#999" allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111', border: '1px solid #dc2626' }}
          labelStyle={{ color: '#fff' }}
          labelFormatter={(value) => formatDay(String(value))}
        />
        <Bar dataKey="visits" fill="#dc2626" />
      </BarChart>
    </ResponsiveContainer>
  );
}
