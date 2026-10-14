import { S3Client, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export const BUCKET = process.env.R2_BUCKET ?? '';
export const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';

export const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

if (!BUCKET || !ACCOUNT_ID) {
  console.warn('[r2] R2_BUCKET or R2_ACCOUNT_ID is not set; R2 operations will fail.');
}

export async function presignPut(key: string, mime: string, ttlSeconds = 600): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mime || 'application/octet-stream',
  });
  return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}

export async function presignGet(key: string, ttlSeconds = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}

export async function headObject(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    console.warn('[r2] deleteObject failed for', key, e);
  }
}

export function objectKey(itemId: string, kind: 'audio' | 'sheet', filename: string): string {
  const m = filename.match(/\.([a-zA-Z0-9]{1,8})$/);
  const ext = m ? m[1].toLowerCase() : 'bin';
  return `repertoire/${itemId}/${kind}.${ext}`;
}
