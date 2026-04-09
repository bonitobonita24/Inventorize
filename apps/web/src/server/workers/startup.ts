// Worker startup — starts BullMQ workers and registers scheduled jobs
// Called from instrumentation.ts (nodejs runtime only)

import {
  createLowStockCheckWorker,
  createEmailNotificationsWorker,
  createXenditWebhookWorker,
  registerScheduledJobs,
} from '@inventorize/jobs';
import { processLowStockCheck } from './low-stock-processor';
import { processEmailNotification } from './email-processor';
import { processXenditWebhook } from './xendit-processor';

let started = false;

export async function startWorkers(): Promise<void> {
  if (started) return;
  started = true;

  createLowStockCheckWorker(processLowStockCheck);
  createEmailNotificationsWorker(processEmailNotification);
  createXenditWebhookWorker(processXenditWebhook);
  await registerScheduledJobs();

  console.log('[workers] Low-stock-check, email-notifications, and xendit-webhook workers started');
}
