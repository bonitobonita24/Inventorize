// Stock out list page

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc.js';

export default function StockOutPage() {
  const [page] = useState(1);
  const { data, isLoading } = trpc.stockOut.list.useQuery({ page, limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stock Out</h1>

      {isLoading ? (
        <div>Loading stock-out records...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Slip #</th>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Requested By</th>
                <th className="px-4 py-3 text-left font-medium">Used For</th>
                <th className="px-4 py-3 text-right font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((stockOut) => (
                <tr key={stockOut.id} className="border-b border-border">
                  <td className="px-4 py-3 font-mono text-xs">{stockOut.printableSlipNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{stockOut.referenceNumber}</td>
                  <td className="px-4 py-3 text-xs">{new Date(stockOut.releasedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{stockOut.requestedByName}</td>
                  <td className="px-4 py-3">{stockOut.usedFor}</td>
                  <td className="px-4 py-3 text-right">{stockOut.items.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
