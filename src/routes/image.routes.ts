
import type { FastifyInstance } from 'fastify'
import { ImageRepository } from '../repositories/image.repository.js'
import { ImageService } from '../services/image.service.js'
import { ImageController } from '../controllers/image.controller.js'

// limite de requisições por IP a cada minuto, só nas rotas de imagem
const rateLimit = (max: number) => ({
  config: { rateLimit: { max, timeWindow: '1 minute' } },
})

export async function imageRoutes(app: FastifyInstance) {
  const repository = new ImageRepository()
  const service = new ImageService(repository)
  const controller = new ImageController(service)

  app.post('/images/upload-url', rateLimit(10), controller.createUpload)
  app.post('/images/:id/complete', rateLimit(30), controller.completeUpload)
  // o front consulta a cada segundo (60 por minuto), então o limite é maior
  app.get('/images/:id', rateLimit(120), controller.getImage)
}