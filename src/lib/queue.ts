import { Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { env } from '../config/env.js'

export const connection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
})

export const imageQueue = new Queue('images', { connection })