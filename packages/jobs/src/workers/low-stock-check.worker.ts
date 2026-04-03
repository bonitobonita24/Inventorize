import { Worker, type Job } from 'bullmq';

import { getRedisConnection } from '../connection.js';
import { QUEUE_NAMES, type LowStockCheckPayload } from '../queues/types.js';

export function createLowStockCheckWorker(
  processor: (job: Job<LowStockCheckPayload>) => Promise<void>,
): Worker<LowStockCheckPayload> {
  const worker = new Worker<LowStockCheckPayload>(QUEUE_NAMES.LOW_STOCK_CHECK, processor, {
    connection: getRedisConnection(),
    concurrency: 1,
    limiter: {
      max: 10,
      duration: 60_000,
    },
  });

  worker.on('completed', (job) => {
    console.log(`[low-stock-check] Job ${job.id} completed for tenant ${job.data.tenantId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[low-stock-check] Job ${job?.id} failed for tenant ${job?.data.tenantId}:`,
      err.message,
    );
  });

  return worker;
}
