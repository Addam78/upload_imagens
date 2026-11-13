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

  // uploads que pediram o link mas nunca foram concluídos, os mais antigos primeiro
  async findAbandoned(before: Date, limit: number) {
    return prisma.image.findMany({
      where: { status: 'AWAITING_UPLOAD', createdAt: { lt: before } },
      select: { id: true, originalKey: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  // só expira se ainda estiver aguardando, para não atropelar um upload
  // concluído no meio da limpeza. Devolve false se perdeu essa corrida.
  async markExpired(id: string) {
    const { count } = await prisma.image.updateMany({
      where: { id, status: 'AWAITING_UPLOAD' },
      data: { status: 'EXPIRED' },
    })
    return count === 1
  }

  async markFailed(id: string, error: string) {
    return prisma.image.update({
      where: { id },
      data: { status: 'FAILED', error },
    })
  }
}