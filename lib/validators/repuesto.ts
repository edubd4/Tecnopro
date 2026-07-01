import { z } from "zod"

const trimmedOrNull = (val: unknown) => {
  if (typeof val !== "string") return val
  const t = val.trim()
  return t === "" ? null : t
}

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

export const repuestoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  codigo:      z.preprocess(trimmedOrNull, z.string().max(60).nullable()).optional(),
  descripcion: z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
  categoria:   z.preprocess(trimmedOrNull, z.string().max(80).nullable()).optional(),
  costo:        numberFromForm.pipe(z.number().min(0).max(99999999)),
  precio_venta: numberFromForm.pipe(z.number().min(0).max(99999999)),
  stock_minimo: intFromForm.pipe(z.number().int().min(0).max(1000000)),
  ubicacion:   z.preprocess(trimmedOrNull, z.string().max(80).nullable()).optional(),
  activo: z.boolean().default(true),
})

export type RepuestoInput = z.infer<typeof repuestoSchema>

// Movimiento manual (entrada/salida/ajuste)
export const movimientoSchema = z.object({
  repuesto_id: z.string().uuid(),
  tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]),
  cantidad: intFromForm.pipe(
    z.number().int().min(0, "La cantidad no puede ser negativa").max(1000000)
  ),
  motivo: z.preprocess(trimmedOrNull, z.string().max(500).nullable()).optional(),
})

export type MovimientoInput = z.infer<typeof movimientoSchema>
