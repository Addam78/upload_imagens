import { imageQueue, connection } from './queue.js'
import { prisma } from './prisma.js'
import { s3 } from './s3.js'

const SHUTDOWN_TIMEOUT_MS = 10_000

let shuttingDown = false

// Fecha as conexões que a API e o worker têm em comum
export async function closeInfra() {
  await imageQueue.close()
  await connection.quit()
  await prisma.$disconnect()
  s3.destroy()
}

// Roda `cleanup` quando o processo recebe Ctrl+C ou SIGTERM, uma única vez.
// Se o encerramento passar do limite, força a saída para não ficar preso.
export function onShutdown(cleanup: () => Promise<void>) {
  const handle = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true

    console.log(`${signal} recebido, encerrando...`)

    const timer = setTimeout(() => {
      console.error('Encerramento demorou demais, forçando a saída')
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    timer.unref()

    try {
      await cleanup()
      console.log('Encerrado com sucesso')
      process.exit(0)
    } catch (error) {
      console.error('Erro ao encerrar:', error)
      process.exit(1)
    }
  }

  process.on('SIGINT', () => void handle('SIGINT'))
  process.on('SIGTERM', () => void handle('SIGTERM'))
}
