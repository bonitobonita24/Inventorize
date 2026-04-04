// Impersonation banner — shown when super_admin is viewing a tenant in read-only mode

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const stopMutation = trpc.platform.stopImpersonation.useMutation();

  const user = session?.user as Record<string, unknown> | undefined;
  const isImpersonating = user?.['isImpersonating'] === true;
  const tenantSlug = user?.['tenantSlug'] as string | undefined;
  const originalTenantSlug = user?.['originalTenantSlug'] as string | null | undefined;

  if (!isImpersonating) {
    return null;
  }

  const handleStop = async () => {
    await stopMutation.mutateAsync();
    await update({
      isImpersonating: false,
      tenantId: user?.['originalTenantId'] ?? null,
      tenantSlug: originalTenantSlug ?? null,
      originalTenantId: null,
      originalTenantSlug: null,
    });
    router.push('/platform/tenants');
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-medium text-black">
      <span>
        Read-only mode — You are viewing tenant <strong>{tenantSlug}</strong> as super admin. Mutations are blocked.
      </span>
      <button
        type="button"
        onClick={() => { void handleStop(); }}
        disabled={stopMutation.isPending}
        className="rounded-md bg-black/20 px-3 py-1 text-xs font-semibold hover:bg-black/30"
      >
        {stopMutation.isPending ? 'Exiting...' : 'Exit Impersonation'}
      </button>
    </div>
  );
}
