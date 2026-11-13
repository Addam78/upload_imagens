import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { imageQueue } from '../lib/queue.js'
import { randomUUID } from 'node:crypto'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { s3 } from '../lib/s3.js'
import { env } from '../config/env.js'
import { AppError } from '../errors/app-error.js'
import { ImageRepository, type Variant } from '../repositories/image.repository.js'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type CreateUploadInput = {
  filename: string
  contentType: string
  size: number
}

export class ImageService {
  constructor(private imageRepository: ImageRepository) {}

  async createUpload({ filename, contentType, size }: CreateUploadInput) {
    const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024

    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new AppError('Tipo de arquivo não permitido')
    }
    if (size > maxBytes) {
      throw new AppError(`Arquivo maior que ${env.MAX_UPLOAD_MB} MB`)
    }

    const id = randomUUID()
    const key = `originals/${id}`

    await this.imageRepository.create({
      id,
      originalName: filename,
      contentType,
      originalKey: key,
    })

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: env.S3_BUCKET,
      Key: key,
      Conditions: [
        ['content-length-range', 1, maxBytes],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: 300, // 5 minutos
    })

    // 5: devolve
    return { id, url, fields }
  }


    async completeUpload(id: string) {
    // 1: existe no banco?
    const image = await this.imageRepository.findById(id)
    if (!image) {
      throw new AppError('Imagem não encontrada', 404)
    }
    if (image.status !== 'AWAITING_UPLOAD') {
      throw new AppError('Upload já foi finalizado', 409)
    }

    // 2: o arquivo chegou no MinIO?
    let size: number
    try {
      const head = await s3.send(
        new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: image.originalKey }),
      )
      size = head.ContentLength ?? 0
    } catch {
      throw new AppError('Arquivo ainda não foi enviado', 400)
    }

    // 3: marca como PENDING
    await this.imageRepository.markPending(id, size)

    // 4: coloca na fila
    await imageQueue.add(
      'process',
      { imageId: id },
      { jobId: id, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    )

    return { id, status: 'PENDING' }
  }

  async getImage(id: string) {
    const image = await this.imageRepository.findById(id)
    if (!image) {
      throw new AppError('Imagem não encontrada', 404)
    }

    const variants = (image.variants as Variant[] | null) ?? []

    return {
      id: image.id,
      status: image.status,
      originalName: image.originalName,
      originalSize: image.originalSize,
      error: image.error,
      variants: variants.map((v) => ({
        name: v.name,
        width: v.width,
        size: v.size,
        url: `${env.S3_PUBLIC_URL}/${env.S3_BUCKET}/${v.key}`,
      })),
    }
  }
}