import { Queue } from 'bullmq';

import { getRedisConnection } from '../connection';
import { QUEUE_NAMES, type XenditWebhookPayload } from './types';

let queue: Queue<XenditWebhookPayload> | null = null;

export function getXenditWebhookQueue(): Queue<XenditWebhookPayload> {
  if (queue !== null) {
    return queue;
  }

  queue = new Queue<XenditWebhookPayload>(QUEUE_NAMES.XENDIT_WEBHOOK, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
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
