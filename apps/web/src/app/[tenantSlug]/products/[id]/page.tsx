// Product detail page — view single product with full info

'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const id = params?.id as string | undefined;
  const { data: product, isLoading } = trpc.product.byId.useQuery(
    { id: id ?? '' },
    { enabled: id !== undefined },
  );

  if (tenantSlug === undefined || id === undefined) return null;

  if (isLoading) {
    return <div className="p-4">Loading product...</div>;
  }

  if (product === null || product === undefined) {
    return <div className="p-4">Product not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantSlug}/products`} className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Products
        </Link>
      </div>

      <h1 className="text-2xl font-bold">{product.name}</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Product Code</p>
          <p className="font-mono">{product.productCode}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Barcode</p>
          <p className="font-mono">{product.barcodeValue}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Category</p>
          <p>{product.category}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Unit</p>
          <p>{product.unit}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Current Quantity</p>
          <p className="text-xl font-bold">{product.currentQuantity}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Low Stock Threshold</p>
          <p>{product.lowStockThreshold}</p>
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={`/${tenantSlug}/products/${product.id}/history`}
          className="text-sm text-primary underline"
        >
          View Movement History &rarr;
        </Link>
      </div>
    </div>
  );
}
