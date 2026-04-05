// Low-stock check processor — runs daily for all tenants
// Finds products below threshold per tenant, enqueues email notifications,
// writes LowStockNotificationLog entries.

import type { Job } from 'bullmq';
import { platformPrisma } from '@inventorize/db';
import { getEmailNotificationsQueue, type LowStockCheckPayload } from '@inventorize/jobs';

export async function processLowStockCheck(job: Job<LowStockCheckPayload>): Promise<void> {
  const { tenantId: rawTenantId } = job.data;

  const tenants =
    rawTenantId === 'ALL_TENANTS'
      ? await platformPrisma.tenant.findMany({ where: { status: 'active' } })
      : await platformPrisma.tenant.findMany({ where: { id: rawTenantId, status: 'active' } });

  const emailQueue = getEmailNotificationsQueue();

  for (const tenant of tenants) {
    // Find all products below threshold for this tenant
    const products = await platformPrisma.product.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        name: true,
        productCode: true,
        currentQuantity: true,
        lowStockThreshold: true,
      },
    });

    const lowStock = products.filter((p: typeof products[number]) => p.currentQuantity <= p.lowStockThreshold);

    if (lowStock.length === 0) {
      console.log(`[low-stock] Tenant ${tenant.slug}: no low stock items`);
      continue;
    }

    console.log(`[low-stock] Tenant ${tenant.slug}: ${lowStock.length} low stock items`);

    // Get admin + purchasing_staff users for this tenant
    const recipients = await platformPrisma.user.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        role: { in: ['admin', 'purchasing_staff'] },
      },
      select: { id: true, name: true, email: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const recipient of recipients) {
      // Avoid duplicate notification on the same calendar day
      const alreadySent = await platformPrisma.lowStockNotificationLog.findFirst({
        where: {
          tenantId: tenant.id,
          notifiedToUserId: recipient.id,
          sentAt: { gte: today },
        },
      });

      if (alreadySent !== null) {
        console.log(`[low-stock] Skipping duplicate notification for ${recipient.email} today`);
        continue;
      }

      const productList = lowStock
        .map((p: typeof lowStock[number]) => `• ${p.name} (${p.productCode}): ${p.currentQuantity} / ${p.lowStockThreshold}`)
        .join('\n');

      const productListHtml = lowStock
        .map(
          (p: typeof lowStock[number]) =>
            `<tr><td style="padding:4px 8px">${p.name}</td><td style="padding:4px 8px;color:#6b7280">${p.productCode}</td>` +
            `<td style="padding:4px 8px;text-align:right;color:#dc2626">${p.currentQuantity}</td>` +
            `<td style="padding:4px 8px;text-align:right">${p.lowStockThreshold}</td></tr>`,
        )
        .join('');

      await emailQueue.add(
        'low-stock-notification',
        {
          tenantId: tenant.id,
          userId: recipient.id,
          type: 'low_stock_report',
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: `[Inventorize] Low Stock Alert — ${lowStock.length} item${lowStock.length !== 1 ? 's' : ''} need attention`,
          templateData: {
            tenantName: tenant.name,
            productCount: String(lowStock.length),
            productListText: productList,
            productListHtml,
          },
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
        },
      );

      // Write notification log entry
      await platformPrisma.lowStockNotificationLog.create({
        data: {
          tenantId: tenant.id,
          productId: lowStock[0]!.id, // log the first product as reference (array is non-empty — guarded above)
          notifiedToUserId: recipient.id,
          sentAt: new Date(),
          status: 'sent',
        },
      });
    }
  }
}
