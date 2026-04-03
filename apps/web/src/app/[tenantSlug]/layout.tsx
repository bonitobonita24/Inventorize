// Tenant layout — sidebar navigation, scoped to tenant slug

import Link from 'next/link';

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  // In Next.js 15, params is a Promise — we read it in the component
  // For the layout, we use a client component wrapper or pass via context
  // Here we use a simple server component with the slug

  return (
    <TenantShell params={params}>{children}</TenantShell>
  );
}

async function TenantShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const navItems = [
    { href: `/${tenantSlug}/dashboard`, label: 'Dashboard' },
    { href: `/${tenantSlug}/products`, label: 'Products' },
    { href: `/${tenantSlug}/suppliers`, label: 'Suppliers' },
    { href: `/${tenantSlug}/purchase-orders`, label: 'Purchase Orders' },
    { href: `/${tenantSlug}/stock-in`, label: 'Stock In' },
    { href: `/${tenantSlug}/stock-out`, label: 'Stock Out' },
    { href: `/${tenantSlug}/adjustments`, label: 'Adjustments' },
    { href: `/${tenantSlug}/reports`, label: 'Reports' },
    { href: `/${tenantSlug}/audit-logs`, label: 'Audit Logs' },
    { href: `/${tenantSlug}/users`, label: 'Users' },
  ];

  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r border-border bg-card p-4">
        <h2 className="mb-6 text-lg font-semibold">Inventorize</h2>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
