import { Worker, type Job } from 'bullmq';

import { getRedisConnection } from '../connection';
import { QUEUE_NAMES, type EmailNotificationPayload } from '../queues/types';

export function createEmailNotificationsWorker(
  processor: (job: Job<EmailNotificationPayload>) => Promise<void>,
): Worker<EmailNotificationPayload> {
  const worker = new Worker<EmailNotificationPayload>(
    QUEUE_NAMES.EMAIL_NOTIFICATIONS,
    processor,
    {
      connection: getRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 30,
        duration: 60_000,
      },
    },
  );

  worker.on('completed', (job) => {
    console.log(
      `[email] Job ${job.id} completed: ${job.data.type} to ${job.data.recipientEmail}`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[email] Job ${job?.id} failed: ${job?.data.type} to ${job?.data.recipientEmail}:`,
      err.message,
    );
  });

  return worker;
}
