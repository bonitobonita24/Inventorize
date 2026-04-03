// Platform tenants page — list and manage all tenants

'use client';

import { trpc } from '@/lib/trpc.js';

export default function PlatformTenantsPage() {
  const { data, isLoading } = trpc.platform.listTenants.useQuery({ page: 1, limit: 50 });

  if (isLoading) {
    return <div className="p-4">Loading tenants...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tenants</h1>
      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((tenant) => (
              <tr key={tenant.id} className="border-b border-border">
                <td className="px-4 py-3">{tenant.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{tenant.slug}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                    tenant.status === 'suspended' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tenant.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
