// Products list page — searchable, filterable product catalog with create/edit form (admin only)

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ProductFormData {
  productCode: string;
  barcodeValue: string;
  name: string;
  category: string;
  unit: string;
  supplierCost: string;
  markupPercent: string;
  lowStockThreshold: string;
  serialTrackingEnabled: boolean;
}

const emptyForm: ProductFormData = {
  productCode: '',
  barcodeValue: '',
  name: '',
  category: '',
  unit: '',
  supplierCost: '0',
  markupPercent: '0',
  lowStockThreshold: '0',
  serialTrackingEnabled: false,
};

function computedSellingPrice(supplierCost: string, markupPercent: string): string {
  const cost = parseFloat(supplierCost);
  const markup = parseFloat(markupPercent);
  if (isNaN(cost) || isNaN(markup)) return '—';
  const price = cost + (cost * markup) / 100;
  return `$${price.toFixed(2)}`;
}

export default function ProductsPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);

  const { data, isLoading, refetch } = trpc.product.list.useQuery({
    page,
    limit: 50,
    search: search.length > 0 ? search : undefined,
  });

  const createMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      setShowForm(false);
      void refetch();
    },
  });

  const updateMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      void refetch();
    },
  });

  const startEdit = (product: {
    id: string;
    productCode: string;
    barcodeValue: string;
    name: string;
    category: string;
    unit: string;
    supplierCost: number | { toNumber: () => number };
    markupPercent: number | { toNumber: () => number };
    lowStockThreshold: number;
    serialTrackingEnabled: boolean;
  }) => {
    const cost = typeof product.supplierCost === 'object' ? product.supplierCost.toNumber() : product.supplierCost;
    const markup = typeof product.markupPercent === 'object' ? product.markupPercent.toNumber() : product.markupPercent;
    setEditingId(product.id);
    setForm({
      productCode: product.productCode,
      barcodeValue: product.barcodeValue,
      name: product.name,
      category: product.category,
      unit: product.unit,
      supplierCost: String(cost),
      markupPercent: String(markup),
      lowStockThreshold: String(product.lowStockThreshold),
      serialTrackingEnabled: product.serialTrackingEnabled,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    const supplierCost = parseFloat(form.supplierCost);
    const markupPercent = parseFloat(form.markupPercent);
    const lowStockThreshold = parseInt(form.lowStockThreshold, 10);

    if (
      form.productCode.trim().length === 0 ||
      form.barcodeValue.trim().length === 0 ||
      form.name.trim().length === 0 ||
      form.category.trim().length === 0 ||
      form.unit.trim().length === 0 ||
      isNaN(supplierCost) ||
      isNaN(markupPercent) ||
      isNaN(lowStockThreshold)
    ) return;

    if (editingId !== null) {
      updateMutation.mutate({
        id: editingId,
        productCode: form.productCode.trim(),
        barcodeValue: form.barcodeValue.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        supplierCost,
        markupPercent,
        lowStockThreshold,
        serialTrackingEnabled: form.serialTrackingEnabled,
      });
    } else {
      createMutation.mutate({
        productCode: form.productCode.trim(),
        barcodeValue: form.barcodeValue.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        supplierCost,
        markupPercent,
        lowStockThreshold,
        serialTrackingEnabled: form.serialTrackingEnabled,
      });
    }
  };

  const cancelForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const errorMessage = createMutation.error?.message ?? updateMutation.error?.message ?? '';

  if (tenantSlug === undefined) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        {isAdmin && (
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
            {showForm ? 'Cancel' : '+ New Product'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">
            {editingId !== null ? 'Edit Product' : 'Add Product'}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Product Code *</label>
              <input
                type="text"
                value={form.productCode}
                onChange={(e) => { setForm({ ...form, productCode: e.target.value }); }}
                placeholder="e.g. SKU-001"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Barcode Value *</label>
              <input
                type="text"
                value={form.barcodeValue}
                onChange={(e) => { setForm({ ...form, barcodeValue: e.target.value }); }}
                placeholder="Barcode or QR value"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); }}
                placeholder="Product name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category *</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => { setForm({ ...form, category: e.target.value }); }}
                placeholder="e.g. Electronics, Tools"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Unit *</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => { setForm({ ...form, unit: e.target.value }); }}
                placeholder="e.g. pcs, kg, box"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Low Stock Threshold *</label>
              <input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => { setForm({ ...form, lowStockThreshold: e.target.value }); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Supplier Cost ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.supplierCost}
                onChange={(e) => { setForm({ ...form, supplierCost: e.target.value }); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Markup % *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.markupPercent}
                onChange={(e) => { setForm({ ...form, markupPercent: e.target.value }); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              Selling price: <span className="font-semibold">{computedSellingPrice(form.supplierCost, form.markupPercent)}</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.serialTrackingEnabled}
                onChange={(e) => { setForm({ ...form, serialTrackingEnabled: e.target.checked }); }}
                className="h-4 w-4"
              />
              Enable serial number tracking
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                form.productCode.trim().length === 0 ||
                form.name.trim().length === 0 ||
                isPending
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editingId !== null ? 'Update Product' : 'Add Product'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>

          {errorMessage.length > 0 && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>
      )}

      <input
        type="text"
        placeholder="Search by name, code, or barcode..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {isLoading ? (
        <div>Loading products...</div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((product: NonNullable<typeof data>['items'][number]) => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/${tenantSlug}/products/${product.id}`} className="text-primary underline">
                        {product.productCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{product.name}</td>
                    <td className="px-4 py-3">{product.category}</td>
                    <td className={`px-4 py-3 text-right ${
                      product.currentQuantity <= product.lowStockThreshold ? 'font-medium text-destructive' : ''
                    }`}>
                      {product.currentQuantity} {product.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {'sellingPrice' in product ? `$${Number(product.sellingPrice).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => { startEdit(product as unknown as Parameters<typeof startEdit>[0]); }}
                          className="mr-2 text-sm text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateMutation.mutate({ id: product.id, isActive: !product.isActive });
                            void refetch();
                          }}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          {product.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                      No products found
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
