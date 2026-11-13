import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from '../lib/s3.js'
import { env } from '../config/env.js'
import { ImageRepository } from '../repositories/image.repository.js'

const BATCH_SIZE = 100

const imageRepository = new ImageRepository()

// Marca como EXPIRED os uploads que não foram concluídos a tempo e apaga
// o arquivo que tenha sobrado no storage. Devolve quantos foram limpos.
export async function cleanupAbandonedUploads() {
  const before = new Date(Date.now() - env.ABANDONED_UPLOAD_MINUTES * 60_000)
  let cleaned = 0

  while (true) {
    const batch = await imageRepository.findAbandoned(before, BATCH_SIZE)
    if (batch.length === 0) break

    for (const image of batch) {
      // expira primeiro: se o upload foi concluído agora, o registro não muda
      // e o arquivo é preservado
      const expired = await imageRepository.markExpired(image.id)
      if (!expired) continue

      try {
        // apagar um arquivo que não existe não dá erro
        await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: image.originalKey }))
      } catch (error) {
        console.error(`Não foi possível apagar ${image.originalKey}:`, (error as Error).message)
      }
      cleaned++
    }
  }

  return cleaned
}
