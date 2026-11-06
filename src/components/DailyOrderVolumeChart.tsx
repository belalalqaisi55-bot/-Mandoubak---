import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Order } from '../types';

interface DailyOrderVolumeChartProps {
  orders: Order[];
}

export const DailyOrderVolumeChart: React.FC<DailyOrderVolumeChartProps> = ({ orders }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const days: Record<string, number> = {};

    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days[dateStr] = 0;
    }

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      if (days.hasOwnProperty(orderDate)) {
        days[orderDate] = (days[orderDate] || 0) + 1;
      }
    });

    return Object.entries(days).map(([date, count]) => ({
      date: date.substring(5), // MM-DD
      count
    }));
  }, [orders]);

  return (
    <div className="h-64 w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4">حجم الطلبيات اليومي (آخر 30 يوم)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={10} />
          <YAxis allowDecimals={false} fontSize={10} />
          <Tooltip contentStyle={{ fontSize: '12px' }} />
          <Bar dataKey="count" name="عدد الطلبيات">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.count > 0 ? "#0d9488" : "#e2e8f0"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
