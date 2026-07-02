// Helpers de fecha y CSV compartidos por los módulos de reporting (Tesorería,
// Contabilidad, Gastos). Mantener las fechas siempre como "YYYY-MM-DD" para
// evitar drift de TZ al cruzar server → client.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function rangoMesActual(base: Date = new Date()): { desde: string; hasta: string } {
  const y = base.getFullYear()
  const m = base.getMonth()
  const primerDia = new Date(y, m, 1)
  const primerDiaSigMes = new Date(y, m + 1, 1)
  return { desde: toISODate(primerDia), hasta: toISODate(primerDiaSigMes) }
}

export function rangoAnioActual(base: Date = new Date()): { desde: string; hasta: string } {
  const y = base.getFullYear()
  return { desde: `${y}-01-01`, hasta: `${y + 1}-01-01` }
}

export function nombreMes(base: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(base)
}

// ─── CSV ────────────────────────────────────────────────────────────────────
// Escape RFC 4180: si el valor tiene coma, comilla o salto de línea, se envuelve
// entre comillas dobles y las comillas internas se duplican.
export function escapeCSVCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCSVCell).join(",")]
  for (const row of rows) {
    lines.push(row.map(escapeCSVCell).join(","))
  }
  // BOM UTF-8 al principio para que Excel abra bien las tildes.
  return "﻿" + lines.join("\r\n")
}
