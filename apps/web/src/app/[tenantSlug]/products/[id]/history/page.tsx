// Product movement history page — stock movements for a single product with filters

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

type MovementType = 'stock_in' | 'stock_out' | 'adjustment';

export default function ProductHistoryPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const id = params?.id as string | undefined;

  const [movementType, setMovementType] = useState<MovementType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.report.stockMovements.useQuery(
    {
      productId: id ?? '',
      page,
      limit: 50,
      ...(movementType !== '' ? { movementType } : {}),
      ...(startDate !== '' ? { startDate: new Date(startDate).toISOString() } : {}),
      ...(endDate !== '' ? { endDate: new Date(endDate + 'T23:59:59').toISOString() } : {}),
    },
    { enabled: id !== undefined },
  );

  if (tenantSlug === undefined || id === undefined) return null;

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantSlug}/products/${id}`} className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Product
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Movement History</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
          <select
            value={movementType}
            onChange={(e) => {
              setMovementType(e.target.value as MovementType | '');
              handleFilterChange();
            }}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">All types</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              handleFilterChange();
            }}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              handleFilterChange();
            }}
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        {(movementType !== '' || startDate !== '' || endDate !== '') && (
          <button
            type="button"
            onClick={() => {
              setMovementType('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
            className="rounded border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div>Loading history...</div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Before</th>
                  <th className="px-4 py-3 text-right font-medium">Change</th>
                  <th className="px-4 py-3 text-right font-medium">After</th>
                  <th className="px-4 py-3 text-left font-medium">By</th>
                  <th className="px-4 py-3 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                      No movements match the selected filters.
                    </td>
                  </tr>
                )}
                {data?.items.map((log: NonNullable<typeof data>['items'][number]) => (
                  <tr key={log.id} className="border-b border-border">
                    <td className="px-4 py-3 text-xs">{new Date(log.performedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.movementType === 'stock_in' ? 'bg-green-100 text-green-800' :
                        log.movementType === 'stock_out' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.movementType === 'stock_in' ? 'Stock In' :
                         log.movementType === 'stock_out' ? 'Stock Out' : 'Adjustment'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{log.quantityBefore}</td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      log.quantityDelta > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {log.quantityDelta > 0 ? '+' : ''}{log.quantityDelta}
                    </td>
                    <td className="px-4 py-3 text-right">{log.quantityAfter}</td>
                    <td className="px-4 py-3 text-xs">
                      {(log as unknown as { performedByUser?: { name: string } }).performedByUser?.name ?? log.performedByUserId}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.notes ?? (log.requestedByName !== null && log.requestedByName !== undefined
                        ? `Requested by ${log.requestedByName}`
                        : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {data?.page ?? 1} of {data?.totalPages ?? 1} ({data?.total ?? 0} records)</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
                  disabled={page <= 1}
                  className="rounded border border-border px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => { setPage((p) => p + 1); }}
                  disabled={page >= (data?.totalPages ?? 1)}
                  className="rounded border border-border px-3 py-1 disabled:opacity-40"
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
