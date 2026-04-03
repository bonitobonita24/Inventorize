// Reports page — low stock alerts and movement history

'use client';

import { trpc } from '@/lib/trpc.js';

export default function ReportsPage() {
  const { data: movements, isLoading } = trpc.report.stockMovements.useQuery({
    page: 1,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <h2 className="text-lg font-semibold">Recent Stock Movements</h2>

      {isLoading ? (
        <div>Loading reports...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Product ID</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Change</th>
                <th className="px-4 py-3 text-right font-medium">After</th>
                <th className="px-4 py-3 text-left font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {movements?.items.map((log) => (
                <tr key={log.id} className="border-b border-border">
                  <td className="px-4 py-3 text-xs">{new Date(log.performedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.productId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.movementType === 'stock_in' ? 'bg-green-100 text-green-800' :
                      log.movementType === 'stock_out' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.movementType}
                    </span>
                  </td>
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
