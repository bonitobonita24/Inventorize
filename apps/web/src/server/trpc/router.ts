// Root tRPC router — combines all entity routers

import { createTRPCRouter } from './trpc';
import { productRouter } from './routers/product.router';
import { supplierRouter } from './routers/supplier.router';
import { purchaseOrderRouter } from './routers/purchase-order.router';
import { stockInRouter } from './routers/stock-in.router';
import { stockOutRouter } from './routers/stock-out.router';
import { stockAdjustmentRouter } from './routers/stock-adjustment.router';
import { userRouter } from './routers/user.router';
import { reportRouter } from './routers/report.router';
import { auditLogRouter } from './routers/audit-log.router';
import { platformRouter } from './routers/platform.router';

export const appRouter = createTRPCRouter({
  product: productRouter,
  supplier: supplierRouter,
  purchaseOrder: purchaseOrderRouter,
  stockIn: stockInRouter,
  stockOut: stockOutRouter,
  stockAdjustment: stockAdjustmentRouter,
  user: userRouter,
  report: reportRouter,
  auditLog: auditLogRouter,
  platform: platformRouter,
});

export type AppRouter = typeof appRouter;
