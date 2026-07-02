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

const numberFromForm = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined
  if (typeof val === "string") return Number(val)
  return val
}, z.number())

const intFromForm = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined
  if (typeof val === "string") return Number(val)
  return val
}, z.number().int())

export const presupuestoCreateSchema = z.object({
  cliente_id: z.string().uuid("Cliente obligatorio"),
  orden_id: uuidOrNull.optional(),
  titulo: z.string().trim().min(1, "El título es obligatorio").max(200),
  descripcion:    z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
  validez_hasta:  z.preprocess((v) => (v === "" ? undefined : v), z.string()).optional(),
  margen_pct: numberFromForm.pipe(z.number().min(0).max(500)),
  notas_internas: z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
})
export type PresupuestoCreateInput = z.infer<typeof presupuestoCreateSchema>

export const presupuestoUpdateSchema = presupuestoCreateSchema

export const cambiarEstadoPresupuestoSchema = z.object({
  estado: z.enum(["BORRADOR", "ENVIADO", "APROBADO", "RECHAZADO", "VENCIDO"]),
})
export type CambiarEstadoPresupuestoInput = z.infer<typeof cambiarEstadoPresupuestoSchema>

// ─── Items ────────────────────────────────────────────────────────────────
export const agregarServicioPresSchema = z.object({
  presupuesto_id: z.string().uuid(),
  servicio_id: z.string().uuid("Elegí un servicio"),
  precio: numberFromForm.pipe(z.number().min(0).max(99999999)),
  cantidad: intFromForm.pipe(z.number().int().min(1).max(1000)),
})
export type AgregarServicioPresInput = z.infer<typeof agregarServicioPresSchema>

export const agregarRepuestoPresSchema = z.object({
  presupuesto_id: z.string().uuid(),
  repuesto_id: z.string().uuid("Elegí un repuesto"),
  precio_unitario: numberFromForm.pipe(z.number().min(0).max(99999999)),
  cantidad: intFromForm.pipe(z.number().int().min(1).max(100000)),
})
export type AgregarRepuestoPresInput = z.infer<typeof agregarRepuestoPresSchema>

export const guardarMensajeSchema = z.object({
  mensaje: z.string().max(20000),
})
export type GuardarMensajeInput = z.infer<typeof guardarMensajeSchema>
