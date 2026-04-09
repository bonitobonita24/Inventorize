export interface LowStockCheckPayload {
  tenantId: string;
  userId: string;
  triggeredAt: string;
}

export interface EmailNotificationPayload {
  tenantId: string;
  userId: string;
  type: 'welcome' | 'low_stock_report' | 'system_notification';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  templateData: Record<string, string>;
}

export interface XenditWebhookPayload {
  webhookType: string;
  xenditInvoiceId: string | null;
  xenditRefundId: string | null;
  externalId: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  paidAt: string | null;
  rawBody: string;
  receivedAt: string;
}

export type JobPayload = LowStockCheckPayload | EmailNotificationPayload | XenditWebhookPayload;

export const QUEUE_NAMES = {
  LOW_STOCK_CHECK: 'low-stock-check',
  EMAIL_NOTIFICATIONS: 'email-notifications',
  XENDIT_WEBHOOK: 'xendit-webhook-processor',
} as const;
