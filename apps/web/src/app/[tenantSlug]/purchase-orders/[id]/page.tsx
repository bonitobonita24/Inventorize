// Purchase order detail page — status management + line items

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ordered: 'Ordered',
  partially_received: 'Partially Received',
  received: 'Received',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  ordered: 'bg-blue-100 text-blue-800',
  partially_received: 'bg-orange-100 text-orange-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

// Valid next statuses for each current status
const NEXT_STATUSES: Record<string, Array<'ordered' | 'partially_received' | 'received' | 'cancelled'>> = {
  draft: ['ordered', 'cancelled'],
  ordered: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const id = params?.id as string | undefined;

  const [statusError, setStatusError] = useState('');
  const [attachmentLoading, setAttachmentLoading] = useState(false);

  const { data: po, isLoading, refetch } = trpc.purchaseOrder.byId.useQuery(
    { id: id ?? '' },
    { enabled: id !== undefined && id.length > 0 },
  );

  const getAttachmentUrl = trpc.purchaseOrder.getAttachmentUrl.useQuery(
    { id: id ?? '' },
    { enabled: false }, // only fetch on demand
  );

  const handleDownloadAttachment = async () => {
    setAttachmentLoading(true);
    try {
      const result = await getAttachmentUrl.refetch();
      if (result.data?.url !== undefined) {
        window.open(result.data.url, '_blank');
      }
    } finally {
      setAttachmentLoading(false);
    }
  };

  const updateStatus = trpc.purchaseOrder.updateStatus.useMutation({
    onSuccess: () => {
      setStatusError('');
      void refetch();
    },
    onError: (err) => {
      setStatusError(err.message);
    },
  });

  if (tenantSlug === undefined || id === undefined) return null;

  if (isLoading) {
    return <div className="p-4">Loading purchase order...</div>;
  }

  if (po === null || po === undefined) {
    return <div className="p-4">Purchase order not found.</div>;
  }

  const nextStatuses = NEXT_STATUSES[po.status] ?? [];

  const orderTotal = po.items.reduce((sum, item) => {
    return sum + item.orderedQty * Number(item.supplierCostSnapshot);
  }, 0);

  return (
    <div className="space-y-6">
      <Link
        href={`/${tenantSlug}/purchase-orders`}
        className="text-sm text-muted-foreground hover:underline"
      >
        &larr; Back to Purchase Orders
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{po.poNumber}</h1>
          {po.supplier !== null && (
            <p className="mt-1 text-sm text-muted-foreground">{po.supplier.name}</p>
          )}
        </div>
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-800'}`}>
          {STATUS_LABELS[po.status] ?? po.status}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Order Date</p>
          <p className="text-sm">{new Date(po.orderDate).toLocaleDateString()}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Expected Date</p>
          <p className="text-sm">
            {po.expectedDate !== null
              ? new Date(po.expectedDate).toLocaleDateString()
              : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Order Total</p>
          <p className="text-sm font-semibold">${orderTotal.toFixed(2)}</p>
        </div>
      </div>

      {po.notes !== null && po.notes.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
          <p className="text-sm">{po.notes}</p>
        </div>
      )}

      {/* Attachment */}
      {(po as { attachmentUrl?: string | null }).attachmentUrl !== null &&
       (po as { attachmentUrl?: string | null }).attachmentUrl !== undefined && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Attachment</p>
          <button
            type="button"
            onClick={() => { void handleDownloadAttachment(); }}
            disabled={attachmentLoading}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {attachmentLoading ? 'Loading…' : '⬇ Download Attachment'}
          </button>
        </div>
      )}

      {/* Line items */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Line Items</h2>
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-right font-medium">Ordered</th>
                <th className="px-4 py-3 text-right font-medium">Received</th>
                <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
                <th className="px-4 py-3 text-right font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => {
                const lineTotal = item.orderedQty * Number(item.supplierCostSnapshot);
                const isFullyReceived = item.receivedQty >= item.orderedQty;
                return (
                  <tr key={item.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      {item.product.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.product.productCode}
                    </td>
                    <td className="px-4 py-3 text-right">{item.orderedQty}</td>
                    <td className={`px-4 py-3 text-right font-medium ${isFullyReceived ? 'text-green-700' : item.receivedQty > 0 ? 'text-orange-600' : ''}`}>
                      {item.receivedQty}
                    </td>
                    <td className="px-4 py-3 text-right">${Number(item.supplierCostSnapshot).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">${lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
              {po.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No line items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status transitions */}
      {nextStatuses.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <button
                key={status}
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => {
                  updateStatus.mutate({ id: po.id, status });
                }}
                className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                  status === 'cancelled'
                    ? 'border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {updateStatus.isPending ? 'Updating...' : `Mark as ${STATUS_LABELS[status]}`}
              </button>
            ))}
          </div>
          {statusError.length > 0 && (
            <p className="mt-2 text-sm text-destructive">{statusError}</p>
          )}
        </div>
      )}

      {(po.status === 'received' || po.status === 'cancelled') && (
        <p className="text-sm text-muted-foreground">
          This purchase order is {po.status} and cannot be updated.
        </p>
      )}

      {/* Linked stock-in receipts */}
      {po.stockIns.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Receipts</h2>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Reference</th>
                  <th className="px-4 py-3 text-left font-medium">Received Date</th>
                </tr>
              </thead>
              <tbody>
                {po.stockIns.map((si) => (
                  <tr key={si.id} className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">{si.referenceNumber}</td>
                    <td className="px-4 py-3 text-xs">{new Date(si.receivedDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
