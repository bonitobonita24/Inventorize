// Xendit webhook processor — handles INVOICE.PAID, INVOICE.EXPIRED, XENDIT_REFUND.DONE/FAILED
// Runs inside the BullMQ xendit-webhook-processor queue (async, after immediate 200 to Xendit)

import type { Job } from 'bullmq';
import { platformPrisma } from '@inventorize/db';
import type { XenditWebhookPayload } from '@inventorize/jobs';

export async function processXenditWebhook(job: Job<XenditWebhookPayload>): Promise<void> {
  const { webhookType, xenditInvoiceId, xenditRefundId } = job.data;

  console.log(`[xendit-webhook] Processing ${webhookType} job=${job.id}`);

  switch (webhookType) {
    case 'INVOICE.PAID':
      await handleInvoicePaid(job.data);
      break;
    case 'INVOICE.EXPIRED':
      await handleInvoiceExpired(job.data);
      break;
    case 'XENDIT_REFUND.DONE':
      await handleRefundDone(job.data);
      break;
    case 'XENDIT_REFUND.FAILED':
      await handleRefundFailed(job.data);
      break;
    default:
      console.log(`[xendit-webhook] Unhandled webhook type: ${webhookType} invoice=${xenditInvoiceId ?? xenditRefundId ?? 'n/a'}`);
  }
}

async function handleInvoicePaid(data: XenditWebhookPayload): Promise<void> {
  const { xenditInvoiceId, externalId, amount, currency, paidAt } = data;

  if (xenditInvoiceId === null) {
    console.error('[xendit-webhook] INVOICE.PAID missing xenditInvoiceId — skipping');
    return;
  }

  // Idempotent: check if already processed
  const payment = await platformPrisma.payment.findUnique({
    where: { xenditInvoiceId },
    include: { subscription: { include: { plan: true } } },
  });

  if (payment === null) {
    // Attempt lookup by external_id (our internal payment ID) as fallback
    if (externalId === null) {
      console.error(`[xendit-webhook] INVOICE.PAID no payment found for xenditInvoiceId=${xenditInvoiceId}`);
      return;
    }
    const byId = await platformPrisma.payment.findUnique({
      where: { id: externalId },
      include: { subscription: { include: { plan: true } } },
    });
    if (byId === null) {
      console.error(`[xendit-webhook] INVOICE.PAID no payment found for externalId=${externalId}`);
      return;
    }

    await activatePaymentAndSubscription(byId, xenditInvoiceId, data);
    return;
  }

  if (payment.status === 'paid') {
    console.log(`[xendit-webhook] INVOICE.PAID already processed for xenditInvoiceId=${xenditInvoiceId} — skipping`);
    return;
  }

  await activatePaymentAndSubscription(payment, xenditInvoiceId, data);
}

async function activatePaymentAndSubscription(
  payment: Awaited<ReturnType<typeof platformPrisma.payment.findUnique>> & { subscription: { plan: { billingCycle: string } } } | NonNullable<Awaited<ReturnType<typeof platformPrisma.payment.findUnique>> & { subscription: { plan: { billingCycle: string } } }>,
  xenditInvoiceId: string,
  data: XenditWebhookPayload,
): Promise<void> {
  if (payment === null) return;

  const paidAtDate = data.paidAt !== null ? new Date(data.paidAt) : new Date();
  const billingCycle = payment.subscription.plan.billingCycle;
  const periodEnd = new Date(paidAtDate);

  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  await platformPrisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        xenditInvoiceId,
        status: 'paid',
        paidAt: paidAtDate,
        ...(data.currency !== null ? { currency: data.currency } : {}),
      },
    });

    await tx.tenantSubscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: 'active',
        currentPeriodStart: paidAtDate,
        currentPeriodEnd: periodEnd,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: payment.tenantId,
        actorUserId: 'SYSTEM',
        actionType: 'PAYMENT_CONFIRMED',
        entityType: 'Payment',
        entityId: payment.id,
        afterStateJson: { status: 'paid', xenditInvoiceId, paidAt: paidAtDate.toISOString() },
      },
    });
  });

  console.log(`[xendit-webhook] INVOICE.PAID activated subscription=${payment.subscriptionId} payment=${payment.id}`);
}

async function handleInvoiceExpired(data: XenditWebhookPayload): Promise<void> {
  const { xenditInvoiceId, externalId } = data;

  if (xenditInvoiceId === null) {
    console.error('[xendit-webhook] INVOICE.EXPIRED missing xenditInvoiceId — skipping');
    return;
  }

  const payment = xenditInvoiceId !== null
    ? await platformPrisma.payment.findUnique({ where: { xenditInvoiceId } })
    : externalId !== null
      ? await platformPrisma.payment.findUnique({ where: { id: externalId } })
      : null;

  if (payment === null) {
    console.warn(`[xendit-webhook] INVOICE.EXPIRED no payment found for xenditInvoiceId=${xenditInvoiceId}`);
    return;
  }

  if (payment.status !== 'pending') {
    console.log(`[xendit-webhook] INVOICE.EXPIRED payment already in status=${payment.status} — skipping`);
    return;
  }

  await platformPrisma.payment.update({
    where: { id: payment.id },
    data: { status: 'failed' },
  });

  console.log(`[xendit-webhook] INVOICE.EXPIRED marked payment=${payment.id} as failed`);
}

async function handleRefundDone(data: XenditWebhookPayload): Promise<void> {
  const { xenditRefundId } = data;

  if (xenditRefundId === null) {
    console.error('[xendit-webhook] XENDIT_REFUND.DONE missing xenditRefundId — skipping');
    return;
  }

  const refund = await platformPrisma.refund.findUnique({ where: { xenditRefundId } });

  if (refund === null) {
    console.warn(`[xendit-webhook] XENDIT_REFUND.DONE no refund found for xenditRefundId=${xenditRefundId}`);
    return;
  }

  if (refund.status === 'processed') {
    console.log(`[xendit-webhook] XENDIT_REFUND.DONE already processed refund=${refund.id} — skipping`);
    return;
  }

  await platformPrisma.refund.update({
    where: { id: refund.id },
    data: {
      status: 'processed',
      processedAt: new Date(),
    },
  });

  console.log(`[xendit-webhook] XENDIT_REFUND.DONE refund=${refund.id} marked processed`);
}

async function handleRefundFailed(data: XenditWebhookPayload): Promise<void> {
  const { xenditRefundId } = data;

  if (xenditRefundId === null) {
    console.error('[xendit-webhook] XENDIT_REFUND.FAILED missing xenditRefundId — skipping');
    return;
  }

  const refund = await platformPrisma.refund.findUnique({ where: { xenditRefundId } });

  if (refund === null) {
    console.warn(`[xendit-webhook] XENDIT_REFUND.FAILED no refund found for xenditRefundId=${xenditRefundId}`);
    return;
  }

  await platformPrisma.refund.update({
    where: { id: refund.id },
    data: { status: 'failed' },
  });

  // Log for manual resolution — no DLQ per PRODUCT.md spec
  console.error(
    `[xendit-webhook] XENDIT_REFUND.FAILED refund=${refund.id} flagged for manual resolution. xenditRefundId=${xenditRefundId}`,
  );
}
