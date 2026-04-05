// Stock out list page with barcode scanner, serial picker, and printable slip

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { BarcodeScanner } from '@/components/barcode-scanner';

interface PendingItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  sellingPriceSnapshot: number;
  available: number;
  serialTrackingEnabled: boolean;
  selectedSerialIds: string[]; // ids of chosen in_stock serials
}

interface SlipRecord {
  id: string;
  printableSlipNumber: string;
  releasedDate: Date | string;
  requestedByName: string;
  usedFor: string;
  notes: string | null;
  releasedByUser: { name: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    product: { name: string; unit: string };
  }>;
}

// Serial picker sub-component — fetches in_stock serials for a product
function SerialPicker({
  productId,
  selectedIds,
  required,
  onChange,
}: {
  productId: string;
  selectedIds: string[];
  required: number;
  onChange: (ids: string[]) => void;
}) {
  const { data, isLoading } = trpc.stockOut.serialsForProduct.useQuery({ productId });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading serials...</p>;
  if (data === undefined || data.length === 0) {
    return <p className="text-xs text-red-600">No in-stock serial numbers available for this product.</p>;
  }

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < required) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="mt-3 rounded-md bg-muted/40 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Select {required} serial number{required !== 1 ? 's' : ''} — {selectedIds.length} / {required} selected
        {selectedIds.length === required && <span className="ml-2 text-green-600">✓ Complete</span>}
      </p>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {data.map((serial: typeof data[number]) => {
          const checked = selectedIds.includes(serial.id);
          const disabled = !checked && selectedIds.length >= required;
          return (
            <label
              key={serial.id}
              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs font-mono ${
                checked ? 'bg-primary/10' : disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => { toggle(serial.id); }}
                className="accent-primary"
              />
              {serial.serialValue}
              {serial.barcodeValue !== null && serial.barcodeValue !== serial.serialValue && (
                <span className="text-muted-foreground">({serial.barcodeValue})</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// Print slip modal
function PrintSlipModal({ record, onClose }: { record: SlipRecord; onClose: () => void }) {
  const handlePrint = () => { window.print(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden-backdrop">
      {/* Slip content — visible on screen and in print */}
      <div
        id="print-slip"
        className="relative w-full max-w-lg rounded-lg bg-white p-8 shadow-xl print:shadow-none print:rounded-none print:max-w-none print:p-6"
      >
        {/* Screen-only close / print buttons */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-bold">Stock Out Slip</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-3 py-1.5 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        {/* Slip header */}
        <div className="mb-6 border-b border-gray-300 pb-4">
          <p className="text-2xl font-bold tracking-wide">{record.printableSlipNumber}</p>
          <p className="mt-1 text-sm text-gray-500">Stock Release Slip</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">Date:</span>{' '}
            <span className="font-medium">{new Date(record.releasedDate).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Released By:</span>{' '}
            <span className="font-medium">{record.releasedByUser?.name ?? '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">Requested By:</span>{' '}
            <span className="font-medium">{record.requestedByName}</span>
          </div>
          <div>
            <span className="text-gray-500">Used For:</span>{' '}
            <span className="font-medium">{record.usedFor}</span>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="py-2 text-left font-semibold">Item</th>
              <th className="py-2 text-center font-semibold">Unit</th>
              <th className="py-2 text-right font-semibold">Qty</th>
            </tr>
          </thead>
          <tbody>
            {record.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2">{item.product.name}</td>
                <td className="py-2 text-center text-gray-600">{item.product.unit}</td>
                <td className="py-2 text-right font-medium">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {record.notes !== null && record.notes.length > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            <span className="font-semibold">Notes:</span> {record.notes}
          </p>
        )}

        {/* Signature line */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div className="border-t border-gray-400 pt-2 text-center text-gray-500">Released by</div>
          <div className="border-t border-gray-400 pt-2 text-center text-gray-500">Received by</div>
        </div>
      </div>
    </div>
  );
}

export default function StockOutPage() {
  const [page] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [requestedBy, setRequestedBy] = useState('');
  const [usedFor, setUsedFor] = useState('');
  const [notes, setNotes] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [slipRecord, setSlipRecord] = useState<SlipRecord | null>(null);

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

  const addItem = (product: { id: string; name: string; currentQuantity: number; serialTrackingEnabled: boolean; unit?: string }) => {
    setPendingItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        unit: product.unit ?? '',
        quantity: 1,
        sellingPriceSnapshot: 0,
        available: product.currentQuantity,
        serialTrackingEnabled: product.serialTrackingEnabled,
        selectedSerialIds: [],
      },
    ]);
    setScanResult(null);
  };

  const removeItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, q: number) => {
    if (q <= 0) return;
    setPendingItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        // Reset serial selection when quantity changes on serial-tracked items
        return { ...it, quantity: q, selectedSerialIds: it.serialTrackingEnabled ? [] : it.selectedSerialIds };
      }),
    );
  };

  const updateSerials = (index: number, ids: string[]) => {
    setPendingItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, selectedSerialIds: ids } : it)),
    );
  };

  const serialsValid = pendingItems.every(
    (item) => !item.serialTrackingEnabled || item.selectedSerialIds.length === item.quantity,
  );

  const handleSubmit = () => {
    if (pendingItems.length === 0 || requestedBy.trim().length === 0 || usedFor.trim().length === 0 || !serialsValid) return;
    createMutation.mutate({
      releasedDate: new Date().toISOString(),
      requestedByName: requestedBy.trim(),
      usedFor: usedFor.trim(),
      notes: notes.length > 0 ? notes : null,
      items: pendingItems.map(({ productId, quantity, sellingPriceSnapshot, serialTrackingEnabled, selectedSerialIds }) => ({
        productId,
        quantity,
        sellingPriceSnapshot,
        ...(serialTrackingEnabled && selectedSerialIds.length > 0 ? { serialIds: selectedSerialIds } : {}),
      })),
    });
  };

  const openSlip = (stockOut: SlipRecord) => {
    setSlipRecord(stockOut);
  };

  return (
    <div className="space-y-6">
      {slipRecord !== null && (
        <PrintSlipModal record={slipRecord} onClose={() => { setSlipRecord(null); }} />
      )}

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
                  {productSearch.data?.items.map((p: NonNullable<typeof productSearch.data>['items'][number]) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        addItem({
                          id: p.id,
                          name: p.name,
                          currentQuantity: p.currentQuantity,
                          serialTrackingEnabled: p.serialTrackingEnabled,
                          unit: p.unit,
                        });
                      }}
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.productCode}</span>
                        {p.serialTrackingEnabled && (
                          <span className="ml-2 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">Serial</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">Available: {p.currentQuantity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {pendingItems.length > 0 && (
            <div className="space-y-3">
              {pendingItems.map((item, i) => (
                <div key={`${item.productId}-${i}`} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium">
                      {item.productName}
                      {item.serialTrackingEnabled && (
                        <span className="ml-2 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">Serial tracking</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">Avail: {item.available}</span>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Qty</label>
                      <input
                        type="number"
                        min={1}
                        max={item.available}
                        value={item.quantity}
                        onChange={(e) => { updateQuantity(i, parseInt(e.target.value, 10)); }}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { removeItem(i); }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Serial picker — shown only for serial-tracked products */}
                  {item.serialTrackingEnabled && (
                    <SerialPicker
                      productId={item.productId}
                      selectedIds={item.selectedSerialIds}
                      required={item.quantity}
                      onChange={(ids) => { updateSerials(i, ids); }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); }}
            placeholder="Notes (optional)"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            rows={2}
          />

          {!serialsValid && pendingItems.some((it) => it.serialTrackingEnabled) && (
            <p className="text-sm text-amber-600">
              Please select all required serial numbers before submitting.
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              pendingItems.length === 0 ||
              requestedBy.trim().length === 0 ||
              usedFor.trim().length === 0 ||
              !serialsValid ||
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
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Requested By</th>
                <th className="px-4 py-3 text-left font-medium">Used For</th>
                <th className="px-4 py-3 text-right font-medium">Items</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((stockOut: NonNullable<typeof data>['items'][number]) => (
                <tr key={stockOut.id} className="border-b border-border">
                  <td className="px-4 py-3 font-mono text-xs">{stockOut.printableSlipNumber}</td>
                  <td className="px-4 py-3 text-xs">{new Date(stockOut.releasedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{stockOut.requestedByName}</td>
                  <td className="px-4 py-3">{stockOut.usedFor}</td>
                  <td className="px-4 py-3 text-right">{stockOut.items.length}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { openSlip(stockOut as SlipRecord); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Print Slip
                    </button>
                  </td>
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
