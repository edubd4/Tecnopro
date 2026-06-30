// Validación de API key para endpoints webhook (M2M).
// Habilitado para integraciones futuras (n8n, sistemas externos).
export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key')
  const expected = process.env.WEBHOOK_API_KEY
  return !!apiKey && !!expected && apiKey === expected
}
