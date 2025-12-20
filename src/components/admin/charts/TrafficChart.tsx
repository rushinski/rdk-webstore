// src/components/admin/charts/TrafficChart.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { day: 'Mon', visits: 340 },
  { day: 'Tue', visits: 420 },
  { day: 'Wed', visits: 380 },
  { day: 'Thu', visits: 510 },
  { day: 'Fri', visits: 620 },
  { day: 'Sat', visits: 780 },
  { day: 'Sun', visits: 690 },
];

export function TrafficChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={mockData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="day" stroke="#999" />
        <YAxis stroke="#999" />
        <Tooltip
          contentStyle={{ backgroundColor: '#111', border: '1px solid #dc2626' }}
          labelStyle={{ color: '#fff' }}
        />
        <Bar dataKey="visits" fill="#dc2626" />
      </BarChart>
    </ResponsiveContainer>
  );
}