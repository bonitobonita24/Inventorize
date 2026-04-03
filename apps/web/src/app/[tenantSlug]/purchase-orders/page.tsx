// Purchase orders list page with create form (admin + purchasing_staff)

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface LineItemRow {
  productId: string;
  orderedQty: string;
  supplierCostSnapshot: string;
}

interface CreateFormData {
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  items: LineItemRow[];
}

const emptyForm: CreateFormData = {
  supplierId: '',
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDate: '',
  notes: '',
  items: [{ productId: '', orderedQty: '1', supplierCostSnapshot: '0' }],
};

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

export default function PurchaseOrdersPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;

  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFormData>(emptyForm);

  const { data, isLoading, refetch } = trpc.purchaseOrder.list.useQuery({ page, limit: 50 });

  const { data: suppliersData } = trpc.supplier.list.useQuery(
    { page: 1, limit: 200 },
    { enabled: showForm },
  );

  const { data: productsData } = trpc.product.list.useQuery(
    { page: 1, limit: 200 },
    { enabled: showForm },
  );

  const createMutation = trpc.purchaseOrder.create.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      setShowForm(false);
      void refetch();
    },
  });

  const addLineItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: '', orderedQty: '1', supplierCostSnapshot: '0' }],
    }));
  };

  const removeLineItem = (index: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const updateLineItem = (index: number, field: keyof LineItemRow, value: string) => {
    setForm((f) => {
      const items = f.items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Auto-fill supplierCostSnapshot when product changes
        if (field === 'productId' && productsData !== undefined) {
          const product = productsData.items.find((p) => p.id === value);
          if (product !== undefined) {
            // supplierCost is conditionally selected based on role — access via cast
            const rawCost = (product as Record<string, unknown>)['supplierCost'];
            const cost =
              rawCost !== undefined && rawCost !== null
                ? typeof rawCost === 'object'
                  ? (rawCost as { toNumber: () => number }).toNumber()
                  : Number(rawCost)
                : 0;
            updated.supplierCostSnapshot = String(cost);
          }
        }
        return updated;
      });
      return { ...f, items };
    });
  };

  const handleSubmit = () => {
    if (form.supplierId.trim().length === 0) return;
    if (form.items.length === 0) return;

    const validItems = form.items.filter(
      (item) =>
        item.productId.trim().length > 0 &&
        parseInt(item.orderedQty, 10) >= 1 &&
        parseFloat(item.supplierCostSnapshot) >= 0,
    );
    if (validItems.length === 0) return;

    // Convert local date string to ISO datetime string
    const toISO = (dateStr: string) => {
      if (dateStr.trim().length === 0) return null;
      return new Date(`${dateStr}T00:00:00`).toISOString();
    };

    const orderDateISO = toISO(form.orderDate);
    if (orderDateISO === null) return;

    createMutation.mutate({
      supplierId: form.supplierId,
      orderDate: orderDateISO,
      expectedDate: toISO(form.expectedDate),
      notes: form.notes.trim().length > 0 ? form.notes.trim() : null,
      items: validItems.map((item) => ({
        productId: item.productId,
        orderedQty: parseInt(item.orderedQty, 10),
        supplierCostSnapshot: parseFloat(item.supplierCostSnapshot),
      })),
    });
  };

  const cancelForm = () => {
    setForm(emptyForm);
    setShowForm(false);
  };

  const isFormValid =
    form.supplierId.trim().length > 0 &&
    form.orderDate.trim().length > 0 &&
    form.items.some(
      (item) =>
        item.productId.trim().length > 0 &&
        parseInt(item.orderedQty, 10) >= 1,
    );

  if (tenantSlug === undefined) return null;

  const activeSuppliers = suppliersData?.items.filter((s) => s.isActive) ?? [];
  const activeProducts = productsData?.items.filter((p) => p.isActive) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              cancelForm();
            } else {
              setShowForm(true);
            }
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showForm ? 'Cancel' : '+ New Purchase Order'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-5 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">New Purchase Order</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Supplier *</label>
              <select
                value={form.supplierId}
                onChange={(e) => { setForm({ ...form, supplierId: e.target.value }); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">— select supplier —</option>
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Order Date *</label>
              <input
                type="date"
                value={form.orderDate}
                onChange={(e) => { setForm({ ...form, orderDate: e.target.value }); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Expected Delivery Date</label>
              <input
                type="date"
                value={form.expectedDate}
                onChange={(e) => { setForm({ ...form, expectedDate: e.target.value }); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => { setForm({ ...form, notes: e.target.value }); }}
                placeholder="Optional notes"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Line Items *</label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-sm text-primary hover:underline"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_90px_100px_32px] items-end gap-2">
                  <div>
                    {index === 0 && (
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Product</label>
                    )}
                    <select
                      value={item.productId}
                      onChange={(e) => { updateLineItem(index, 'productId', e.target.value); }}
                      className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                    >
                      <option value="">— select —</option>
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.productCode}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {index === 0 && (
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Qty</label>
                    )}
                    <input
                      type="number"
                      min="1"
                      value={item.orderedQty}
                      onChange={(e) => { updateLineItem(index, 'orderedQty', e.target.value); }}
                      className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    {index === 0 && (
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Unit Cost ($)</label>
                    )}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.supplierCostSnapshot}
                      onChange={(e) => { updateLineItem(index, 'supplierCostSnapshot', e.target.value); }}
                      className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { removeLineItem(index); }}
                    disabled={form.items.length === 1}
                    className="flex h-9 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Order total */}
            {form.items.some((item) => item.productId.length > 0) && (
              <div className="mt-3 flex justify-end">
                <span className="rounded-md bg-muted px-3 py-1.5 text-sm">
                  Order total:{' '}
                  <span className="font-semibold">
                    ${form.items
                      .reduce((sum, item) => {
                        const qty = parseInt(item.orderedQty, 10);
                        const cost = parseFloat(item.supplierCostSnapshot);
                        return sum + (isNaN(qty) || isNaN(cost) ? 0 : qty * cost);
                      }, 0)
                      .toFixed(2)}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || createMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive">{createMutation.error.message}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div>Loading purchase orders...</div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">PO Number</th>
                  <th className="px-4 py-3 text-left font-medium">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium">Order Date</th>
                  <th className="px-4 py-3 text-right font-medium">Items</th>
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
                    <td className="px-4 py-3">
                      {'supplier' in po && po.supplier !== null
                        ? (po.supplier as { name: string }).name
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(po.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {'items' in po ? (po.items as unknown[]).length : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[po.status] ?? po.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No purchase orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data !== undefined && data.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
                disabled={page === 1}
                className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => { setPage((p) => Math.min(data.totalPages, p + 1)); }}
                disabled={page === data.totalPages}
                className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
