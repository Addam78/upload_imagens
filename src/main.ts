import Fastify, { type FastifyError } from 'fastify'
import fastifyStatic from '@fastify/static'
import rateLimit from '@fastify/rate-limit'
import path from 'node:path'
import { ZodError } from 'zod'
import { env } from './config/env.js'
import { ensureBucket } from './lib/s3.js'
import { prisma } from './lib/prisma.js'
import { retry } from './lib/retry.js'
import { closeInfra, onShutdown } from './lib/shutdown.js'
import { AppError } from './errors/app-error.js'
import { healthRoutes } from './routes/health.routes.js'
import { imageRoutes } from './routes/image.routes.js'

const app = Fastify({ logger: true })

// entrega o que estiver em web/ como página
app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'web'),
})

// global: false, cada rota define o próprio limite (health e página ficam livres)
app.register(rateLimit, { global: false })

app.register(healthRoutes)
app.register(imageRoutes)

app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message })
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({ message: 'Dados inválidos', issues: error.issues })
  }
  if (error.statusCode === 429) {
    return reply.status(429).send({ message: 'Muitas requisições, tente novamente em instantes' })
  }
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({ message: error.message })
  }
  app.log.error(error)
  return reply.status(500).send({ message: 'Erro interno' })
})

// banco e storage podem ainda estar subindo (ex.: logo após um
// `docker compose up`), então tenta de novo por um tempo antes de desistir
await retry(() => prisma.$connect(), { label: 'Conexão com o banco' })
await retry(ensureBucket, { label: 'Conexão com o storage' })
await app.listen({ port: env.PORT })

// para de aceitar pedidos novos, termina os em andamento e fecha as conexões
onShutdown(async () => {
  await app.close()
  await closeInfra()
})