import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),

  DATABASE_URL: z.string(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  S3_ENDPOINT: z.string(),
  S3_BUCKET: z.string(),
  S3_PUBLIC_URL: z.url(),
  S3_REGION: z.string().default('us-east-1'),
  MINIO_ROOT_USER: z.string(),
  MINIO_ROOT_PASSWORD: z.string(),

  MAX_UPLOAD_MB: z.coerce.number().default(20),

  // upload que não foi concluído depois desse tempo vira EXPIRED e perde o arquivo
  ABANDONED_UPLOAD_MINUTES: z.coerce.number().int().min(10).default(60),
  // de quanto em quanto tempo o worker procura uploads abandonados
  CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(10),

  // domínios do front que podem enviar arquivo para o storage, separados por vírgula
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3333')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', z.flattenError(parsed.error).fieldErrors)
  process.exit(1)
}

export const env = parsed.data