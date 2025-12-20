// src/components/admin/charts/SalesChart.tsx

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { date: 'Mon', revenue: 1200 },
  { date: 'Tue', revenue: 1900 },
  { date: 'Wed', revenue: 1600 },
  { date: 'Thu', revenue: 2200 },
  { date: 'Fri', revenue: 2800 },
  { date: 'Sat', revenue: 3400 },
  { date: 'Sun', revenue: 2900 },
];

export function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={mockData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" stroke="#999" />
        <YAxis stroke="#999" />
        <Tooltip
          contentStyle={{ backgroundColor: '#111', border: '1px solid #dc2626' }}
          labelStyle={{ color: '#fff' }}
        />
        <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}