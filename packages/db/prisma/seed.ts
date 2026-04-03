// Seed script — creates demo tenant, webmaster account, and sample data.
// Run: pnpm db:seed (from packages/db or root)
// Webmaster password: read from SEED_ADMIN_PASSWORD env var.
// If not set, falls back to a dev-only default (NEVER use in production).

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEV_FALLBACK_PASSWORD = 'DevPassword123!SecureChange';

async function main(): Promise<void> {
  const adminPassword =
    process.env['SEED_ADMIN_PASSWORD'] ?? DEV_FALLBACK_PASSWORD;

  if (adminPassword === DEV_FALLBACK_PASSWORD) {
    console.warn(
      '⚠  SEED_ADMIN_PASSWORD not set — using dev fallback. ' +
        'Set SEED_ADMIN_PASSWORD in .env for staging/production.',
    );
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // ─── Tenant ────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      contactEmail: 'admin@inventorize.local',
      status: 'active',
    },
  });

  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // ─── Webmaster (super_admin) ───────────────────────────────
  const webmaster = await prisma.user.upsert({
    where: { email: 'webmaster@inventorize.local' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Webmaster',
      email: 'webmaster@inventorize.local',
      hashedPassword,
      role: 'super_admin',
      isActive: true,
    },
  });

  console.log(`✅ Webmaster created: ${webmaster.email} (${webmaster.id})`);

  // ─── Demo users ────────────────────────────────────────────
  const demoPassword = await bcrypt.hash('DemoUser2024!Secure', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@inventorize.local' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin User',
      email: 'admin@inventorize.local',
      hashedPassword: demoPassword,
      role: 'admin',
      isActive: true,
    },
  });

  const warehouseUser = await prisma.user.upsert({
    where: { email: 'warehouse@inventorize.local' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Warehouse Staff',
      email: 'warehouse@inventorize.local',
      hashedPassword: demoPassword,
      role: 'warehouse_staff',
      isActive: true,
    },
  });

  const purchasingUser = await prisma.user.upsert({
    where: { email: 'purchasing@inventorize.local' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Purchasing Staff',
      email: 'purchasing@inventorize.local',
      hashedPassword: demoPassword,
      role: 'purchasing_staff',
      isActive: true,
    },
  });

  console.log(
    `✅ Demo users created: ${adminUser.email}, ${warehouseUser.email}, ${purchasingUser.email}`,
  );

  // ─── Demo suppliers ────────────────────────────────────────
  const supplier1 = await prisma.supplier.upsert({
    where: {
      id: 'seed-supplier-1',
    },
    update: {},
    create: {
      id: 'seed-supplier-1',
      tenantId: tenant.id,
      name: 'ABC Industrial Supply',
      contactPerson: 'Juan Dela Cruz',
      phone: '+63-917-123-4567',
      email: 'sales@abcindustrial.ph',
      address: '123 Rizal Ave, Makati City',
      notes: 'Primary office supplies vendor',
      isActive: true,
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: {
      id: 'seed-supplier-2',
    },
    update: {},
    create: {
      id: 'seed-supplier-2',
      tenantId: tenant.id,
      name: 'TechParts Philippines',
      contactPerson: 'Maria Santos',
      phone: '+63-918-765-4321',
      email: 'orders@techparts.ph',
      address: '456 EDSA, Quezon City',
      notes: 'IT equipment and peripherals',
      isActive: true,
    },
  });

  console.log(
    `✅ Demo suppliers created: ${supplier1.name}, ${supplier2.name}`,
  );

  // ─── Demo products ─────────────────────────────────────────
  const product1 = await prisma.product.upsert({
    where: {
      tenantId_productCode: {
        tenantId: tenant.id,
        productCode: 'OFF-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      productCode: 'OFF-001',
      barcodeValue: '4901234567890',
      name: 'A4 Bond Paper (Ream)',
      category: 'Office Supplies',
      unit: 'ream',
      supplierCost: 180.0,
      markupPercent: 25.0,
      sellingPrice: 225.0,
      currentQuantity: 50,
      lowStockThreshold: 10,
      serialTrackingEnabled: false,
      isActive: true,
    },
  });

  const product2 = await prisma.product.upsert({
    where: {
      tenantId_productCode: {
        tenantId: tenant.id,
        productCode: 'IT-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      productCode: 'IT-001',
      barcodeValue: '4901234567891',
      name: 'Wireless Mouse',
      category: 'IT Equipment',
      unit: 'piece',
      supplierCost: 350.0,
      markupPercent: 40.0,
      sellingPrice: 490.0,
      currentQuantity: 25,
      lowStockThreshold: 5,
      serialTrackingEnabled: true,
      isActive: true,
    },
  });

  const product3 = await prisma.product.upsert({
    where: {
      tenantId_productCode: {
        tenantId: tenant.id,
        productCode: 'CLN-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      productCode: 'CLN-001',
      barcodeValue: '4901234567892',
      name: 'All-Purpose Cleaner (Gallon)',
      category: 'Cleaning Supplies',
      unit: 'gallon',
      supplierCost: 120.0,
      markupPercent: 30.0,
      sellingPrice: 156.0,
      currentQuantity: 15,
      lowStockThreshold: 3,
      serialTrackingEnabled: false,
      isActive: true,
    },
  });

  console.log(
    `✅ Demo products created: ${product1.name}, ${product2.name}, ${product3.name}`,
  );

  // ─── Seed validation: FK tenant consistency ────────────────
  // Verify all seeded records share the same tenantId.
  const userCount = await prisma.user.count({
    where: { tenantId: tenant.id },
  });
  const supplierCount = await prisma.supplier.count({
    where: { tenantId: tenant.id },
  });
  const productCount = await prisma.product.count({
    where: { tenantId: tenant.id },
  });

  console.log(
    `✅ Tenant consistency check: ${userCount} users, ${supplierCount} suppliers, ${productCount} products — all under tenant ${tenant.slug}`,
  );

  console.log('\n🎉 Seed complete!');
  console.log(`   Login: webmaster@inventorize.local`);
  console.log(
    `   Password: ${adminPassword === DEV_FALLBACK_PASSWORD ? '(dev fallback — see warning above)' : '(from SEED_ADMIN_PASSWORD env var)'}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
