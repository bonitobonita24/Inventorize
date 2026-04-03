// Platform layout — super_admin only, no tenant context

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r border-border bg-card p-4">
        <h2 className="mb-6 text-lg font-semibold">Platform Admin</h2>
        <ul className="space-y-2">
          <li>
            <a href="/platform/tenants" className="block rounded-md px-3 py-2 text-sm hover:bg-accent">
              Tenants
            </a>
          </li>
          <li>
            <a href="/platform/metrics" className="block rounded-md px-3 py-2 text-sm hover:bg-accent">
              Metrics
            </a>
          </li>
          <li>
            <a href="/platform/audit-logs" className="block rounded-md px-3 py-2 text-sm hover:bg-accent">
              Audit Logs
            </a>
          </li>
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
