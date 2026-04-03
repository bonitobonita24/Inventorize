import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const BLOCKED_MIME_TYPES = new Set([
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export function validateMimeType(mimeType: string): void {
  if (BLOCKED_MIME_TYPES.has(mimeType)) {
    throw new Error(`File type ${mimeType} is blocked for security reasons`);
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      `File type ${mimeType} is not allowed. Allowed types: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
    );
  }
}

export function validateFileSize(sizeBytes: number): void {
  if (sizeBytes <= 0) {
    throw new Error('File size must be greater than 0');
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size ${sizeBytes} exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes (10 MB)`,
    );
  }
}

export function generateStoragePath(
  tenantId: string,
  entityType: string,
  originalFilename: string,
  mimeType: string,
): string {
  const ext = MIME_TO_EXT[mimeType] ?? (extname(originalFilename) || '.bin');
  const randomName = randomUUID();
  return `${tenantId}/${entityType}/${randomName}${ext}`;
}

export function extractTenantIdFromPath(storagePath: string): string {
  const firstSlash = storagePath.indexOf('/');
  if (firstSlash === -1) {
    throw new Error('Invalid storage path: missing tenant prefix');
  }
  return storagePath.substring(0, firstSlash);
}
