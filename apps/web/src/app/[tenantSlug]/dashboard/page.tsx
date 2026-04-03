// Dashboard page — tenant-scoped inventory overview with charts

'use client';

import { trpc } from '@/lib/trpc';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = trpc.report.inventorySummary.useQuery();
  const { data: movements } = trpc.report.stockMovements.useQuery({ page: 1, limit: 200 });
  const { data: lowStock } = trpc.report.lowStock.useQuery({ page: 1, limit: 10 });

  if (summaryLoading) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  const cards = [
    { label: 'Total Products', value: summary?.totalProducts ?? 0, color: 'text-foreground' },
    { label: 'Active Products', value: summary?.activeProducts ?? 0, color: 'text-foreground' },
    { label: 'Low Stock Items', value: summary?.lowStockProducts ?? 0, color: (summary?.lowStockProducts ?? 0) > 0 ? 'text-red-600' : 'text-foreground' },
    { label: 'Inventory Value', value: `$${(summary?.inventoryValue ?? 0).toLocaleString()}`, color: 'text-foreground' },
  ];

  // Aggregate movements by date for the chart
  const movementsByDate = new Map<string, { date: string; stockIn: number; stockOut: number; adjustment: number }>();
  if (movements?.items !== undefined) {
    for (const m of movements.items) {
      const date = new Date(m.performedAt).toLocaleDateString();
      const existing = movementsByDate.get(date) ?? { date, stockIn: 0, stockOut: 0, adjustment: 0 };
      if (m.movementType === 'stock_in') {
        existing.stockIn += m.quantityDelta;
      } else if (m.movementType === 'stock_out') {
        existing.stockOut += Math.abs(m.quantityDelta);
      } else {
        existing.adjustment += Math.abs(m.quantityDelta);
      }
      movementsByDate.set(date, existing);
    }
  }
  const chartData = Array.from(movementsByDate.values()).reverse().slice(-14);

  const lowStockItems = (lowStock?.items ?? []) as Array<{
    id: string;
    name: string;
    productCode: string;
    currentQuantity: number;
    lowStockThreshold: number;
  }>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <h2 className="mb-3 text-lg font-semibold text-red-800 dark:text-red-200">
            Low Stock Alert ({lowStockItems.length} items)
          </h2>
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-red-900 dark:text-red-100">
                  {item.name}
                  <span className="ml-2 text-xs text-red-600 dark:text-red-400">{item.productCode}</span>
                </span>
                <span className="font-mono text-red-700 dark:text-red-300">
                  {item.currentQuantity} / {item.lowStockThreshold}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-4 text-lg font-semibold">Stock Movements (last 14 days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="stockIn" name="Stock In" fill="#22c55e" />
              <Bar dataKey="stockOut" name="Stock Out" fill="#ef4444" />
              <Bar dataKey="adjustment" name="Adjustment" fill="#eab308" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
