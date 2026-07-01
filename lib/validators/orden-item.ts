import { z } from "zod"

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

export const agregarServicioSchema = z.object({
  orden_id: z.string().uuid(),
  servicio_id: z.string().uuid("Elegí un servicio"),
  precio: numberFromForm.pipe(z.number().min(0).max(99999999)),
  cantidad: intFromForm.pipe(z.number().int().min(1).max(1000)),
})
export type AgregarServicioInput = z.infer<typeof agregarServicioSchema>

export const agregarRepuestoSchema = z.object({
  orden_id: z.string().uuid(),
  repuesto_id: z.string().uuid("Elegí un repuesto"),
  precio_unitario: numberFromForm.pipe(z.number().min(0).max(99999999)),
  cantidad: intFromForm.pipe(z.number().int().min(1).max(100000)),
})
export type AgregarRepuestoInput = z.infer<typeof agregarRepuestoSchema>
