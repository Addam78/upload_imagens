import { Worker } from 'bullmq'
import { connection, imageQueue } from './lib/queue.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { retry } from './lib/retry.js'
import { processImage } from './jobs/process-image.job.js'
import { cleanupAbandonedUploads } from './jobs/cleanup-abandoned.job.js'
import { closeInfra, onShutdown } from './lib/shutdown.js'
import { ImageRepository } from './repositories/image.repository.js'

const imageRepository = new ImageRepository()

// o banco pode ainda estar subindo (ex.: logo após um `docker compose up`)
await retry(() => prisma.$connect(), { label: 'Conexão com o banco' })

const worker = new Worker(
  'images',
  async (job) => {
    if (job.name === 'cleanup') {
      const cleaned = await cleanupAbandonedUploads()
      if (cleaned > 0) console.log(`Limpeza: ${cleaned} upload(s) abandonado(s) expirado(s)`)
      return
    }
    return processImage(job.data.imageId)
  },
  { connection, concurrency: 2 },
)

worker.on('completed', (job) => {
  if (job.name !== 'process') return
  console.log(`Imagem ${job.data.imageId} processada`)
})

worker.on('failed', async (job, error) => {
  if (!job) return

  if (job.name !== 'process') {
    console.error(`Tarefa ${job.name} falhou: ${error.message}`)
    return
  }

  const lastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1)
  const unrecoverable = error.name === 'UnrecoverableError'

  if (lastAttempt || unrecoverable) {
    try {
      await imageRepository.markFailed(job.data.imageId, error.message)
    } catch (markError) {
      // se nem isso funcionar (ex.: banco fora do ar), só loga: o job já
      // falhou de verdade, e derrubar o worker pioraria a situação
      console.error(`Não foi possível marcar a imagem ${job.data.imageId} como FAILED:`, markError)
    }
  }
  console.error(`Imagem ${job.data.imageId} falhou: ${error.message}`)
})

// agenda a limpeza de uploads abandonados. O id fixo evita duplicar o
// agendamento quando o worker reinicia ou há mais de um rodando.
await imageQueue.upsertJobScheduler(
  'cleanup-abandoned',
  { every: env.CLEANUP_INTERVAL_MINUTES * 60_000 },
  { name: 'cleanup', opts: { removeOnComplete: true, removeOnFail: 20 } },
)

console.log('Worker rodando, aguardando pedidos...')

// termina o job em andamento antes de fechar, para não deixar imagem em PROCESSING
onShutdown(async () => {
  await worker.close()
  await closeInfra()
})
