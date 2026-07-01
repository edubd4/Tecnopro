import { z } from "zod"

const trimmedOrNull = (val: unknown) => {
  if (typeof val !== "string") return val
  const t = val.trim()
  return t === "" ? null : t
}

// Schema comun para create y update. Nombre siempre requerido.
// Para EMPRESA, razon_social es requerida; para PARTICULAR, apellido recomendado
// (no obligatorio para no trabar cargas rapidas).
export const clienteSchema = z
  .object({
    tipo: z.enum(["PARTICULAR", "EMPRESA"]),
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .max(120, "Máximo 120 caracteres"),
    apellido:     z.preprocess(trimmedOrNull, z.string().max(120).nullable()).optional(),
    razon_social: z.preprocess(trimmedOrNull, z.string().max(200).nullable()).optional(),
    documento:    z.preprocess(trimmedOrNull, z.string().max(30).nullable()).optional(),
    telefono:     z.preprocess(trimmedOrNull, z.string().max(30).nullable()).optional(),
    whatsapp:     z.preprocess(trimmedOrNull, z.string().max(30).nullable()).optional(),
    email:        z.preprocess(trimmedOrNull, z.string().email("Email invalido").max(200).nullable()).optional(),
    direccion:    z.preprocess(trimmedOrNull, z.string().max(200).nullable()).optional(),
    provincia:    z.preprocess(trimmedOrNull, z.string().max(80).nullable()).optional(),
    ciudad:       z.preprocess(trimmedOrNull, z.string().max(80).nullable()).optional(),
    notas:        z.preprocess(trimmedOrNull, z.string().max(2000).nullable()).optional(),
  })
  .refine(
    (data) => data.tipo !== "EMPRESA" || (data.razon_social && data.razon_social.length > 0),
    { message: "La razón social es obligatoria para empresas", path: ["razon_social"] }
  )

export type ClienteInput = z.infer<typeof clienteSchema>
