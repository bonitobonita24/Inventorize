import { Queue } from 'bullmq';

import { getRedisConnection } from '../connection';
import { QUEUE_NAMES, type LowStockCheckPayload } from './types';

let queue: Queue<LowStockCheckPayload> | null = null;

export function getLowStockCheckQueue(): Queue<LowStockCheckPayload> {
  if (queue !== null) {
    return queue;
  }

  queue = new Queue<LowStockCheckPayload>(QUEUE_NAMES.LOW_STOCK_CHECK, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFail: {
        count: 5000,
      },
    },
  });

  return queue;
}
