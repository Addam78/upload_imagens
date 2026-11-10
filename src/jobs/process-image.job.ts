import sharp from 'sharp'
import { UnrecoverableError } from 'bullmq'
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { s3 } from '../lib/s3.js'
import { env } from '../config/env.js'
import { ImageRepository, type Variant } from '../repositories/image.repository.js'

const PRESETS = [
  { name: 'thumb', width: 150, quality: 75 },
  { name: 'medium', width: 800, quality: 80 },
  { name: 'large', width: 1600, quality: 80 },
]

const imageRepository = new ImageRepository()

export async function processImage(imageId: string) {
  const image = await imageRepository.findById(imageId)
  if (!image) return

  // 1
  await imageRepository.markProcessing(imageId)

  // 2
  const object = await s3.send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: image.originalKey }),
  )
  const buffer = Buffer.from(await object.Body!.transformToByteArray())

  // 3: confere o conteúdo real do arquivo, não a extensão
  try {
    const { format } = await sharp(buffer).metadata()
    if (!['jpeg', 'png', 'webp'].includes(format ?? '')) throw new Error()
  } catch {
    await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: image.originalKey }))
    throw new UnrecoverableError('Arquivo não é uma imagem válida')
  }

  // 4 e 5
  const variants: Variant[] = []

  for (const preset of PRESETS) {
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize({ width: preset.width, withoutEnlargement: true })
      .webp({ quality: preset.quality })
      .toBuffer({ resolveWithObject: true })

    const key = `processed/${imageId}/${preset.name}.webp`

    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: 'image/webp',
      }),
    )

    variants.push({ name: preset.name, key, width: info.width, size: info.size })
  }

  // 6
  await imageRepository.markDone(imageId, variants)
}