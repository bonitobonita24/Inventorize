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

export type JobPayload = LowStockCheckPayload | EmailNotificationPayload;

export const QUEUE_NAMES = {
  LOW_STOCK_CHECK: 'low-stock-check',
  EMAIL_NOTIFICATIONS: 'email-notifications',
} as const;
