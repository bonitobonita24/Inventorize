// Suppliers list page

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc.js';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.supplier.list.useQuery({
    page,
    limit: 50,
    search: search.length > 0 ? search : undefined,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Suppliers</h1>

      <input
        type="text"
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {isLoading ? (
        <div>Loading suppliers...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((supplier) => (
                <tr key={supplier.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{supplier.name}</td>
                  <td className="px-4 py-3">{supplier.contactPerson ?? '-'}</td>
                  <td className="px-4 py-3">{supplier.phone ?? '-'}</td>
                  <td className="px-4 py-3">{supplier.email ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
