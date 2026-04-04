// Email notification processor — sends queued emails via SMTP

import type { Job } from 'bullmq';
import type { EmailNotificationPayload } from '@inventorize/jobs';
import { sendEmail } from '../lib/email';

export async function processEmailNotification(job: Job<EmailNotificationPayload>): Promise<void> {
  const { recipientEmail, recipientName, subject, type, templateData } = job.data;

  let html: string;
  let text: string;

  if (type === 'low_stock_report') {
    const { tenantName, productCount, productListText, productListHtml } = templateData;

    html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#dc2626">⚠ Low Stock Alert</h2>
  <p>Hi ${recipientName},</p>
  <p><strong>${tenantName}</strong> has <strong>${productCount} product${Number(productCount) !== 1 ? 's' : ''}</strong> at or below their low stock threshold.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead>
      <tr style="background:#f3f4f6;text-align:left">
        <th style="padding:8px">Product</th>
        <th style="padding:8px">Code</th>
        <th style="padding:8px;text-align:right">Current</th>
        <th style="padding:8px;text-align:right">Threshold</th>
      </tr>
    </thead>
    <tbody>${productListHtml}</tbody>
  </table>
  <p>Log in to Inventorize to record stock-in transactions and resolve these alerts.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="font-size:12px;color:#6b7280">You received this email because you are an admin or purchasing staff member for ${tenantName} on Inventorize.</p>
</body>
</html>`;

    text = `Low Stock Alert — ${tenantName}\n\n${productCount} product(s) need attention:\n\n${productListText}\n\nLog in to Inventorize to record stock-in transactions.`;
  } else if (type === 'welcome') {
    const { tenantName, loginUrl } = templateData;
    html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2>Welcome to Inventorize</h2>
  <p>Hi ${recipientName},</p>
  <p>Your account for <strong>${tenantName}</strong> on Inventorize has been created.</p>
  <p><a href="${loginUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">Log in to Inventorize</a></p>
</body>
</html>`;
    text = `Welcome to Inventorize\n\nHi ${recipientName},\n\nYour account for ${tenantName} has been created. Log in at: ${loginUrl ?? ''}`;
  } else {
    // Generic notification
    html = `<p>${templateData['body'] ?? ''}</p>`;
    text = templateData['body'] ?? '';
  }

  await sendEmail({ to: recipientEmail, subject, html, text });

  console.log(`[email] Sent ${type} to ${recipientEmail}`);
}
