// Stock in list page

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc.js';

export default function StockInPage() {
  const [page] = useState(1);
  const { data, isLoading } = trpc.stockIn.list.useQuery({ page, limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stock In</h1>

      {isLoading ? (
        <div>Loading stock-in records...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((stockIn) => (
                <tr key={stockIn.id} className="border-b border-border">
                  <td className="px-4 py-3 font-mono text-xs">{stockIn.referenceNumber}</td>
                  <td className="px-4 py-3 text-xs">{new Date(stockIn.receivedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">{stockIn.items.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
