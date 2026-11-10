import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { ImageService } from '../services/image.service.js'

const createUploadBody = z.object({
  filename: z.string().min(1),
  contentType: z.string(),
  size: z.number().int().positive(),
})

export class ImageController {
  constructor(private imageService: ImageService) {}

  createUpload = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createUploadBody.parse(request.body)
    const result = await this.imageService.createUpload(body)
    return reply.status(201).send(result)
  }

    completeUpload = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const result = await this.imageService.completeUpload(id)
    return reply.status(202).send(result)
  }

  getImage = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params)
    const result = await this.imageService.getImage(id)
    return reply.send(result)
  }
}