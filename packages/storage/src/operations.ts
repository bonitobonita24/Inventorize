import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { getS3Client, getStorageConfig } from './client';
import {
  validateMimeType,
  validateFileSize,
  generateStoragePath,
  extractTenantIdFromPath,
} from './validation';

export interface UploadParams {
  tenantId: string;
  entityType: string;
  originalFilename: string;
  mimeType: string;
  body: Buffer | Uint8Array | ReadableStream;
  sizeBytes: number;
}

export interface UploadResult {
  storagePath: string;
  bucket: string;
  sizeBytes: number;
  mimeType: string;
}

export async function uploadFile(params: UploadParams): Promise<UploadResult> {
  validateMimeType(params.mimeType);
  validateFileSize(params.sizeBytes);

  const config = getStorageConfig();
  const storagePath = generateStoragePath(
    params.tenantId,
    params.entityType,
    params.originalFilename,
    params.mimeType,
  );

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storagePath,
      Body: params.body,
      ContentType: params.mimeType,
      ContentLength: params.sizeBytes,
    }),
  );

  return {
    storagePath,
    bucket: config.bucket,
    sizeBytes: params.sizeBytes,
    mimeType: params.mimeType,
  };
}

export async function getDownloadUrl(
  storagePath: string,
  requestingTenantId: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const pathTenantId = extractTenantIdFromPath(storagePath);
  if (pathTenantId !== requestingTenantId) {
    throw new Error('Access denied');
  }

  const config = getStorageConfig();
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: storagePath,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function deleteFile(
  storagePath: string,
  requestingTenantId: string,
): Promise<void> {
  const pathTenantId = extractTenantIdFromPath(storagePath);
  if (pathTenantId !== requestingTenantId) {
    throw new Error('Access denied');
  }

  const config = getStorageConfig();
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: storagePath,
    }),
  );
}

export async function fileExists(
  storagePath: string,
  requestingTenantId: string,
): Promise<boolean> {
  const pathTenantId = extractTenantIdFromPath(storagePath);
  if (pathTenantId !== requestingTenantId) {
    return false;
  }

  const config = getStorageConfig();
  const client = getS3Client();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: storagePath,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
