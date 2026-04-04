// Platform metrics page — cross-tenant overview

'use client';

import { trpc } from '@/lib/trpc';

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

  const breakdown = data?.tenantUserBreakdown ?? [];

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    trial: 'bg-yellow-100 text-yellow-800',
  };

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

      {breakdown.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Active Users by Tenant</h2>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Tenant</th>
                  <th className="px-4 py-3 text-left font-medium">Slug</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Active Users</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{t.activeUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
