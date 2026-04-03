import { Queue } from 'bullmq';

import { getRedisConnection } from '../connection';
import { QUEUE_NAMES, type EmailNotificationPayload } from './types';

let queue: Queue<EmailNotificationPayload> | null = null;

export function getEmailNotificationsQueue(): Queue<EmailNotificationPayload> {
  if (queue !== null) {
    return queue;
  }

  queue = new Queue<EmailNotificationPayload>(QUEUE_NAMES.EMAIL_NOTIFICATIONS, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: {
        count: 2000,
      },
      removeOnFail: {
        count: 5000,
      },
    },
  });

  return queue;
}
