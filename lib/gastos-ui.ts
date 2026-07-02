// Módulo Gastos: la mayoría de labels son dinámicos (categorías vienen de DB).
// Los labels de METODO_PAGO están en lib/caja-ui.ts — se reusan desde ahí.

// Helper para el rango del mes actual en formato ISO (server-side).
export function rangoMesActual(base: Date = new Date()): { desde: string; hasta: string } {
  const y = base.getFullYear()
  const m = base.getMonth()
  const primerDia = new Date(y, m, 1)
  const primerDiaSigMes = new Date(y, m + 1, 1)
  const toISO = (d: Date): string => {
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yy}-${mm}-${dd}`
  }
  return { desde: toISO(primerDia), hasta: toISO(primerDiaSigMes) }
}

export function nombreMes(base: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(base)
}
