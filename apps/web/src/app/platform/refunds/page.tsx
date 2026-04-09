// Platform refunds page — superadmin refund review queue (list all, approve/reject)
// Non-tRPC: N/A — all mutations go through tRPC superAdminProcedure

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

type RefundStatus = 'requested' | 'approved' | 'rejected' | 'processed' | 'failed';

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-700',
  processed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  );
}

function formatCurrency(amount: number | string | { toString(): string }, currency: string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString());
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: Date | string | null): string {
  if (d === null) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PlatformRefundsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RefundStatus | ''>('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null);
  const [reviewError, setReviewError] = useState('');

  const utils = trpc.useUtils();

  const queryInput = {
    page,
    limit: 20,
    ...(statusFilter !== '' ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = trpc.billing.refunds.listAll.useQuery(queryInput);

  const reviewMutation = trpc.billing.refunds.review.useMutation({
    onSuccess: () => {
      void utils.billing.refunds.listAll.invalidate();
      closeReview();
    },
    onError: (err) => {
      setReviewError(err.message);
    },
  });

  function openReview(id: string, action: 'approved' | 'rejected') {
    setReviewingId(id);
    setReviewAction(action);
    setReviewError('');
  }

  function closeReview() {
    setReviewingId(null);
    setReviewAction(null);
    setReviewError('');
  }

  function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reviewingId === null || reviewAction === null) return;
    setReviewError('');
    reviewMutation.mutate({ id: reviewingId, decision: reviewAction });
  }

  const statusOptions: Array<{ value: RefundStatus | ''; label: string }> = [
    { value: '', label: 'All statuses' },
    { value: 'requested', label: 'Requested' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'processed', label: 'Processed' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Refund Requests</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as RefundStatus | '');
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Refunds table ── */}
      <section className="rounded-lg border border-border">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        )}
        {!isLoading && (data === undefined || data.items.length === 0) && (
          <p className="p-6 text-sm text-muted-foreground">No refund requests found.</p>
        )}
        {data !== undefined && data.items.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Requested By</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((refund) => (
                  <tr key={refund.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(refund.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {refund.requestedByUser !== null ? (
                        <div>
                          <p className="font-medium">{refund.requestedByUser.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{refund.requestedByUser.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {refund.payment.subscription.plan.name}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(refund.amount, refund.currency)}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-muted-foreground" title={refund.reason}>
                        {refund.reason}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={refund.status} />
                    </td>
                    <td className="px-4 py-3">
                      {refund.status === 'requested' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openReview(refund.id, 'approved')}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReview(refund.id, 'rejected')}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {refund.status !== 'requested' && refund.reviewedByUser !== null && (
                        <p className="text-xs text-muted-foreground">
                          by {refund.reviewedByUser.name ?? refund.reviewedByUser.email}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Page {data.page} of {data.totalPages} &middot; {data.total} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page === 1}
                  className="rounded border border-border px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page >= data.totalPages}
                  className="rounded border border-border px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Review modal ── */}
      {reviewingId !== null && reviewAction !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 text-lg font-semibold capitalize">
              {reviewAction} Refund
            </h3>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {reviewError.length > 0 && (
                <p className="text-sm text-red-600">{reviewError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeReview}
                  className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
                    reviewAction === 'approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewMutation.isPending
                    ? 'Submitting…'
                    : reviewAction === 'approved'
                    ? 'Confirm Approve'
                    : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
