import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function getStorageConfig(): StorageConfig {
  const endpoint = process.env['STORAGE_ENDPOINT'];
  const region = process.env['STORAGE_REGION'] ?? 'us-east-1';
  const accessKeyId = process.env['STORAGE_ACCESS_KEY'];
  const secretAccessKey = process.env['STORAGE_SECRET_KEY'];
  const bucket = process.env['STORAGE_BUCKET'];

  if (endpoint === undefined || endpoint === '') {
    throw new Error('STORAGE_ENDPOINT environment variable is required');
  }
  if (accessKeyId === undefined || accessKeyId === '') {
    throw new Error('STORAGE_ACCESS_KEY environment variable is required');
  }
  if (secretAccessKey === undefined || secretAccessKey === '') {
    throw new Error('STORAGE_SECRET_KEY environment variable is required');
  }
  if (bucket === undefined || bucket === '') {
    throw new Error('STORAGE_BUCKET environment variable is required');
  }

  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

export function getS3Client(): S3Client {
  if (client !== null) {
    return client;
  }

  const config = getStorageConfig();
  client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return client;
}
