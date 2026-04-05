// Users management page — admin only, create / edit / disable + role assignment

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

type TenantRole = 'admin' | 'warehouse_staff' | 'purchasing_staff';

interface CreateFormData {
  name: string;
  email: string;
  role: TenantRole;
}

interface EditFormData {
  name: string;
  email: string;
  role: TenantRole;
}

const emptyCreateForm: CreateFormData = {
  name: '',
  email: '',
  role: 'warehouse_staff',
};

const ROLE_LABELS: Record<TenantRole | 'super_admin', string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  warehouse_staff: 'Warehouse Staff',
  purchasing_staff: 'Purchasing Staff',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormData>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditFormData>({ name: '', email: '', role: 'warehouse_staff' });

  const { data, isLoading, refetch } = trpc.user.list.useQuery({
    page,
    limit: 50,
    search: search.length > 0 ? search : undefined,
  });

  const createMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      setCreateForm(emptyCreateForm);
      setShowCreateForm(false);
      void refetch();
    },
  });

  const updateMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      void refetch();
    },
  });

  const startEdit = (user: { id: string; name: string; email: string; role: string }) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role as TenantRole,
    });
    setShowCreateForm(false);
  };

  const handleCreate = () => {
    if (
      createForm.name.trim().length === 0 ||
      createForm.email.trim().length === 0
    ) return;

    createMutation.mutate({
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      role: createForm.role,
    });
  };

  const handleUpdate = () => {
    if (editingId === null) return;
    updateMutation.mutate({
      id: editingId,
      name: editForm.name.trim().length > 0 ? editForm.name.trim() : undefined,
      email: editForm.email.trim().length > 0 ? editForm.email.trim() : undefined,
      role: editForm.role,
    });
  };

  const toggleActive = (id: string, currentlyActive: boolean) => {
    updateMutation.mutate({ id, isActive: !currentlyActive });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const isCreatePending = createMutation.isPending;
  const isUpdatePending = updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          type="button"
          onClick={() => {
            if (showCreateForm) {
              setShowCreateForm(false);
              setCreateForm(emptyCreateForm);
            } else {
              setShowCreateForm(true);
              setEditingId(null);
            }
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showCreateForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showCreateForm && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">Add User</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => { setCreateForm({ ...createForm, name: e.target.value }); }}
                placeholder="Full name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => { setCreateForm({ ...createForm, email: e.target.value }); }}
                placeholder="user@example.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Role *</label>
              <select
                value={createForm.role}
                onChange={(e) => { setCreateForm({ ...createForm, role: e.target.value as TenantRole }); }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="warehouse_staff">Warehouse Staff</option>
                <option value="purchasing_staff">Purchasing Staff</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={
                createForm.name.trim().length === 0 ||
                createForm.email.trim().length === 0 ||
                isCreatePending
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isCreatePending ? 'Creating...' : 'Create User'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive">{createMutation.error.message}</p>
          )}
        </div>
      )}

      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {isLoading ? (
        <div>Loading users...</div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Last Login</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((user: NonNullable<typeof data>['items'][number]) => (
                  <>
                    <tr key={user.id} className="border-b border-border">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {user.lastLoginAt !== null ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (editingId === user.id) {
                              cancelEdit();
                            } else {
                              startEdit(user);
                            }
                          }}
                          className="mr-2 text-sm text-blue-600 hover:underline"
                        >
                          {editingId === user.id ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { toggleActive(user.id, user.isActive); }}
                          disabled={isUpdatePending}
                          className="text-sm text-muted-foreground hover:underline disabled:opacity-50"
                        >
                          {user.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>

                    {editingId === user.id && (
                      <tr key={`${user.id}-edit`} className="border-b border-border bg-muted/20">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Edit User
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium">Name</label>
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => { setEditForm({ ...editForm, name: e.target.value }); }}
                                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium">Email</label>
                                <input
                                  type="email"
                                  value={editForm.email}
                                  onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); }}
                                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium">Role</label>
                                <select
                                  value={editForm.role}
                                  onChange={(e) => { setEditForm({ ...editForm, role: e.target.value as TenantRole }); }}
                                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="warehouse_staff">Warehouse Staff</option>
                                  <option value="purchasing_staff">Purchasing Staff</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleUpdate}
                                disabled={isUpdatePending}
                                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                              >
                                {isUpdatePending ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                            {updateMutation.isError && (
                              <p className="text-sm text-destructive">{updateMutation.error.message}</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
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
