import Anthropic from "@anthropic-ai/sdk"

// ============================================================================
// Helper único para el cliente Anthropic. Reglas duras:
// - SOLO server-side. Nunca importar desde un client component.
// - La API key vive en env; si no está, `hayIADisponible()` devuelve false y el
//   caller cae al template. Esto permite que dev/preview funcione sin key.
// - Un modelo default configurable por env (`ANTHROPIC_MODEL`) para poder
//   subir/bajar sin redeploy.
// ============================================================================

const DEFAULT_MODEL = "claude-haiku-4-5-20251001"

let cachedClient: Anthropic | null = null

/**
 * Devuelve true si la env var ANTHROPIC_API_KEY está configurada.
 * Usar antes de llamar a `getAnthropicClient()` para evitar exceptions.
 */
export function hayIADisponible(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no está configurada")
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return cachedClient
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
}

/**
 * Resultado tipado de una llamada a Anthropic. Incluye el texto de respuesta
 * y el conteo de tokens para logging de consumo.
 */
export type IAResponse = {
  text: string
  tokensInput: number
  tokensOutput: number
  model: string
}

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

/**
 * Llama al modelo con un prompt de user + system opcional y devuelve texto
 * concatenado + métricas. Extrae solo bloques `text` (ignora tool_use, etc).
 */
export async function llamarAnthropic(params: {
  systemPrompt?: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
}): Promise<IAResponse> {
  return llamarAnthropicMulti({
    systemPrompt: params.systemPrompt,
    messages: [{ role: "user", content: params.userPrompt }],
    maxTokens: params.maxTokens,
    temperature: params.temperature,
  })
}

/**
 * Variante multi-turn: recibe un array de mensajes (user/assistant) para
 * conversaciones continuas donde el modelo necesita recordar el hilo.
 * Usado por el chat con IA (Fase 3.3).
 */
export async function llamarAnthropicMulti(params: {
  systemPrompt?: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<IAResponse> {
  const client = getAnthropicClient()
  const model = getAnthropicModel()

  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 1024,
    temperature: params.temperature ?? 0.6,
    ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
    messages: params.messages,
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim()

  return {
    text,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    model,
  }
}
