// Genera un template básico del mensaje de presupuesto para copiar al cliente.
// En Fase 3, este generador se reemplaza por una llamada a Claude Haiku vía
// una server action, pero preservando la misma firma: recibe los datos y
// devuelve el texto. Esto permite hacer el swap sin tocar la UI.

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
