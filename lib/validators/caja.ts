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

// ─── Movimiento manual (ingresos ad-hoc, egresos, ajustes, apertura, cierre) ─
// COBRO_ORDEN queda excluido: para eso está cobrarOrden que va por RPC.
export const movimientoCreateSchema = z.object({
  tipo: z.enum(["INGRESO", "EGRESO"]),
  origen: z.enum(["GASTO", "AJUSTE", "APERTURA", "CIERRE", "OTRO"]),
  monto: numberFromForm.pipe(z.number().positive("El monto debe ser mayor a 0").max(99999999)),
  metodo_pago: z.enum([
    "EFECTIVO",
    "TRANSFERENCIA",
    "TARJETA_DEBITO",
    "TARJETA_CREDITO",
    "MERCADO_PAGO",
    "OTRO",
  ]),
  descripcion: z.preprocess(
    trimmedOrNull,
    z.string().min(1, "La descripción es obligatoria").max(500),
  ),
  orden_id: uuidOrNull.optional(),
})
export type MovimientoCreateInput = z.infer<typeof movimientoCreateSchema>

// ─── Cobro de orden (usa el RPC cobrar_orden) ────────────────────────────
export const cobrarOrdenSchema = z.object({
  orden_id: z.string().uuid("Orden inválida"),
  monto: numberFromForm.pipe(z.number().positive("El monto debe ser mayor a 0").max(99999999)),
  metodo_pago: z.enum([
    "EFECTIVO",
    "TRANSFERENCIA",
    "TARJETA_DEBITO",
    "TARJETA_CREDITO",
    "MERCADO_PAGO",
    "OTRO",
  ]),
  descripcion: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().max(500),
  ).optional(),
})
export type CobrarOrdenInput = z.infer<typeof cobrarOrdenSchema>
