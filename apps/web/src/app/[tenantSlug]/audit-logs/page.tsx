// Tenant audit logs page

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc.js';

export default function AuditLogsPage() {
  const [page] = useState(1);
  const { data, isLoading } = trpc.auditLog.list.useQuery({ page, limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>

      {isLoading ? (
        <div>Loading audit logs...</div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Actor</th>
                <th className="px-4 py-3 text-left font-medium">Entity</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((log) => (
                <tr key={log.id} className="border-b border-border">
                  <td className="px-4 py-3 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.actionType}</td>
                  <td className="px-4 py-3">{log.actorUser?.name ?? 'System'}</td>
                  <td className="px-4 py-3 text-xs">{log.entityType}:{log.entityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
