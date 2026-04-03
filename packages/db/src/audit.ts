// L5 — Immutable AuditLog write helper
// Active in BOTH single-tenant and multi-tenant mode.
// Every mutation must call writeAuditLog inside the same transaction.

import { Prisma } from '@prisma/client';

export interface AuditLogEntry {
  tenantId: string | null;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Write an immutable audit record. Call inside a Prisma transaction.
 * AuditLog records are append-only — never update or delete.
 */
export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  entry: AuditLogEntry,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      tenantId: entry.tenantId,
      actorUserId: entry.userId,
      actionType: entry.action,
      entityType: entry.entity,
      entityId: entry.entityId,
      beforeStateJson: entry.before !== undefined
        ? (entry.before as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      afterStateJson: entry.after !== undefined
        ? (entry.after as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}
