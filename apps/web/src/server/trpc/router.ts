// Root tRPC router — combines all entity routers

import { createTRPCRouter } from './trpc.js';
import { productRouter } from './routers/product.router.js';
import { supplierRouter } from './routers/supplier.router.js';
import { purchaseOrderRouter } from './routers/purchase-order.router.js';
import { stockInRouter } from './routers/stock-in.router.js';
import { stockOutRouter } from './routers/stock-out.router.js';
import { stockAdjustmentRouter } from './routers/stock-adjustment.router.js';
import { userRouter } from './routers/user.router.js';
import { reportRouter } from './routers/report.router.js';
import { auditLogRouter } from './routers/audit-log.router.js';
import { platformRouter } from './routers/platform.router.js';

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
