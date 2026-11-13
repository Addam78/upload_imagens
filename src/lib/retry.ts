// Tenta de novo, com espera crescente, enquanto a infraestrutura (banco,
// Redis, storage) ainda está subindo. Depois das tentativas, deixa o erro
// original passar.
type RetryOptions = {
  attempts?: number
  delayMs?: number
  label: string
}

export async function retry<T>(fn: () => Promise<T>, { attempts = 5, delayMs = 2000, label }: RetryOptions): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === attempts) break

      console.warn(`${label}: tentativa ${attempt}/${attempts} falhou, tentando de novo em ${delayMs / 1000}s...`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}
