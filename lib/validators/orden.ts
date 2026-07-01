import { z } from "zod"

const trimmedOrNull = (val: unknown) => {
  if (typeof val !== "string") return val
  const t = val.trim()
  return t === "" ? null : t
}

const dateFromForm = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return null
  return val
}, z.string().nullable())

const uuidFromForm = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return null
  return val
}, z.string().uuid().nullable())

export const ordenCreateSchema = z.object({
  cliente_id: z.string().uuid("Cliente obligatorio"),
  equipo_desc:            z.preprocess(trimmedOrNull, z.string().max(500).nullable()).optional(),
  falla_declarada:        z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
  prioridad: z.enum(["BAJA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
  tecnico_asignado_id:    uuidFromForm.optional(),
  fecha_entrega_estimada: dateFromForm.optional(),
  notas_internas:         z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
})
export type OrdenCreateInput = z.infer<typeof ordenCreateSchema>

export const ordenUpdateSchema = z.object({
  cliente_id: z.string().uuid(),
  equipo_desc:            z.preprocess(trimmedOrNull, z.string().max(500).nullable()).optional(),
  falla_declarada:        z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
  diagnostico:            z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
  prioridad: z.enum(["BAJA", "NORMAL", "ALTA", "URGENTE"]),
  tecnico_asignado_id:    uuidFromForm.optional(),
  fecha_entrega_estimada: dateFromForm.optional(),
  notas_internas:         z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
})
export type OrdenUpdateInput = z.infer<typeof ordenUpdateSchema>

export const cambiarEstadoSchema = z.object({
  estado: z.enum([
    "RECIBIDA", "DIAGNOSTICO", "PRESUPUESTADA", "EN_REPARACION",
    "LISTA", "ENTREGADA", "CANCELADA",
  ]),
})
export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>
