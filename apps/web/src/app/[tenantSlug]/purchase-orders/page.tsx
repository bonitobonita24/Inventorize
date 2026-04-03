// Purchase orders list page

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PurchaseOrdersPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const [page] = useState(1);

  const { data, isLoading } = trpc.purchaseOrder.list.useQuery({ page, limit: 50 });

  if (tenantSlug === undefined) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Purchase Orders</h1>

      {isLoading ? (
        <div>Loading purchase orders...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">PO Number</th>
                <th className="px-4 py-3 text-left font-medium">Supplier ID</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((po) => (
                <tr key={po.id} className="border-b border-border">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/${tenantSlug}/purchase-orders/${po.id}`} className="text-primary underline">
                      {po.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{po.supplierId}</td>
                  <td className="px-4 py-3 text-xs">{new Date(po.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      po.status === 'received' ? 'bg-green-100 text-green-800' :
                      po.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      po.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {po.status}
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
