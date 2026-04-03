// Stock adjustments list page

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function AdjustmentsPage() {
  const [page] = useState(1);
  const { data, isLoading } = trpc.stockAdjustment.list.useQuery({ page, limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stock Adjustments</h1>

      {isLoading ? (
        <div>Loading adjustments...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Created By</th>
                <th className="px-4 py-3 text-left font-medium">Approved By</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((adj) => (
                <tr key={adj.id} className="border-b border-border">
                  <td className="px-4 py-3 text-xs">{new Date(adj.adjustmentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{adj.reason}</td>
                  <td className="px-4 py-3 font-mono text-xs">{adj.createdByUserId}</td>
                  <td className="px-4 py-3 font-mono text-xs">{adj.approvedByUserId ?? 'Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
