// Product movement history page — stock movements for a single product

'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function ProductHistoryPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const id = params?.id as string | undefined;
  const { data, isLoading } = trpc.report.stockMovements.useQuery(
    {
      productId: id ?? '',
      page: 1,
      limit: 100,
    },
    { enabled: id !== undefined },
  );

  if (tenantSlug === undefined || id === undefined) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantSlug}/products/${id}`} className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Product
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Movement History</h1>

      {isLoading ? (
        <div>Loading history...</div>
      ) : (
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
              </tr>
            </thead>
            <tbody>
              {data?.items.map((log) => (
                <tr key={log.id} className="border-b border-border">
                  <td className="px-4 py-3 text-xs">{new Date(log.performedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.movementType === 'stock_in' ? 'bg-green-100 text-green-800' :
                      log.movementType === 'stock_out' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{log.quantityBefore}</td>
                  <td className={`px-4 py-3 text-right font-medium ${
                    log.quantityDelta > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {log.quantityDelta > 0 ? '+' : ''}{log.quantityDelta}
                  </td>
                  <td className="px-4 py-3 text-right">{log.quantityAfter}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.performedByUserId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
