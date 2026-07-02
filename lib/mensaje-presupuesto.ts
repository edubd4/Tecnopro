// Genera el mensaje de presupuesto para copiar al cliente.
// Fase 2: template estático (fallback).
// Fase 3.1: llamada a Claude Haiku (`generarMensajePresupuestoIA`) con la
// misma firma de datos. El action decide cuál usar según haya API key.

import { llamarAnthropic, type IAResponse } from "@/lib/anthropic"

export type DatosMensajePresupuesto = {
  negocioNombre: string
  clienteNombre: string
  presupuestoId: string
  titulo: string
  descripcion: string | null
  servicios: Array<{ descripcion: string; cantidad: number; precio: number }>
  repuestos: Array<{ descripcion: string; cantidad: number; precio: number }>
  subtotalServicios: number
  subtotalRepuestos: number
  total: number
  validezHasta: string       // YYYY-MM-DD
}

function money(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(n)
}

function fecha(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

export function generarMensajePresupuestoTemplate(d: DatosMensajePresupuesto): string {
  const lineas: string[] = []

  lineas.push(`¡Hola ${d.clienteNombre}!`)
  lineas.push("")
  lineas.push(`Te pasamos el presupuesto ${d.presupuestoId} para ${d.titulo.toLowerCase()}:`)
  lineas.push("")

  if (d.servicios.length > 0) {
    lineas.push("*Trabajos a realizar:*")
    for (const s of d.servicios) {
      const sub = s.precio * s.cantidad
      const linea = s.cantidad > 1
        ? `• ${s.descripcion} × ${s.cantidad} — ${money(sub)}`
        : `• ${s.descripcion} — ${money(sub)}`
      lineas.push(linea)
    }
    lineas.push("")
  }

  if (d.repuestos.length > 0) {
    lineas.push("*Repuestos incluidos:*")
    for (const r of d.repuestos) {
      const sub = r.precio * r.cantidad
      const linea = r.cantidad > 1
        ? `• ${r.descripcion} × ${r.cantidad} — ${money(sub)}`
        : `• ${r.descripcion} — ${money(sub)}`
      lineas.push(linea)
    }
    lineas.push("")
  }

  lineas.push(`*Total: ${money(d.total)}*`)
  lineas.push("")
  lineas.push(`El presupuesto tiene validez hasta el ${fecha(d.validezHasta)}.`)
  lineas.push("")
  lineas.push("Cualquier consulta, quedo a disposición.")
  lineas.push(`— ${d.negocioNombre}`)

  return lineas.join("\n")
}

// ─── IA (Fase 3.1) ─────────────────────────────────────────────────────────
// System prompt fijo: forzamos español rioplatense y estructura consistente.
// El modelo tiene libertad para el tono pero no puede inventar precios ni items.
const SYSTEM_PROMPT_MENSAJE = `Sos un asistente que redacta mensajes cortos y profesionales para clientes de un servicio técnico en Argentina.

Reglas duras:
- Escribí en español rioplatense (voseo). Tono cordial, cercano, profesional. Sin ser efusivo.
- NO inventes datos: usá exactamente los servicios, repuestos, precios y totales que se te dan.
- NO agregues garantías, plazos de reparación ni promesas que no estén en los datos.
- Formateá los precios con el signo $ y separador de miles con punto (ej: $12.500).
- Estructura: saludo, referencia al ID del presupuesto, resumen breve de trabajos, resumen breve de repuestos (si hay), total destacado, validez, cierre corto con firma del negocio.
- Máximo 15 líneas. Usá saltos de línea para que sea legible en un chat.
- No uses markdown pesado. Podés usar asteriscos simples para destacar (*Total: $X*) o bullet points con "•".

Devolvé SOLO el mensaje listo para copiar, sin explicaciones adicionales.`

function buildPromptMensaje(d: DatosMensajePresupuesto): string {
  const servicios = d.servicios.length > 0
    ? d.servicios.map((s) => `  - ${s.descripcion} × ${s.cantidad} @ ${money(s.precio)}/u → ${money(s.precio * s.cantidad)}`).join("\n")
    : "  (ninguno)"
  const repuestos = d.repuestos.length > 0
    ? d.repuestos.map((r) => `  - ${r.descripcion} × ${r.cantidad} @ ${money(r.precio)}/u → ${money(r.precio * r.cantidad)}`).join("\n")
    : "  (ninguno)"

  return `Datos del presupuesto:

Negocio: ${d.negocioNombre}
Cliente: ${d.clienteNombre}
ID presupuesto: ${d.presupuestoId}
Título del trabajo: ${d.titulo}
Descripción adicional: ${d.descripcion ?? "(sin descripción)"}

Servicios cotizados:
${servicios}
Subtotal servicios: ${money(d.subtotalServicios)}

Repuestos cotizados:
${repuestos}
Subtotal repuestos: ${money(d.subtotalRepuestos)}

TOTAL: ${money(d.total)}
Validez del presupuesto hasta: ${fecha(d.validezHasta)}

Redactá el mensaje siguiendo las reglas del system prompt.`
}

export type MensajeIAResult = {
  mensaje: string
  tokensInput: number
  tokensOutput: number
  model: string
}

/**
 * Genera el mensaje con Claude Haiku. Puede tirar exception (rate limit,
 * key inválida, red). El caller debe hacer try/catch y caer al template.
 */
export async function generarMensajePresupuestoIA(
  d: DatosMensajePresupuesto,
): Promise<MensajeIAResult> {
  const response: IAResponse = await llamarAnthropic({
    systemPrompt: SYSTEM_PROMPT_MENSAJE,
    userPrompt: buildPromptMensaje(d),
    maxTokens: 800,
    temperature: 0.5,
  })
  return {
    mensaje: response.text,
    tokensInput: response.tokensInput,
    tokensOutput: response.tokensOutput,
    model: response.model,
  }
}
