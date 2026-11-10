import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3'
import { env } from '../config/env.js'

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.MINIO_ROOT_USER,
    secretAccessKey: env.MINIO_ROOT_PASSWORD,
  },
})

// Cria o bucket se ele ainda não existir
export async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }))
    console.log(`Bucket "${env.S3_BUCKET}" criado`)
  }
}