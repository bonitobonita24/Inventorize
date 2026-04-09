import { Worker, type Job } from 'bullmq';

import { getRedisConnection } from '../connection';
import { QUEUE_NAMES, type XenditWebhookPayload } from '../queues/types';

export function createXenditWebhookWorker(
  processor: (job: Job<XenditWebhookPayload>) => Promise<void>,
): Worker<XenditWebhookPayload> {
  const worker = new Worker<XenditWebhookPayload>(
    QUEUE_NAMES.XENDIT_WEBHOOK,
    processor,
    {
      connection: getRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 50,
        duration: 60_000,
      },
    },
  );

  worker.on('completed', (job) => {
    console.log(
      `[xendit-webhook] Job ${job.id} completed: ${job.data.webhookType} invoice=${job.data.xenditInvoiceId ?? 'n/a'}`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[xendit-webhook] Job ${job?.id} failed: ${job?.data.webhookType} invoice=${job?.data.xenditInvoiceId ?? 'n/a'}:`,
      err.message,
    );
  });

  return worker;
}
