import { z } from "zod"

const trimmedOrNull = (val: unknown) => {
  if (typeof val !== "string") return val
  const t = val.trim()
  return t === "" ? null : t
}

// Los numeros llegan desde el form como string (input type=number). Los
// convertimos a number con validaciones. Precio en ARS, tiempo en minutos.
const numberFromForm = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined
  if (typeof val === "string") return Number(val)
  return val
}, z.number())

export const servicioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  descripcion: z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
  categoria: z.enum([
    "REPARACION",
    "REDES",
    "ACONDICIONAMIENTO",
    "INSTALACION",
    "DIAGNOSTICO",
    "OTRO",
  ]),
  precio_base: numberFromForm.pipe(
    z.number().min(0, "El precio no puede ser negativo").max(99999999)
  ),
  tiempo_estimado_min: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().int().positive("Debe ser mayor a 0").max(100000).nullable()
    )
    .optional(),
  activo: z.boolean().default(true),
})

export type ServicioInput = z.infer<typeof servicioSchema>
