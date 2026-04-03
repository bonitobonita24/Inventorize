// Tenant audit logs page with filtering by entity type, date range

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const ENTITY_TYPES = [
  '',
  'Product',
  'Supplier',
  'StockIn',
  'StockOut',
  'StockAdjustment',
  'User',
  'Tenant',
] as const;

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = trpc.auditLog.list.useQuery({
    page,
    limit: 50,
    entityType: entityType.length > 0 ? entityType : undefined,
    startDate: startDate.length > 0 ? new Date(startDate).toISOString() : undefined,
    endDate: endDate.length > 0 ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
  });

  const clearFilters = () => {
    setEntityType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasFilters = entityType.length > 0 || startDate.length > 0 || endDate.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Entity Type</label>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {ENTITY_TYPES.filter((t) => t.length > 0).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div>Loading audit logs...</div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data?.total ?? 0} entries{hasFilters ? ' (filtered)' : ''}
            </p>
            {(data?.totalPages ?? 0) > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
                  disabled={page <= 1}
                  className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-sm">
                  Page {page} of {data?.totalPages ?? 1}
                </span>
                <button
                  type="button"
                  onClick={() => { setPage((p) => p + 1); }}
                  disabled={page >= (data?.totalPages ?? 1)}
                  className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Actor</th>
                  <th className="px-4 py-3 text-left font-medium">Entity</th>
                  <th className="px-4 py-3 text-left font-medium">Entity ID</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((log) => (
                  <tr key={log.id} className="border-b border-border">
                    <td className="px-4 py-3 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.actionType === 'CREATE' ? 'bg-green-100 text-green-800' :
                        log.actionType === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                        log.actionType === 'DELETE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{log.actorUser?.name ?? 'System'}</span>
                      {log.actorUser?.email !== undefined && log.actorUser?.email !== null && (
                        <span className="ml-1 text-xs text-muted-foreground">{log.actorUser.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.entityType}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.entityId}</td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {hasFilters ? 'No audit logs match the filters' : 'No audit logs yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
