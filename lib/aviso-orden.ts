// Genera avisos automáticos para el cliente cuando cambia el estado de una orden.
// Fase 2 (fallback): templates estáticos por estado.
// Fase 3.2: llamada a Claude Haiku con la misma firma de datos.

import { llamarAnthropic, type IAResponse } from "@/lib/anthropic"

export type DatosAvisoOrden = {
  negocioNombre: string
  clienteNombre: string
  ordenIdPublico: string
  equipoDesc: string | null
  estadoAnterior: string | null
  estadoNuevo: string
  presupuestoIdPublico: string | null
  fechaEntregaEstimada: string | null   // YYYY-MM-DD o null
  tecnicoNombre: string | null
}

// Estados que generan aviso al cliente.
// ENTREGADA y CANCELADA no ameritan porque el cliente ya está enterado.
export const ESTADOS_CON_AVISO = new Set([
  "RECIBIDA",
  "DIAGNOSTICO",
  "PRESUPUESTADA",
  "EN_REPARACION",
  "LISTA",
])

export function estadoGeneraAviso(estado: string): boolean {
  return ESTADOS_CON_AVISO.has(estado)
}

function fecha(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

// ─── Template estático (fallback) ────────────────────────────────────────
export function generarAvisoOrdenTemplate(d: DatosAvisoOrden): string {
  const cliente = d.clienteNombre.trim() || "cliente"
  const equipo = d.equipoDesc?.trim() || "tu equipo"
  const firma = `— ${d.negocioNombre}`

  switch (d.estadoNuevo) {
    case "RECIBIDA":
      return [
        `¡Hola ${cliente}!`,
        "",
        `Recibimos ${equipo} en el taller. Registramos la orden como ${d.ordenIdPublico}.`,
        "En cuanto arrancamos el diagnóstico te avisamos.",
        "",
        firma,
      ].join("\n")

    case "DIAGNOSTICO":
      return [
        `¡Hola ${cliente}!`,
        "",
        `Ya estamos revisando ${equipo}. En cuanto tengamos el diagnóstico te pasamos el presupuesto por acá.`,
        "",
        `Orden: ${d.ordenIdPublico}`,
        "",
        firma,
      ].join("\n")

    case "PRESUPUESTADA":
      const refPres = d.presupuestoIdPublico ? ` (${d.presupuestoIdPublico})` : ""
      return [
        `¡Hola ${cliente}!`,
        "",
        `Ya te pasamos el presupuesto${refPres} para la reparación de ${equipo}.`,
        "Cuando puedas, avisanos si lo aprobás para arrancar.",
        "",
        `Orden: ${d.ordenIdPublico}`,
        "",
        firma,
      ].join("\n")

    case "EN_REPARACION":
      const fechaTxt = d.fechaEntregaEstimada
        ? ` Estimamos tenerlo listo para el ${fecha(d.fechaEntregaEstimada)}.`
        : ""
      return [
        `¡Hola ${cliente}!`,
        "",
        `Ya nos pusimos a trabajar en ${equipo}.${fechaTxt}`,
        "Cualquier novedad te avisamos.",
        "",
        `Orden: ${d.ordenIdPublico}`,
        "",
        firma,
      ].join("\n")

    case "LISTA":
      return [
        `¡Hola ${cliente}!`,
        "",
        `${equipo} ya está listo. Cuando quieras te esperamos por el taller para retirarlo.`,
        "",
        `Orden: ${d.ordenIdPublico}`,
        "",
        firma,
      ].join("\n")

    default:
      return [
        `¡Hola ${cliente}!`,
        "",
        `Novedad sobre tu orden ${d.ordenIdPublico}.`,
        "",
        firma,
      ].join("\n")
  }
}

// ─── IA (Fase 3.2) ────────────────────────────────────────────────────────
const SYSTEM_PROMPT_AVISO = `Sos un asistente que redacta mensajes cortos para clientes de un servicio técnico en Argentina, avisando novedades sobre su orden de reparación.

Reglas duras:
- Escribí en español rioplatense (voseo). Cordial, cálido, profesional. Ni frío ni excesivamente informal.
- NO inventes plazos, precios, garantías ni promesas.
- NO inventes detalles del equipo o del trabajo.
- Si hay fecha estimada de entrega, mencionala; si no, no inventes una.
- Máximo 8 líneas. Con saltos de línea para que sea legible en un chat.
- No uses markdown pesado. Podés usar bullets con "•" si hace falta.
- Estructura sugerida: saludo, dato central de la novedad, próximo paso claro, firma del negocio.
- Devolvé SOLO el mensaje listo para copiar, sin explicaciones adicionales.

Guía por estado:
- RECIBIDA: confirmar que recibiste el equipo, decir que pronto avisás el diagnóstico.
- DIAGNOSTICO: contar que estás revisando, próximo paso es pasar presupuesto.
- PRESUPUESTADA: mencionar que ya pasaste el presupuesto, pedirle que confirme.
- EN_REPARACION: contar que arrancaste, dar fecha estimada si aplica.
- LISTA: avisar que ya está listo para retirar.`

function buildPromptAviso(d: DatosAvisoOrden): string {
  const lineas: string[] = []
  lineas.push("Datos de la orden:")
  lineas.push(`- Negocio: ${d.negocioNombre}`)
  lineas.push(`- Cliente: ${d.clienteNombre}`)
  lineas.push(`- ID orden: ${d.ordenIdPublico}`)
  lineas.push(`- Equipo: ${d.equipoDesc ?? "(sin descripción)"}`)
  lineas.push(`- Estado nuevo: ${d.estadoNuevo}`)
  if (d.estadoAnterior) lineas.push(`- Estado anterior: ${d.estadoAnterior}`)
  if (d.presupuestoIdPublico) lineas.push(`- Presupuesto asociado: ${d.presupuestoIdPublico}`)
  if (d.fechaEntregaEstimada) lineas.push(`- Fecha estimada de entrega: ${fecha(d.fechaEntregaEstimada)}`)
  if (d.tecnicoNombre) lineas.push(`- Técnico asignado: ${d.tecnicoNombre}`)
  lineas.push("")
  lineas.push(`Redactá el aviso para el estado "${d.estadoNuevo}" siguiendo las reglas del system prompt.`)
  return lineas.join("\n")
}

export type AvisoIAResult = {
  mensaje: string
  tokensInput: number
  tokensOutput: number
  model: string
}

/**
 * Genera el aviso con Claude Haiku. Puede tirar exception (rate limit, key
 * inválida, red). El caller debe hacer try/catch y caer al template.
 */
export async function generarAvisoOrdenIA(d: DatosAvisoOrden): Promise<AvisoIAResult> {
  const response: IAResponse = await llamarAnthropic({
    systemPrompt: SYSTEM_PROMPT_AVISO,
    userPrompt: buildPromptAviso(d),
    maxTokens: 500,
    temperature: 0.7,   // Un poco más de creatividad para variar entre generaciones
  })
  return {
    mensaje: response.text,
    tokensInput: response.tokensInput,
    tokensOutput: response.tokensOutput,
    model: response.model,
  }
}
