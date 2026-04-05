// Stock adjustments page with create form and product search via barcode scanner

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { BarcodeScanner } from '@/components/barcode-scanner';

const REASONS = [
  { value: 'recount', label: 'Recount' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft' },
  { value: 'correction', label: 'Correction' },
  { value: 'other', label: 'Other' },
] as const;

interface PendingItem {
  productId: string;
  productName: string;
  quantityDelta: number;
  currentQuantity: number;
  serialTrackingEnabled: boolean;
  serialNumberId?: string | undefined;
}

function SerialPicker({ productId, selectedId, onSelect }: {
  productId: string;
  selectedId?: string | undefined;
  onSelect: (serialId: string | undefined) => void;
}) {
  const { data, isLoading } = trpc.product.serialsByProductId.useQuery(
    { productId, status: 'in_stock', page: 1, limit: 200 },
  );

  if (isLoading) return <span className="text-xs text-muted-foreground">Loading...</span>;

  const serials = data?.items ?? [];
  if (serials.length === 0) {
    return <span className="text-xs text-muted-foreground">No serials in stock</span>;
  }

  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => { onSelect(e.target.value.length > 0 ? e.target.value : undefined); }}
      className="w-40 rounded border border-border bg-background px-2 py-1 text-xs"
    >
      <option value="">Select serial...</option>
      {serials.map((s: typeof serials[number]) => (
        <option key={s.id} value={s.id}>{s.serialValue}</option>
      ))}
    </select>
  );
}

export default function AdjustmentsPage() {
  const [page] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState<'recount' | 'damage' | 'theft' | 'correction' | 'other'>('recount');
  const [notes, setNotes] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.stockAdjustment.list.useQuery({ page, limit: 50 });
  const productSearch = trpc.product.list.useQuery(
    { page: 1, limit: 5, search: scanResult ?? '' },
    { enabled: scanResult !== null && scanResult.length > 0 },
  );

  const createMutation = trpc.stockAdjustment.create.useMutation({
    onSuccess: () => {
      setPendingItems([]);
      setReason('recount');
      setNotes('');
      setShowForm(false);
      setScanResult(null);
      void refetch();
    },
  });

  const addItem = (product: { id: string; name: string; currentQuantity: number; serialTrackingEnabled: boolean }) => {
    setPendingItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantityDelta: 0,
        currentQuantity: product.currentQuantity,
        serialTrackingEnabled: product.serialTrackingEnabled,
      },
    ]);
    setScanResult(null);
  };

  const removeItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const validItems = pendingItems.filter((item) => item.quantityDelta !== 0);
    if (validItems.length === 0) return;

    createMutation.mutate({
      adjustmentDate: new Date().toISOString(),
      reason,
      notes: notes.trim().length > 0 ? notes.trim() : null,
      items: validItems.map(({ productId, quantityDelta, serialNumberId }) => ({
        productId,
        quantityDelta,
        ...(serialNumberId !== undefined ? { serialNumberId } : {}),
      })),
    });
  };

  const validItemCount = pendingItems.filter((item) => item.quantityDelta !== 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock Adjustments</h1>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showForm ? 'Cancel' : '+ New Adjustment'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">Create Adjustment</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Reason *</label>
              <select
                value={reason}
                onChange={(e) => { setReason(e.target.value as typeof reason); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <BarcodeScanner
            onScan={(value) => { setScanResult(value); }}
            placeholder="Scan barcode or type product code..."
          />

          {scanResult !== null && scanResult.length > 0 && (
            <div className="rounded-md border border-border p-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Search results for &ldquo;{scanResult}&rdquo;:
              </p>
              {productSearch.isLoading ? (
                <p className="text-sm">Searching...</p>
              ) : productSearch.data?.items.length === 0 ? (
                <p className="text-sm text-red-600">No products found</p>
              ) : (
                <div className="space-y-1">
                  {productSearch.data?.items.map((p: NonNullable<typeof productSearch.data>['items'][number]) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { addItem({ id: p.id, name: p.name, currentQuantity: p.currentQuantity, serialTrackingEnabled: p.serialTrackingEnabled }); }}
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.productCode}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Qty: {p.currentQuantity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {pendingItems.length > 0 && (
            <div className="rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Product</th>
                    <th className="px-4 py-2 text-left font-medium">Serial #</th>
                    <th className="px-4 py-2 text-right font-medium">Current Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Delta (+/-)</th>
                    <th className="px-4 py-2 text-right font-medium">Result</th>
                    <th className="px-4 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item, i) => {
                    const resultQty = item.currentQuantity + item.quantityDelta;
                    const isInvalid = resultQty < 0;
                    return (
                      <tr key={`${item.productId}-${i}`} className="border-b border-border">
                        <td className="px-4 py-2">{item.productName}</td>
                        <td className="px-4 py-2">
                          {item.serialTrackingEnabled ? (
                            <SerialPicker
                              productId={item.productId}
                              selectedId={item.serialNumberId}
                              onSelect={(serialId) => {
                                setPendingItems((prev) =>
                                  prev.map((it, idx) => (idx === i ? { ...it, serialNumberId: serialId } : it)),
                                );
                              }}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{item.currentQuantity}</td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            value={item.quantityDelta}
                            onChange={(e) => {
                              const delta = parseInt(e.target.value, 10);
                              if (!isNaN(delta)) {
                                setPendingItems((prev) =>
                                  prev.map((it, idx) => (idx === i ? { ...it, quantityDelta: delta } : it)),
                                );
                              }
                            }}
                            className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-sm"
                          />
                        </td>
                        <td className={`px-4 py-2 text-right font-medium ${isInvalid ? 'text-red-600' : ''}`}>
                          {resultQty}
                          {isInvalid && <span className="ml-1 text-xs">(negative!)</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => { removeItem(i); }}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); }}
            placeholder="Notes (optional)"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            rows={2}
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={validItemCount === 0 || createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving...' : `Submit Adjustment (${validItemCount} item(s))`}
          </button>

          {createMutation.isError && (
            <p className="text-sm text-red-600">{createMutation.error.message}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div>Loading adjustments...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Items</th>
                <th className="px-4 py-3 text-left font-medium">Created By</th>
                <th className="px-4 py-3 text-left font-medium">Approved By</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((adj: NonNullable<typeof data>['items'][number]) => (
                <tr key={adj.id} className="border-b border-border">
                  <td className="px-4 py-3 text-xs">{new Date(adj.adjustmentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      adj.reason === 'damage' || adj.reason === 'theft'
                        ? 'bg-red-100 text-red-800'
                        : adj.reason === 'recount'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {adj.reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {adj.items.map((item: typeof adj.items[number]) => (
                      <div key={item.id}>
                        {item.product?.name ?? item.productId}: {item.quantityDelta > 0 ? '+' : ''}{item.quantityDelta}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3">{adj.createdByUser?.name ?? adj.createdByUserId}</td>
                  <td className="px-4 py-3">{adj.approvedByUser?.name ?? (adj.approvedByUserId !== null ? adj.approvedByUserId : 'Pending')}</td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No stock adjustments yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
