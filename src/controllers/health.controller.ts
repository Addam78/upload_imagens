import type { FastifyRequest, FastifyReply } from 'fastify'
import { HealthService } from '../services/health.service.js'

export class HealthController {
  constructor(private healthService: HealthService) {}

  check = async (_request: FastifyRequest, reply: FastifyReply) => {
    const { healthy, body } = await this.healthService.check()
    return reply.status(healthy ? 200 : 503).send(body)
  }
}
