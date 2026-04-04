// Stock in list page with barcode scanner for quick product lookup + serial number entry

'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { BarcodeScanner } from '@/components/barcode-scanner';

interface PendingItem {
  productId: string;
  productName: string;
  quantity: number;
  supplierCostSnapshot: number;
  serialTrackingEnabled: boolean;
  serialValues: string[];
  serialInput: string; // current text field value for adding a serial
}

export default function StockInPage() {
  const [page] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [notes, setNotes] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fetchingAttachmentId, setFetchingAttachmentId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.stockIn.list.useQuery({ page, limit: 50 });
  const { data: receivablePOs } = trpc.purchaseOrder.listReceivable.useQuery();
  const attachmentUrlQuery = trpc.stockIn.getAttachmentUrl.useQuery(
    { id: fetchingAttachmentId ?? '' },
    { enabled: fetchingAttachmentId !== null, staleTime: 0 },
  );

  useEffect(() => {
    if (attachmentUrlQuery.data?.url !== undefined && fetchingAttachmentId !== null) {
      window.open(attachmentUrlQuery.data.url, '_blank');
      setFetchingAttachmentId(null);
    }
  }, [attachmentUrlQuery.data, fetchingAttachmentId]);

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
      setSelectedPoId(null);
      setAttachmentFile(null);
      setUploadError(null);
      void refetch();
    },
  });

  const handleScan = (value: string) => {
    setScanResult(value);
  };

  const handlePoSelect = (poId: string) => {
    if (poId === '') {
      setSelectedPoId(null);
      setPendingItems([]);
      return;
    }
    setSelectedPoId(poId);
    const po = receivablePOs?.find((p) => p.id === poId);
    if (po === undefined) return;
    const items: PendingItem[] = po.items
      .filter((item) => item.orderedQty - item.receivedQty > 0)
      .map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.orderedQty - item.receivedQty,
        supplierCostSnapshot: Number(item.supplierCostSnapshot),
        serialTrackingEnabled: item.product.serialTrackingEnabled,
        serialValues: [],
        serialInput: '',
      }));
    setPendingItems(items);
  };

  const addItem = (product: { id: string; name: string; serialTrackingEnabled: boolean }, quantity: number, cost: number) => {
    setPendingItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity,
        supplierCostSnapshot: cost,
        serialTrackingEnabled: product.serialTrackingEnabled,
        serialValues: [],
        serialInput: '',
      },
    ]);
    setScanResult(null);
  };

  const removeItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemField = <K extends keyof PendingItem>(index: number, field: K, value: PendingItem[K]) => {
    setPendingItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const addSerial = (index: number) => {
    const item = pendingItems[index];
    if (item === undefined) return;
    const val = item.serialInput.trim();
    if (val.length === 0) return;
    if (item.serialValues.includes(val)) return; // duplicate within the form
    updateItemField(index, 'serialValues', [...item.serialValues, val]);
    updateItemField(index, 'serialInput', '');
  };

  const removeSerial = (itemIndex: number, serialVal: string) => {
    const item = pendingItems[itemIndex];
    if (item === undefined) return;
    updateItemField(itemIndex, 'serialValues', item.serialValues.filter((s) => s !== serialVal));
  };

  const serialsValid = pendingItems.every((item) =>
    !item.serialTrackingEnabled || item.serialValues.length === item.quantity,
  );

  const handleSubmit = async () => {
    if (pendingItems.length === 0 || !serialsValid) return;

    let attachmentUrl: string | null = null;
    if (attachmentFile !== null) {
      setUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', attachmentFile);
      formData.append('entityType', 'delivery-receipt');
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json() as { storagePath?: string; error?: string };
        if (!res.ok || json.storagePath === undefined) {
          setUploadError(json.error ?? 'Upload failed.');
          setUploading(false);
          return;
        }
        attachmentUrl = json.storagePath;
      } catch {
        setUploadError('Upload failed. Please try again.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    createMutation.mutate({
      purchaseOrderId: selectedPoId,
      receivedDate: new Date().toISOString(),
      notes: notes.length > 0 ? notes : null,
      attachmentUrl,
      items: pendingItems.map(({ productId, quantity, supplierCostSnapshot, serialTrackingEnabled, serialValues }) => ({
        productId,
        quantity,
        supplierCostSnapshot,
        ...(serialTrackingEnabled && serialValues.length > 0 ? { serialValues } : {}),
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

          {/* PO selector */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Link to Purchase Order <span className="text-muted-foreground">(optional)</span>
            </label>
            <select
              value={selectedPoId ?? ''}
              onChange={(e) => { handlePoSelect(e.target.value); }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— No PO —</option>
              {receivablePOs?.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber}{po.supplier !== null ? ` — ${po.supplier.name}` : ''}
                </option>
              ))}
            </select>
            {selectedPoId !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Items pre-filled from PO. Adjust quantities as needed or scan to add extra items.
              </p>
            )}
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
                      onClick={() => { addItem({ id: p.id, name: p.name, serialTrackingEnabled: p.serialTrackingEnabled }, 1, 0); }}
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.productCode}</span>
                        {p.serialTrackingEnabled && (
                          <span className="ml-2 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">Serial</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">Qty: {p.currentQuantity}</span>
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
                  {/* Item header row */}
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium">
                      {item.productName}
                      {item.serialTrackingEnabled && (
                        <span className="ml-2 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">Serial tracking</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const q = parseInt(e.target.value, 10);
                          if (q > 0) {
                            updateItemField(i, 'quantity', q);
                            // Clear serials if quantity changed on serial-tracked items
                            if (item.serialTrackingEnabled) {
                              updateItemField(i, 'serialValues', []);
                            }
                          }
                        }}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm"
                      />
                      <label className="text-xs text-muted-foreground">Unit Cost</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.supplierCostSnapshot}
                        onChange={(e) => {
                          const c = parseFloat(e.target.value);
                          if (c >= 0) updateItemField(i, 'supplierCostSnapshot', c);
                        }}
                        className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-sm"
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

                  {/* Serial entry panel — shown only for serial-tracked products */}
                  {item.serialTrackingEnabled && (
                    <div className="mt-3 rounded-md bg-muted/40 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Serial Numbers — {item.serialValues.length} / {item.quantity} entered
                        {item.serialValues.length === item.quantity ? (
                          <span className="ml-2 text-green-600">✓ Complete</span>
                        ) : (
                          <span className="ml-2 text-amber-600">({item.quantity - item.serialValues.length} remaining)</span>
                        )}
                      </p>

                      {/* Entered serials */}
                      {item.serialValues.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {item.serialValues.map((sv) => (
                            <span
                              key={sv}
                              className="flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs font-mono border border-border"
                            >
                              {sv}
                              <button
                                type="button"
                                onClick={() => { removeSerial(i, sv); }}
                                className="text-red-500 hover:text-red-700 leading-none"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Serial scan/type input — hidden when count is met */}
                      {item.serialValues.length < item.quantity && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.serialInput}
                            onChange={(e) => { updateItemField(i, 'serialInput', e.target.value); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); addSerial(i); }
                            }}
                            placeholder="Scan or type serial number, press Enter"
                            className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => { addSerial(i); }}
                            disabled={item.serialInput.trim().length === 0}
                            className="rounded bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
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

          <div>
            <label className="mb-1 block text-sm font-medium">
              Delivery Receipt <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setAttachmentFile(file);
                setUploadError(null);
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            {uploadError !== null && (
              <p className="mt-1 text-xs text-red-600">{uploadError}</p>
            )}
          </div>

          {!serialsValid && pendingItems.some((it) => it.serialTrackingEnabled) && (
            <p className="text-sm text-amber-600">
              Please enter all required serial numbers before submitting.
            </p>
          )}

          <button
            type="button"
            onClick={() => { void handleSubmit(); }}
            disabled={pendingItems.length === 0 || !serialsValid || createMutation.isPending || uploading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : createMutation.isPending ? 'Saving...' : `Receive ${pendingItems.length} item(s)`}
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
                <th className="px-4 py-3 text-left font-medium">Linked PO</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Items</th>
                <th className="px-4 py-3 text-left font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((stockIn) => (
                <tr key={stockIn.id} className="border-b border-border">
                  <td className="px-4 py-3 font-mono text-xs">{stockIn.referenceNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {stockIn.purchaseOrderId !== null ? '✓ PO linked' : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">{new Date(stockIn.receivedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">{stockIn.items.length}</td>
                  <td className="px-4 py-3">
                    {(stockIn as { attachmentUrl?: string | null }).attachmentUrl !== null &&
                     (stockIn as { attachmentUrl?: string | null }).attachmentUrl !== undefined ? (
                      <button
                        type="button"
                        onClick={() => { setFetchingAttachmentId(stockIn.id); }}
                        disabled={fetchingAttachmentId === stockIn.id}
                        className="text-xs text-primary underline hover:no-underline disabled:opacity-50"
                      >
                        {fetchingAttachmentId === stockIn.id ? 'Loading…' : '⬇ View'}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
