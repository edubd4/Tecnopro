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

export const gastoCreateSchema = z.object({
  categoria_id: intFromForm.pipe(z.number().int().positive("Elegí una categoría")),
  monto: numberFromForm.pipe(z.number().positive("El monto debe ser mayor a 0").max(99999999)),
  descripcion: z.preprocess(
    trimmedOrNull,
    z.string().min(1, "La descripción es obligatoria").max(500),
  ),
  fecha: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string(),
  ).optional(),
  metodo_pago: z.enum([
    "EFECTIVO",
    "TRANSFERENCIA",
    "TARJETA_DEBITO",
    "TARJETA_CREDITO",
    "MERCADO_PAGO",
    "OTRO",
  ]),
  notas: z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
})
export type GastoCreateInput = z.infer<typeof gastoCreateSchema>
