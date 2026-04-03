// Dashboard page — tenant-scoped inventory overview

'use client';

import { trpc } from '@/lib/trpc.js';

export default function DashboardPage() {
  const { data: summary, isLoading } = trpc.report.inventorySummary.useQuery();

  if (isLoading) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  const cards = [
    { label: 'Total Products', value: summary?.totalProducts ?? 0 },
    { label: 'Active Products', value: summary?.activeProducts ?? 0 },
    { label: 'Low Stock Items', value: summary?.lowStockProducts ?? 0 },
    { label: 'Inventory Value', value: `$${(summary?.inventoryValue ?? 0).toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
