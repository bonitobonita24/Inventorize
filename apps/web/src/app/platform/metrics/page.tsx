// Platform metrics page — cross-tenant overview

'use client';

import { trpc } from '@/lib/trpc.js';

export default function PlatformMetricsPage() {
  const { data, isLoading } = trpc.platform.platformMetrics.useQuery();

  if (isLoading) {
    return <div className="p-4">Loading metrics...</div>;
  }

  const metrics = [
    { label: 'Total Tenants', value: data?.totalTenants ?? 0 },
    { label: 'Active Tenants', value: data?.activeTenants ?? 0 },
    { label: 'Total Users', value: data?.totalUsers ?? 0 },
    { label: 'Total Products', value: data?.totalProducts ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Metrics</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="text-3xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
