// Stock out list page with barcode scanner for quick product lookup

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { BarcodeScanner } from '@/components/barcode-scanner';

interface PendingItem {
  productId: string;
  productName: string;
  quantity: number;
  sellingPriceSnapshot: number;
  available: number;
}

export default function StockOutPage() {
  const [page] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [requestedBy, setRequestedBy] = useState('');
  const [usedFor, setUsedFor] = useState('');
  const [notes, setNotes] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.stockOut.list.useQuery({ page, limit: 50 });
  const productSearch = trpc.product.list.useQuery(
    { page: 1, limit: 5, search: scanResult ?? '' },
    { enabled: scanResult !== null && scanResult.length > 0 },
  );
  const createMutation = trpc.stockOut.create.useMutation({
    onSuccess: () => {
      setPendingItems([]);
      setRequestedBy('');
      setUsedFor('');
      setNotes('');
      setShowForm(false);
      setScanResult(null);
      void refetch();
    },
  });

  const handleScan = (value: string) => {
    setScanResult(value);
  };

  const addItem = (product: { id: string; name: string; currentQuantity: number }) => {
    setPendingItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        sellingPriceSnapshot: 0,
        available: product.currentQuantity,
      },
    ]);
    setScanResult(null);
  };

  const removeItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (pendingItems.length === 0 || requestedBy.trim().length === 0 || usedFor.trim().length === 0) return;
    createMutation.mutate({
      releasedDate: new Date().toISOString(),
      requestedByName: requestedBy.trim(),
      usedFor: usedFor.trim(),
      notes: notes.length > 0 ? notes : null,
      items: pendingItems.map(({ productId, quantity, sellingPriceSnapshot }) => ({
        productId,
        quantity,
        sellingPriceSnapshot,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock Out</h1>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showForm ? 'Cancel' : '+ New Stock Out'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">Release Items</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Requested By *</label>
              <input
                type="text"
                value={requestedBy}
                onChange={(e) => { setRequestedBy(e.target.value); }}
                placeholder="Name of requester"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Used For *</label>
              <input
                type="text"
                value={usedFor}
                onChange={(e) => { setUsedFor(e.target.value); }}
                placeholder="Purpose / department"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <BarcodeScanner
            onScan={handleScan}
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
                  {productSearch.data?.items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { addItem({ id: p.id, name: p.name, currentQuantity: p.currentQuantity }); }}
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.productCode}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Available: {p.currentQuantity}</span>
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
                    <th className="px-4 py-2 text-right font-medium">Available</th>
                    <th className="px-4 py-2 text-right font-medium">Qty Out</th>
                    <th className="px-4 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item, i) => (
                    <tr key={`${item.productId}-${i}`} className="border-b border-border">
                      <td className="px-4 py-2">{item.productName}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{item.available}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          max={item.available}
                          value={item.quantity}
                          onChange={(e) => {
                            const q = parseInt(e.target.value, 10);
                            if (q > 0 && q <= item.available) {
                              setPendingItems((prev) =>
                                prev.map((it, idx) => (idx === i ? { ...it, quantity: q } : it)),
                              );
                            }
                          }}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm"
                        />
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
                  ))}
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
            disabled={
              pendingItems.length === 0 ||
              requestedBy.trim().length === 0 ||
              usedFor.trim().length === 0 ||
              createMutation.isPending
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving...' : `Release ${pendingItems.length} item(s)`}
          </button>

          {createMutation.isError && (
            <p className="text-sm text-red-600">{createMutation.error.message}</p>
          )}
        </div>
      )}

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
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No stock-out records yet
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
