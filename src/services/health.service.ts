import { HeadBucketCommand } from '@aws-sdk/client-s3'
import { connection } from '../lib/queue.js'
import { prisma } from '../lib/prisma.js'
import { s3 } from '../lib/s3.js'
import { env } from '../config/env.js'

const CHECK_TIMEOUT_MS = 2000

type CheckStatus = 'ok' | 'down'

// Se a verificação passar do limite, conta como fora do ar
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS).unref(),
    ),
  ])
}

async function check(run: () => Promise<unknown>): Promise<CheckStatus> {
  try {
    await withTimeout(run())
    return 'ok'
  } catch {
    return 'down'
  }
}

export class HealthService {
  async check() {
    const [database, redis, storage] = await Promise.all([
      check(() => prisma.$queryRaw`SELECT 1`),
      check(() => connection.ping()),
      check(() => s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))),
    ])

    const healthy = database === 'ok' && redis === 'ok' && storage === 'ok'

    return {
      healthy,
      body: { status: healthy ? 'ok' : 'degraded', checks: { database, redis, storage } },
    }
  }
}
