import { prisma } from '../lib/prisma.js'

export type Variant = {
  name: string   // thumb, medium, large
  key: string    // caminho no MinIO
  width: number
  size: number   // bytes
}

type CreateImageData = {
  id: string
  originalName: string
  contentType: string
  originalKey: string
}

export class ImageRepository {
  async create(data: CreateImageData) {
    return prisma.image.create({ data })
  }

  async findById(id: string) {
    return prisma.image.findUnique({ where: { id } })
  }

  async markPending(id: string, originalSize: number) {
    return prisma.image.update({
      where: { id },
      data: { status: 'PENDING', originalSize },
    })
  }

  async markProcessing(id: string) {
    return prisma.image.update({
      where: { id },
      data: { status: 'PROCESSING' },
    })
  }

  async markDone(id: string, variants: Variant[]) {
    return prisma.image.update({
      where: { id },
      data: { status: 'DONE', variants, error: null },
    })
  }

  async markFailed(id: string, error: string) {
    return prisma.image.update({
      where: { id },
      data: { status: 'FAILED', error },
    })
  }
}