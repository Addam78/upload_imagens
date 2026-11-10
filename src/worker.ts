import { Worker } from 'bullmq'
import { connection } from './lib/queue.js'
import { processImage } from './jobs/process-image.job.js'
import { ImageRepository } from './repositories/image.repository.js'

const imageRepository = new ImageRepository()

const worker = new Worker(
  'images',
  async (job) => processImage(job.data.imageId),
  { connection, concurrency: 2 },
)

worker.on('completed', (job) => {
  console.log(`Imagem ${job.data.imageId} processada`)
})

worker.on('failed', async (job, error) => {
  if (!job) return

  const lastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1)
  const unrecoverable = error.name === 'UnrecoverableError'

  if (lastAttempt || unrecoverable) {
    await imageRepository.markFailed(job.data.imageId, error.message)
  }
  console.error(`Imagem ${job.data.imageId} falhou: ${error.message}`)
})

console.log('Worker rodando, aguardando pedidos...')