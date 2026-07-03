import { z } from "zod"

// Config es un key-value store. Solo validamos que las claves conocidas
// tengan formato/rangos razonables cuando se les cambia el valor.
export const configuracionUpdateSchema = z.record(
  z.string().min(1),
  z.string().max(500)
)
export type ConfiguracionUpdate = z.infer<typeof configuracionUpdateSchema>

// Claves conocidas del sistema (matchean con los seeds de 0001_init.sql).
export const CONFIG_KEYS = {
  NEGOCIO_NOMBRE:                  "negocio_nombre",
  NEGOCIO_TELEFONO:                "negocio_telefono",
  NEGOCIO_DIRECCION:               "negocio_direccion",
  MONEDA_DEFAULT:                  "moneda_default",
  MARGEN_DEFAULT_PCT:              "margen_default_pct",
  PRESUPUESTO_VALIDEZ_DIAS:        "presupuesto_validez_dias",
  STOCK_ALERTA_DIAS:               "stock_alerta_dias",
  // Wave 2.4 — umbrales de /alertas configurables
  ALERTA_SALDO_VENCIDO_DIAS:       "alerta_saldo_vencido_dias",
  ALERTA_PRESUPUESTO_POR_VENCER:   "alerta_presupuesto_por_vencer_dias",
} as const

// Defaults hardcoded para claves nuevas de config.
// Si la fila no existe en la tabla configuracion (por ej. no se corrió el UPSERT),
// se usa este valor. Consumido por /alertas y por el form de /configuracion.
export const CONFIG_DEFAULTS: Record<string, string> = {
  [CONFIG_KEYS.ALERTA_SALDO_VENCIDO_DIAS]:     "30",
  [CONFIG_KEYS.ALERTA_PRESUPUESTO_POR_VENCER]: "7",
}

// Helper: lee un número de la config con fallback al default.
export function configNumber(
  values: Record<string, string>,
  clave: string,
  fallback: number,
): number {
  const raw = values[clave] ?? CONFIG_DEFAULTS[clave]
  if (raw === undefined || raw === null || raw === "") return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

// Descripcion humana + tipo esperado, para renderizar el form.
export type ConfigFieldSpec = {
  clave: string
  label: string
  descripcion: string
  tipo: "text" | "number" | "moneda"
  placeholder?: string
}

export const CONFIG_FIELDS: ConfigFieldSpec[] = [
  {
    clave: CONFIG_KEYS.NEGOCIO_NOMBRE,
    label: "Nombre del negocio",
    descripcion: "Se muestra en emails, presupuestos y encabezados.",
    tipo: "text",
    placeholder: "TECNOPRO",
  },
  {
    clave: CONFIG_KEYS.NEGOCIO_TELEFONO,
    label: "Teléfono de contacto",
    descripcion: "El teléfono público que ven los clientes.",
    tipo: "text",
    placeholder: "351 555-1234",
  },
  {
    clave: CONFIG_KEYS.NEGOCIO_DIRECCION,
    label: "Dirección del local",
    descripcion: "Se muestra en presupuestos y avisos.",
    tipo: "text",
    placeholder: "Calle y número, ciudad, provincia",
  },
  {
    clave: CONFIG_KEYS.MONEDA_DEFAULT,
    label: "Moneda por defecto",
    descripcion: "ARS o USD. Se usa cuando no se especifica otra.",
    tipo: "moneda",
  },
  {
    clave: CONFIG_KEYS.MARGEN_DEFAULT_PCT,
    label: "Margen por defecto sobre repuestos (%)",
    descripcion: "Sugerido al armar presupuestos. Se puede cambiar por línea.",
    tipo: "number",
    placeholder: "30",
  },
  {
    clave: CONFIG_KEYS.PRESUPUESTO_VALIDEZ_DIAS,
    label: "Validez de presupuesto (días)",
    descripcion: "Pasado ese tiempo, el presupuesto queda como VENCIDO.",
    tipo: "number",
    placeholder: "7",
  },
  {
    clave: CONFIG_KEYS.STOCK_ALERTA_DIAS,
    label: "Antelación general (días)",
    descripcion: "Antelación por defecto para avisos internos. No se usa en módulos específicos hoy.",
    tipo: "number",
    placeholder: "7",
  },
  {
    clave: CONFIG_KEYS.ALERTA_SALDO_VENCIDO_DIAS,
    label: "Alerta de saldos con demora (días)",
    descripcion: "Si una orden lleva más de estos días recibida y aún tiene saldo pendiente, aparece en Alertas.",
    tipo: "number",
    placeholder: "30",
  },
  {
    clave: CONFIG_KEYS.ALERTA_PRESUPUESTO_POR_VENCER,
    label: "Alerta de presupuestos por vencer (días)",
    descripcion: "Presupuestos enviados cuya validez expira dentro de estos días aparecen en Alertas.",
    tipo: "number",
    placeholder: "7",
  },
]
