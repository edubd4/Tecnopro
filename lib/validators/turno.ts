import { z } from "zod"

const trimmedOrNull = (val: unknown) => {
  if (typeof val !== "string") return val
  const t = val.trim()
  return t === "" ? null : t
}

const uuidOrNull = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return null
  return val
}, z.string().uuid().nullable())

// datetime-local devuelve strings tipo "2026-07-01T15:30" (sin timezone).
// Los pasamos tal cual — Postgres los interpreta con la timezone del server.
// En una fase siguiente podemos normalizarlos con TZ del negocio.
const isoDateTime = z.string().min(1, "Fecha y hora requeridas")

export const turnoCreateSchema = z
  .object({
    titulo: z.string().trim().min(1, "El título es obligatorio").max(200),
    descripcion:    z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
    cliente_id:     uuidOrNull.optional(),
    orden_id:       uuidOrNull.optional(),
    tecnico_id:     uuidOrNull.optional(),
    fecha_inicio: isoDateTime,
    fecha_fin:    isoDateTime,
    color:          z.preprocess(trimmedOrNull, z.string().max(20).nullable()).optional(),
    notas_internas: z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
  })
  .refine(
    (d) => new Date(d.fecha_inicio) < new Date(d.fecha_fin),
    { message: "La fecha de fin debe ser posterior al inicio", path: ["fecha_fin"] }
  )

export type TurnoCreateInput = z.infer<typeof turnoCreateSchema>

export const turnoUpdateSchema = turnoCreateSchema

export const cambiarEstadoTurnoSchema = z.object({
  estado: z.enum([
    "PROGRAMADO", "EN_CURSO", "COMPLETADO", "NO_ASISTIO", "CANCELADO",
  ]),
})
export type CambiarEstadoTurnoInput = z.infer<typeof cambiarEstadoTurnoSchema>
