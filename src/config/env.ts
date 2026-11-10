import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),

  DATABASE_URL: z.string(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  S3_ENDPOINT: z.string(),
  S3_BUCKET: z.string(),
  S3_REGION: z.string().default('us-east-1'),
  MINIO_ROOT_USER: z.string(),
  MINIO_ROOT_PASSWORD: z.string(),

  MAX_UPLOAD_MB: z.coerce.number().default(20),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', z.flattenError(parsed.error).fieldErrors)
  process.exit(1)
}

export const env = parsed.data