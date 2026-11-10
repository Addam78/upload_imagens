import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { ZodError } from 'zod'
import { env } from './config/env.js'
import { ensureBucket } from './lib/s3.js'
import { AppError } from './errors/app-error.js'
import { imageRoutes } from './routes/image.routes.js'

const app = Fastify({ logger: true })

// entrega o que estiver em web/ como página
app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'web'),
})

app.get('/health', async () => ({ status: 'ok' }))
app.register(imageRoutes)

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message })
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({ message: 'Dados inválidos', issues: error.issues })
  }
  app.log.error(error)
  return reply.status(500).send({ message: 'Erro interno' })
})

await ensureBucket()
app.listen({ port: env.PORT })