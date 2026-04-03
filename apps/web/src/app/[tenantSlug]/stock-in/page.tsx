// Stock in list page with barcode scanner for quick product lookup

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { BarcodeScanner } from '@/components/barcode-scanner';

interface PendingItem {
  productId: string;
  productName: string;
  quantity: number;
  supplierCostSnapshot: number;
}

export default function StockInPage() {
  const [page] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [notes, setNotes] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.stockIn.list.useQuery({ page, limit: 50 });
  const productSearch = trpc.product.list.useQuery(
    { page: 1, limit: 5, search: scanResult ?? '' },
    { enabled: scanResult !== null && scanResult.length > 0 },
  );
  const createMutation = trpc.stockIn.create.useMutation({
    onSuccess: () => {
      setPendingItems([]);
      setNotes('');
      setShowForm(false);
      setScanResult(null);
      void refetch();
    },
  });

  const handleScan = (value: string) => {
    setScanResult(value);
  };

  const addItem = (product: { id: string; name: string }, quantity: number, cost: number) => {
    setPendingItems((prev) => [
      ...prev,
      { productId: product.id, productName: product.name, quantity, supplierCostSnapshot: cost },
    ]);
    setScanResult(null);
  };

  const removeItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (pendingItems.length === 0) return;
    createMutation.mutate({
      receivedDate: new Date().toISOString(),
      notes: notes.length > 0 ? notes : null,
      items: pendingItems.map(({ productId, quantity, supplierCostSnapshot }) => ({
        productId,
        quantity,
        supplierCostSnapshot,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock In</h1>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showForm ? 'Cancel' : '+ New Stock In'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">Receive Items</h2>

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
                      onClick={() => { addItem({ id: p.id, name: p.name }, 1, 0); }}
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
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Cost</th>
                    <th className="px-4 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item, i) => (
                    <tr key={`${item.productId}-${i}`} className="border-b border-border">
                      <td className="px-4 py-2">{item.productName}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const q = parseInt(e.target.value, 10);
                            if (q > 0) {
                              setPendingItems((prev) =>
                                prev.map((it, idx) => (idx === i ? { ...it, quantity: q } : it)),
                              );
                            }
                          }}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.supplierCostSnapshot}
                          onChange={(e) => {
                            const c = parseFloat(e.target.value);
                            if (c >= 0) {
                              setPendingItems((prev) =>
                                prev.map((it, idx) => (idx === i ? { ...it, supplierCostSnapshot: c } : it)),
                              );
                            }
                          }}
                          className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-sm"
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
            disabled={pendingItems.length === 0 || createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving...' : `Receive ${pendingItems.length} item(s)`}
          </button>

          {createMutation.isError && (
            <p className="text-sm text-red-600">{createMutation.error.message}</p>
          )}
        </div>
      )}

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
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No stock-in records yet
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
