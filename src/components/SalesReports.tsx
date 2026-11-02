import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Order } from '../types';

interface ReportsProps {
  orders: Order[];
}

export const SalesReports: React.FC<ReportsProps> = ({ orders }) => {
  const chartData = useMemo(() => {
    const dataMap: Record<string, { month: string; sales: number; ordersCount: number }> = {};
    
    orders.forEach(order => {
      if (order.status !== 'completed') return;
      const date = new Date(order.createdAt);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!dataMap[monthYear]) {
        dataMap[monthYear] = { month: monthYear, sales: 0, ordersCount: 0 };
      }
      
      const totalOrderValue = order.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
      dataMap[monthYear].sales += totalOrderValue;
      dataMap[monthYear].ordersCount += 1;
    });

    return Object.values(dataMap).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-900 mb-4">نمو المبيعات الشهرية</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="sales" stroke="#0f766e" fill="#ccfbf1" name="المبيعات" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-900 mb-4">نشاط الطلبيات</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="ordersCount" fill="#0ea5e9" name="عدد الطلبيات" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
