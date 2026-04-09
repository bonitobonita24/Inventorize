// Non-tRPC: manual auth required — file upload endpoint for MinIO storage
// Accepts: multipart/form-data with fields: file (File), entityType (string)
// Returns: { storagePath: string } — store this in the record's attachmentUrl field
// To download: call stockIn.getAttachmentUrl or purchaseOrder.getAttachmentUrl with the storagePath
//
// V28 CSRF: Route Handler that mutates state — Origin header validation applied.
// tRPC procedures are inherently CSRF-resistant (POST-only JSON + SameSite=lax).
// This non-tRPC handler accepts multipart/form-data, so Origin must be validated explicitly.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/server/auth';
import { uploadFile } from '@inventorize/storage';

const ALLOWED_ENTITY_TYPES = new Set(['po-attachment', 'delivery-receipt']);

/** Validates the request Origin matches the expected application origin (CSRF protection). */
function isOriginAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (origin === null) return false;
  const appUrl = process.env['NEXTAUTH_URL'] ?? '';
  try {
    const expected = new URL(appUrl).origin;
    return origin === expected;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // V28 CSRF: validate Origin before any auth or data processing
  if (!isOriginAllowed(req)) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  // Manual auth check — this route bypasses tRPC middleware
  const session = await auth();
  if (session === null || session.user === undefined) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const tenantId = (session.user as unknown as Record<string, unknown>)['tenantId'] as string | null | undefined;
  if (tenantId === null || tenantId === undefined) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const file = formData.get('file');
  const entityType = formData.get('entityType');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field.' }, { status: 400 });
  }
  if (typeof entityType !== 'string' || !ALLOWED_ENTITY_TYPES.has(entityType)) {
    return NextResponse.json(
      { error: 'Invalid entityType. Must be po-attachment or delivery-receipt.' },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  let result: { storagePath: string };
  try {
    const uploadResult = await uploadFile({
      tenantId,
      entityType,
      originalFilename: file.name,
      mimeType: file.type,
      body,
      sizeBytes: body.byteLength,
    });
    result = { storagePath: uploadResult.storagePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json(result);
}
