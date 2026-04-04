// Platform tenants page — list, create, suspend/reactivate tenants + provision first admin

'use client';

import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

export default function PlatformTenantsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'suspended' | 'trial' | ''>('');

  // --- Create Tenant state ---
  const [showCreate, setShowCreate] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [contactEmail, setContactEmail] = useState('');

  // --- Create Admin state (shown after tenant creation) ---
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);
  const [createdTenantName, setCreatedTenantName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // --- Confirm dialog state ---
  const [confirmAction, setConfirmAction] = useState<{ tenantId: string; tenantName: string; status: 'active' | 'suspended' } | null>(null);

  const queryInput = {
    page,
    limit: 50,
    ...(search.length > 0 ? { search } : {}),
    ...(statusFilter !== '' ? { status: statusFilter as 'active' | 'suspended' | 'trial' } : {}),
  };

  const { data, isLoading, refetch } = trpc.platform.listTenants.useQuery(queryInput);

  const slugCheck = trpc.platform.checkSlugAvailability.useQuery(
    { slug },
    { enabled: slug.length > 0 },
  );

  const createTenantMutation = trpc.platform.createTenant.useMutation({
    onSuccess: (tenant) => {
      setCreatedTenantId(tenant.id);
      setCreatedTenantName(tenant.name);
      void refetch();
    },
  });

  const createAdminMutation = trpc.platform.createTenantAdmin.useMutation({
    onSuccess: () => {
      resetAllForms();
      void refetch();
    },
  });

  const updateStatusMutation = trpc.platform.updateTenantStatus.useMutation({
    onSuccess: () => {
      setConfirmAction(null);
      void refetch();
    },
  });

  const resetAllForms = useCallback(() => {
    setShowCreate(false);
    setTenantName('');
    setSlug('');
    setSlugEdited(false);
    setContactEmail('');
    setCreatedTenantId(null);
    setCreatedTenantName('');
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    createTenantMutation.reset();
    createAdminMutation.reset();
  }, [createTenantMutation, createAdminMutation]);

  // Auto-generate slug from tenant name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(toSlug(tenantName));
    }
  }, [tenantName, slugEdited]);

  const handleCreateTenant = () => {
    if (tenantName.trim().length === 0 || slug.length === 0 || contactEmail.trim().length === 0) return;
    createTenantMutation.mutate({ name: tenantName.trim(), slug, contactEmail: contactEmail.trim() });
  };

  const handleCreateAdmin = () => {
    if (createdTenantId === null || adminName.trim().length === 0 || adminEmail.trim().length === 0 || adminPassword.length < 8) return;
    createAdminMutation.mutate({
      tenantId: createdTenantId,
      name: adminName.trim(),
      email: adminEmail.trim(),
      password: adminPassword,
    });
  };

  const slugAvailable = slugCheck.data?.available === true;
  const slugUnavailable = slug.length > 0 && slugCheck.data?.available === false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <button
          type="button"
          onClick={() => { showCreate ? resetAllForms() : setShowCreate(true); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showCreate ? 'Cancel' : '+ New Tenant'}
        </button>
      </div>

      {/* Create Tenant Form */}
      {showCreate && createdTenantId === null && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">Create New Tenant</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Organization Name *</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => { setTenantName(e.target.value); }}
                placeholder="Acme Corporation"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contact Email *</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => { setContactEmail(e.target.value); }}
                placeholder="admin@acme.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">URL Slug *</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(toSlug(e.target.value));
                  setSlugEdited(true);
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              {slug.length > 0 && (
                <span className={`whitespace-nowrap text-xs font-medium ${
                  slugCheck.isLoading ? 'text-muted-foreground' :
                  slugAvailable ? 'text-green-600' :
                  slugUnavailable ? 'text-red-600' : ''
                }`}>
                  {slugCheck.isLoading ? 'Checking...' :
                   slugAvailable ? 'Available' :
                   slugUnavailable ? 'Already taken' : ''}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Users will access at: /
              {slug.length > 0 ? slug : 'slug'}
              /dashboard
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateTenant}
              disabled={
                tenantName.trim().length === 0 ||
                slug.length === 0 ||
                contactEmail.trim().length === 0 ||
                slugUnavailable ||
                createTenantMutation.isPending
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createTenantMutation.isPending ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>

          {createTenantMutation.isError && (
            <p className="text-sm text-red-600">{createTenantMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Create First Admin Form (shown after tenant creation) */}
      {createdTenantId !== null && (
        <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <div>
            <h2 className="text-lg font-semibold">Tenant Created Successfully</h2>
            <p className="text-sm text-muted-foreground">
              Now create the first admin user for <strong>{createdTenantName}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Admin Name *</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => { setAdminName(e.target.value); }}
                placeholder="John Doe"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admin Email *</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => { setAdminEmail(e.target.value); }}
                placeholder="john@acme.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password * (min 8 chars)</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); }}
                placeholder="********"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateAdmin}
              disabled={
                adminName.trim().length === 0 ||
                adminEmail.trim().length === 0 ||
                adminPassword.length < 8 ||
                createAdminMutation.isPending
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createAdminMutation.isPending ? 'Creating Admin...' : 'Create Admin & Send Welcome Email'}
            </button>
            <button
              type="button"
              onClick={resetAllForms}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Skip (Create Admin Later)
            </button>
          </div>

          {createAdminMutation.isError && (
            <p className="text-sm text-red-600">{createAdminMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search tenants..."
          className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="trial">Trial</option>
        </select>
      </div>

      {/* Tenants Table */}
      {isLoading ? (
        <div className="p-4">Loading tenants...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Users</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((tenant) => (
                <tr key={tenant.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{tenant.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      tenant.status === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{tenant._count.users}</td>
                  <td className="px-4 py-3 text-right">{tenant._count.products}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {tenant.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => { setConfirmAction({ tenantId: tenant.id, tenantName: tenant.name, status: 'suspended' }); }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Suspend
                      </button>
                    ) : tenant.status === 'suspended' ? (
                      <button
                        type="button"
                        onClick={() => { setConfirmAction({ tenantId: tenant.id, tenantName: tenant.name, status: 'active' }); }}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Reactivate
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No tenants found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data !== undefined && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => { setPage(page - 1); }}
              className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => { setPage(page + 1); }}
              className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">
              {confirmAction.status === 'suspended' ? 'Suspend Tenant' : 'Reactivate Tenant'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmAction.status === 'suspended'
                ? `Are you sure you want to suspend "${confirmAction.tenantName}"? All users in this organization will be unable to log in.`
                : `Are you sure you want to reactivate "${confirmAction.tenantName}"? Users will be able to log in again.`
              }
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setConfirmAction(null); }}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateStatusMutation.mutate({ id: confirmAction.tenantId, status: confirmAction.status });
                }}
                disabled={updateStatusMutation.isPending}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                  confirmAction.status === 'suspended' ? 'bg-red-600' : 'bg-green-600'
                } disabled:opacity-50`}
              >
                {updateStatusMutation.isPending ? 'Updating...' :
                 confirmAction.status === 'suspended' ? 'Suspend' : 'Reactivate'}
              </button>
            </div>
            {updateStatusMutation.isError && (
              <p className="mt-2 text-sm text-red-600">{updateStatusMutation.error.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
