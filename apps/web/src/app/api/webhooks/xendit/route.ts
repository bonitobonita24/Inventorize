// Non-tRPC: manual auth required
// Xendit webhook receiver — verifies x-callback-token, enqueues for async processing
// Docs: https://docs.xendit.co/docs/handling-webhooks

import { timingSafeEqual } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/env';
import { getXenditWebhookQueue } from '@inventorize/jobs';

function verifyToken(incoming: string, expected: string): boolean {
  try {
    const incomingBuf = Buffer.from(incoming, 'utf-8');
    const expectedBuf = Buffer.from(expected, 'utf-8');
    if (incomingBuf.length !== expectedBuf.length) {
      return false;
    }
    return timingSafeEqual(incomingBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get('x-callback-token') ?? '';

  if (!verifyToken(token, env.XENDIT_WEBHOOK_TOKEN)) {
    console.warn(`[xendit-webhook] Invalid x-callback-token from ${req.headers.get('x-forwarded-for') ?? 'unknown'}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  let rawBody: string;

  try {
    rawBody = await req.text();
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const webhookType = typeof body['event'] === 'string' ? body['event'] : 'UNKNOWN';
  const data = typeof body['data'] === 'object' && body['data'] !== null
    ? (body['data'] as Record<string, unknown>)
    : body;

  const xenditInvoiceId = typeof data['id'] === 'string' ? data['id'] : null;
  const xenditRefundId = typeof data['id'] === 'string' && webhookType.startsWith('XENDIT_REFUND')
    ? data['id']
    : null;
  const externalId = typeof data['external_id'] === 'string' ? data['external_id'] : null;
  const status = typeof data['status'] === 'string' ? data['status'] : '';
  const amount = typeof data['amount'] === 'number' ? data['amount'] : null;
  const currency = typeof data['currency'] === 'string' ? data['currency'] : null;
  const paidAt = typeof data['paid_at'] === 'string' ? data['paid_at'] : null;

  const queue = getXenditWebhookQueue();

  await queue.add('process-webhook', {
    webhookType,
    xenditInvoiceId: webhookType.startsWith('XENDIT_REFUND') ? null : xenditInvoiceId,
    xenditRefundId,
    externalId,
    status,
    amount,
    currency,
    paidAt,
    rawBody,
    receivedAt: new Date().toISOString(),
  });

  // Always return 200 immediately — Xendit retries on non-2xx
  return NextResponse.json({ received: true }, { status: 200 });
}
