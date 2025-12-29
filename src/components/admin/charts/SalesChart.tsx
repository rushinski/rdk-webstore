// src/components/admin/charts/SalesChart.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatDay = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildZeroData = () => {
  const today = new Date();
  const days: Array<{ date: string; revenue: number }> = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ date: d.toISOString(), revenue: 0 });
  }
  return days;
};

export function SalesChart({ data }: { data?: Array<{ date: string; revenue: number }> }) {
  const resolvedData = data && data.length > 0 ? data : buildZeroData();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={resolvedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" stroke="#999" tickFormatter={formatDay} />
        <YAxis stroke="#999" allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111', border: '1px solid #dc2626' }}
          labelStyle={{ color: '#fff' }}
          labelFormatter={(value) => formatDay(String(value))}
        />
        <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
