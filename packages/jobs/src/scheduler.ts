import { getLowStockCheckQueue } from './queues/low-stock-check.js';

export async function registerScheduledJobs(): Promise<void> {
  const lowStockQueue = getLowStockCheckQueue();

  const existingRepeatable = await lowStockQueue.getRepeatableJobs();
  for (const job of existingRepeatable) {
    await lowStockQueue.removeRepeatableByKey(job.key);
  }

  await lowStockQueue.add(
    'daily-low-stock-check',
    {
      tenantId: 'ALL_TENANTS',
      userId: 'SYSTEM',
      triggeredAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: '0 0 * * *',
      },
    },
  );

  console.log('[scheduler] Registered daily low-stock-check cron at 00:00 UTC');
}
