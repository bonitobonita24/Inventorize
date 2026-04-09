// Tenant billing page — current subscription, available plans, payment history, refund requests
// Admin only for mutations; all authenticated tenant users can view.

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc';

function formatCurrency(amount: number | string | { toString(): string }, currency: string): string {
  const str = typeof amount === 'number' ? amount : parseFloat(amount.toString());
  return `${currency} ${str.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: Date | string | null): string {
  if (d === null) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
    requested: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-700',
    processed: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function BillingPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [paymentPage, setPaymentPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);

  // Refund request form state
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');

  const utils = trpc.useUtils();

  const { data: currentSub, isLoading: subLoading } = trpc.billing.subscriptions.getCurrent.useQuery();
  const { data: plans, isLoading: plansLoading } = trpc.billing.plans.list.useQuery({ activeOnly: true });
  const { data: payments, isLoading: paymentsLoading } = trpc.billing.payments.list.useQuery({
    page: paymentPage,
    limit: 10,
  });
  const { data: myRefunds } = trpc.billing.refunds.list.useQuery({ page: refundPage, limit: 10 });

  const createSubscription = trpc.billing.subscriptions.create.useMutation({
    onSuccess: () => {
      void utils.billing.subscriptions.getCurrent.invalidate();
    },
  });

  const createInvoice = trpc.billing.xendit.createInvoice.useMutation({
    onSuccess: (data) => {
      window.location.href = data.invoiceUrl;
    },
  });

  const requestRefund = trpc.billing.refunds.request.useMutation({
    onSuccess: () => {
      setShowRefundForm(false);
      setRefundPaymentId('');
      setRefundAmount('');
      setRefundReason('');
      setRefundError('');
      void utils.billing.refunds.list.invalidate();
      void utils.billing.payments.list.invalidate();
    },
    onError: (err) => {
      setRefundError(err.message);
    },
  });

  async function handleSubscribe(planId: string) {
    try {
      const sub = await createSubscription.mutateAsync({ planId });
      const result = await createInvoice.mutateAsync({ subscriptionId: sub.id });
      window.location.href = result.invoiceUrl;
    } catch {
      // errors surfaced via mutation state
    }
  }

  function handleRefundSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRefundError('');
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      setRefundError('Enter a valid amount.');
      return;
    }
    if (refundReason.length < 10) {
      setRefundError('Reason must be at least 10 characters.');
      return;
    }
    requestRefund.mutate({ paymentId: refundPaymentId, amount: amt, reason: refundReason });
  }

  const _ = tenantSlug; // suppress unused warning — slug is in params for layout

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Billing</h1>

      {/* ── Current subscription ── */}
      <section className="rounded-lg border border-border p-6">
        <h2 className="mb-4 text-lg font-semibold">Current Subscription</h2>
        {subLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!subLoading && currentSub === null && (
          <p className="text-sm text-muted-foreground">No active subscription.</p>
        )}
        {currentSub !== null && currentSub !== undefined && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-medium">{currentSub.plan.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="font-medium">
                {formatCurrency(currentSub.plan.priceAmount, currentSub.plan.currency)} / {currentSub.plan.billingCycle}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <StatusBadge status={currentSub.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Renewal</p>
              <p className="font-medium">{formatDate(currentSub.currentPeriodEnd)}</p>
            </div>
          </div>
        )}
      </section>

      {/* ── Available plans ── */}
      {isAdmin && (
        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-semibold">Available Plans</h2>
          {plansLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!plansLoading && (plans === undefined || plans.length === 0) && (
            <p className="text-sm text-muted-foreground">No plans available.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans?.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-border p-4">
                <p className="font-semibold">{plan.name}</p>
                {plan.description !== null && (
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                )}
                <p className="mt-2 text-lg font-bold">
                  {formatCurrency(plan.priceAmount, plan.currency)}
                  <span className="text-sm font-normal text-muted-foreground"> / {plan.billingCycle}</span>
                </p>
                <button
                  onClick={() => void handleSubscribe(plan.id)}
                  disabled={
                    currentSub !== null && currentSub !== undefined ||
                    createSubscription.isPending ||
                    createInvoice.isPending
                  }
                  className="mt-4 w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createSubscription.isPending || createInvoice.isPending ? 'Processing…' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
          {(createSubscription.isError || createInvoice.isError) && (
            <p className="mt-2 text-sm text-red-600">
              {createSubscription.error?.message ?? createInvoice.error?.message}
            </p>
          )}
        </section>
      )}

      {/* ── Payment history ── */}
      <section className="rounded-lg border border-border p-6">
        <h2 className="mb-4 text-lg font-semibold">Payment History</h2>
        {paymentsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!paymentsLoading && (payments === undefined || payments.items.length === 0) && (
          <p className="text-sm text-muted-foreground">No payments found.</p>
        )}
        {payments !== undefined && payments.items.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  {isAdmin && <th className="pb-2 font-medium">Action</th>}
                </tr>
              </thead>
              <tbody>
                {payments.items.map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-muted-foreground">{formatDate(payment.createdAt)}</td>
                    <td className="py-2">{payment.subscription.plan.name}</td>
                    <td className="py-2">{formatCurrency(payment.amount, payment.currency)}</td>
                    <td className="py-2">
                      <StatusBadge status={payment.status} />
                    </td>
                    {isAdmin && (
                      <td className="py-2">
                        {payment.status === 'paid' && (
                          <button
                            onClick={() => {
                              setRefundPaymentId(payment.id);
                              setRefundAmount(String(Number(payment.amount)));
                              setShowRefundForm(true);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Request refund
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {payments.page} of {payments.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                  disabled={payments.page === 1}
                  className="rounded border border-border px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPaymentPage((p) => p + 1)}
                  disabled={payments.page >= payments.totalPages}
                  className="rounded border border-border px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── My refund requests ── */}
      <section className="rounded-lg border border-border p-6">
        <h2 className="mb-4 text-lg font-semibold">Refund Requests</h2>
        {myRefunds === undefined && <p className="text-sm text-muted-foreground">Loading…</p>}
        {myRefunds !== undefined && myRefunds.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No refund requests.</p>
        )}
        {myRefunds !== undefined && myRefunds.items.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {myRefunds.items.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-muted-foreground">{formatDate(r.createdAt)}</td>
                    <td className="py-2">{formatCurrency(r.amount, r.currency)}</td>
                    <td className="max-w-xs truncate py-2 text-muted-foreground">{r.reason}</td>
                    <td className="py-2">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {myRefunds.page} of {myRefunds.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setRefundPage((p) => Math.max(1, p - 1))}
                  disabled={myRefunds.page === 1}
                  className="rounded border border-border px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setRefundPage((p) => p + 1)}
                  disabled={myRefunds.page >= myRefunds.totalPages}
                  className="rounded border border-border px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Refund request modal ── */}
      {showRefundForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-lg font-semibold">Request Refund</h3>
            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Refund Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Reason</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={4}
                  minLength={10}
                  maxLength={1000}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  placeholder="Please explain the reason for the refund (min 10 characters)…"
                  required
                />
              </div>
              {refundError.length > 0 && (
                <p className="text-sm text-red-600">{refundError}</p>
              )}
              {requestRefund.isError && (
                <p className="text-sm text-red-600">{requestRefund.error.message}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRefundForm(false);
                    setRefundError('');
                  }}
                  className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestRefund.isPending}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {requestRefund.isPending ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
