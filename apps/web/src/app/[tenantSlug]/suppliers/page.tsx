// Suppliers list page with create form and inline edit

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface SupplierFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const emptyForm: SupplierFormData = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);

  const { data, isLoading, refetch } = trpc.supplier.list.useQuery({
    page,
    limit: 50,
    search: search.length > 0 ? search : undefined,
  });

  const createMutation = trpc.supplier.create.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      setShowForm(false);
      void refetch();
    },
  });

  const updateMutation = trpc.supplier.update.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      void refetch();
    },
  });

  const startEdit = (supplier: {
    id: string;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
  }) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      notes: supplier.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (form.name.trim().length === 0) return;

    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim().length > 0 ? form.contactPerson.trim() : null,
      phone: form.phone.trim().length > 0 ? form.phone.trim() : null,
      email: form.email.trim().length > 0 ? form.email.trim() : null,
      address: form.address.trim().length > 0 ? form.address.trim() : null,
      notes: form.notes.trim().length > 0 ? form.notes.trim() : null,
    };

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleActive = (id: string, currentlyActive: boolean) => {
    updateMutation.mutate({ id, isActive: !currentlyActive });
  };

  const cancelForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isError = createMutation.isError || updateMutation.isError;
  const errorMessage = createMutation.error?.message ?? updateMutation.error?.message ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
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
          {showForm ? 'Cancel' : '+ New Supplier'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">
            {editingId !== null ? 'Edit Supplier' : 'Add Supplier'}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); }}
                placeholder="Supplier name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contact Person</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => { setForm({ ...form, contactPerson: e.target.value }); }}
                placeholder="Contact person name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => { setForm({ ...form, phone: e.target.value }); }}
                placeholder="Phone number"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); }}
                placeholder="email@example.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => { setForm({ ...form, address: e.target.value }); }}
              placeholder="Full address"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => { setForm({ ...form, notes: e.target.value }); }}
              placeholder="Additional notes (optional)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={form.name.trim().length === 0 || isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isPending
                ? 'Saving...'
                : editingId !== null
                  ? 'Update Supplier'
                  : 'Add Supplier'}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {isError && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      )}

      <input
        type="text"
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {isLoading ? (
        <div>Loading suppliers...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((supplier: NonNullable<typeof data>['items'][number]) => (
                <tr key={supplier.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{supplier.name}</td>
                  <td className="px-4 py-3">{supplier.contactPerson ?? '-'}</td>
                  <td className="px-4 py-3">{supplier.phone ?? '-'}</td>
                  <td className="px-4 py-3">{supplier.email ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { startEdit(supplier); }}
                      className="mr-2 text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { toggleActive(supplier.id, supplier.isActive); }}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      {supplier.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No suppliers found
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
