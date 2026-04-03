// Products list page — searchable, filterable product catalog

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc.js';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ProductsPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.product.list.useQuery({
    page,
    limit: 50,
    search: search.length > 0 ? search : undefined,
  });

  if (tenantSlug === undefined) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
      </div>

      <input
        type="text"
        placeholder="Search by name, code, or barcode..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {isLoading ? (
        <div>Loading products...</div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((product) => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/${tenantSlug}/products/${product.id}`} className="text-primary underline">
                        {product.productCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{product.name}</td>
                    <td className="px-4 py-3">{product.category}</td>
                    <td className={`px-4 py-3 text-right ${
                      product.currentQuantity <= product.lowStockThreshold ? 'text-destructive font-medium' : ''
                    }`}>
                      {product.currentQuantity} {product.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {'sellingPrice' in product ? `$${Number(product.sellingPrice).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data !== undefined && data.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
