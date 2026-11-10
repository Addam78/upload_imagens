
import type { FastifyInstance } from 'fastify'
import { ImageRepository } from '../repositories/image.repository.js'
import { ImageService } from '../services/image.service.js'
import { ImageController } from '../controllers/image.controller.js'

export async function imageRoutes(app: FastifyInstance) {
  const repository = new ImageRepository()
  const service = new ImageService(repository)
  const controller = new ImageController(service)

  app.post('/images/upload-url', controller.createUpload)
  app.post('/images/:id/complete', controller.completeUpload)
  app.get('/images/:id', controller.getImage)
}