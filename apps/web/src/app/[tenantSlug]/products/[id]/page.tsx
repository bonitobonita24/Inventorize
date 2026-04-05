// Product detail page — view single product with full info + serials tab

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

type Tab = 'details' | 'serials';

const STATUS_STYLES: Record<string, string> = {
  in_stock: 'bg-green-100 text-green-800',
  issued: 'bg-gray-100 text-gray-600',
  adjusted: 'bg-amber-100 text-amber-800',
};

function SerialsTab({ productId }: { productId: string }) {
  const [statusFilter, setStatusFilter] = useState<'in_stock' | 'issued' | 'adjusted' | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.product.serialsByProductId.useQuery({
    productId,
    status: statusFilter,
    page,
    limit: 50,
  });

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {(['all', 'in_stock', 'issued', 'adjusted'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatusFilter(s === 'all' ? undefined : s);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (s === 'all' && statusFilter === undefined) || s === statusFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading serials...</p>
      ) : data === undefined || data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No serial numbers found{statusFilter !== undefined ? ` with status "${statusFilter.replace('_', ' ')}"` : ''}.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Serial Value</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((serial: typeof data.items[number]) => (
                  <tr key={serial.id} className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">{serial.serialValue}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[serial.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {serial.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {serial.status === 'issued' && serial.stockOutItemId !== null
                        ? `Stock Out item ${serial.stockOutItemId.slice(-8)}`
                        : serial.stockInItemId !== null
                        ? `Stock In item ${serial.stockInItemId.slice(-8)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {data.total} serial{data.total !== 1 ? 's' : ''} total
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => { setPage((p) => p - 1); }}
                  className="rounded border border-border px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 py-1 text-muted-foreground">
                  {page} / {data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page === data.totalPages}
                  onClick={() => { setPage((p) => p + 1); }}
                  className="rounded border border-border px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const id = params?.id as string | undefined;
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const { data: product, isLoading } = trpc.product.byId.useQuery(
    { id: id ?? '' },
    { enabled: id !== undefined },
  );

  if (tenantSlug === undefined || id === undefined) return null;

  if (isLoading) {
    return <div className="p-4">Loading product...</div>;
  }

  if (product === null || product === undefined) {
    return <div className="p-4">Product not found.</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    ...(product.serialTrackingEnabled ? [{ key: 'serials' as Tab, label: 'Serials' }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantSlug}/products`} className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Products
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        {product.serialTrackingEnabled && (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Serial tracked</span>
        )}
        {!product.isActive && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Inactive</span>
        )}
      </div>

      {/* Tab bar — only shows if there are multiple tabs */}
      {tabs.length > 1 && (
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'details' && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Product Code</p>
              <p className="font-mono">{product.productCode}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Barcode</p>
              <p className="font-mono">{product.barcodeValue}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Category</p>
              <p>{product.category}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Unit</p>
              <p>{product.unit}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Current Quantity</p>
              <p className="text-xl font-bold">{product.currentQuantity}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Low Stock Threshold</p>
              <p>{product.lowStockThreshold}</p>
            </div>
          </div>

          <div className="mt-4">
            <Link
              href={`/${tenantSlug}/products/${product.id}/history`}
              className="text-sm text-primary underline"
            >
              View Movement History &rarr;
            </Link>
          </div>
        </>
      )}

      {activeTab === 'serials' && product.serialTrackingEnabled && (
        <SerialsTab productId={product.id} />
      )}
    </div>
  );
}
