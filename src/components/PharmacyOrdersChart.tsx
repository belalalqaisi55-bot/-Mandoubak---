import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Order } from '../types';

interface PharmacyOrdersChartProps {
  orders: Order[];
}

export const PharmacyOrdersChart: React.FC<PharmacyOrdersChartProps> = ({ orders }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pharmacyOrders: Record<string, number> = {};

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        const pharmacyName = order.entityName || "صيدلية غير معروفة";
        pharmacyOrders[pharmacyName] = (pharmacyOrders[pharmacyName] || 0) + 1;
      }
    });

    return Object.entries(pharmacyOrders).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  }, [orders]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 text-xs">
        لا توجد طلبيات مسجلة لهذا الشهر.
      </div>
    );
  }

  return (
    <div className="h-64 w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4">عدد الطلبيات لكل صيدلية (الشهر الحالي)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" fontSize={10} />
          <YAxis allowDecimals={false} fontSize={10} />
          <Tooltip contentStyle={{ fontSize: '12px' }} />
          <Bar dataKey="count" fill="#0d9488" name="عدد الطلبيات" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
