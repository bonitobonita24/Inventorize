// Purchase order detail page

'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const id = params?.id as string | undefined;
  const { data: po, isLoading } = trpc.purchaseOrder.byId.useQuery(
    { id: id ?? '' },
    { enabled: id !== undefined },
  );

  if (tenantSlug === undefined || id === undefined) return null;

  if (isLoading) {
    return <div className="p-4">Loading purchase order...</div>;
  }

  if (po === null || po === undefined) {
    return <div className="p-4">Purchase order not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link href={`/${tenantSlug}/purchase-orders`} className="text-sm text-muted-foreground hover:underline">
        &larr; Back to Purchase Orders
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{po.poNumber}</h1>
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
          po.status === 'received' ? 'bg-green-100 text-green-800' :
          po.status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {po.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Supplier ID</p>
          <p className="font-mono text-sm">{po.supplierId}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Order Date</p>
          <p>{new Date(po.orderDate).toLocaleDateString()}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Item details are available via the API. Use the purchase order ID to query individual line items.
      </p>
    </div>
  );
}
