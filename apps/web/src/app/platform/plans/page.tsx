// Platform plans page — superadmin plan management (create, update, toggle active)
// Non-tRPC: N/A — all mutations go through tRPC superAdminProcedure

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

type BillingCycle = 'monthly' | 'yearly';

interface PlanFormState {
  name: string;
  description: string;
  priceAmount: string;
  currency: string;
  billingCycle: BillingCycle;
}

const EMPTY_FORM: PlanFormState = {
  name: '',
  description: '',
  priceAmount: '',
  currency: 'PHP',
  billingCycle: 'monthly',
};

function formatCurrency(amount: number | string | { toString(): string }, currency: string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString());
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PlatformPlansPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const utils = trpc.useUtils();

  const { data: plans, isLoading } = trpc.billing.plans.list.useQuery({ activeOnly: false });

  const createPlan = trpc.billing.plans.create.useMutation({
    onSuccess: () => {
      void utils.billing.plans.list.invalidate();
      closeForm();
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const updatePlan = trpc.billing.plans.update.useMutation({
    onSuccess: () => {
      void utils.billing.plans.list.invalidate();
      closeForm();
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(plan: NonNullable<typeof plans>[number]) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      priceAmount: String(Number(plan.priceAmount)),
      currency: plan.currency,
      billingCycle: plan.billingCycle as BillingCycle,
    });
    setFormError('');
    setShowForm(true);
  }

  function handleToggleActive(plan: NonNullable<typeof plans>[number]) {
    updatePlan.mutate({ id: plan.id, isActive: !plan.isActive });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const price = parseFloat(form.priceAmount);
    if (isNaN(price) || price < 0) {
      setFormError('Enter a valid price amount.');
      return;
    }

    if (editingId !== null) {
      updatePlan.mutate({
        id: editingId,
        name: form.name.trim() || undefined,
        description: form.description.trim() || undefined,
      });
    } else {
      createPlan.mutate({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceAmount: price,
        currency: form.currency.trim(),
        billingCycle: form.billingCycle,
      });
    }
  }

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Plan
        </button>
      </div>

      {/* ── Plans table ── */}
      <section className="rounded-lg border border-border">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        )}
        {!isLoading && (plans === undefined || plans.length === 0) && (
          <p className="p-6 text-sm text-muted-foreground">No plans yet. Create one above.</p>
        )}
        {plans !== undefined && plans.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{plan.name}</p>
                    {plan.description !== null && (
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(plan.priceAmount, plan.currency)}
                  </td>
                  <td className="px-4 py-3 capitalize">{plan.billingCycle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        plan.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(plan)}
                        disabled={updatePlan.isPending}
                        className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Create / Edit modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {editingId !== null ? 'Edit Plan' : 'New Plan'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium">Plan Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    placeholder="e.g. Starter, Pro, Enterprise"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    placeholder="Optional short description"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Price Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceAmount}
                    onChange={(e) => setForm((f) => ({ ...f, priceAmount: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                    maxLength={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    placeholder="PHP"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Billing Cycle</label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, billingCycle: e.target.value as BillingCycle }))
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {formError.length > 0 && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
              {(createPlan.isError || updatePlan.isError) && (
                <p className="text-sm text-red-600">
                  {createPlan.error?.message ?? updatePlan.error?.message}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Saving…' : editingId !== null ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
