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
  NEGOCIO_NOMBRE:           "negocio_nombre",
  NEGOCIO_TELEFONO:         "negocio_telefono",
  NEGOCIO_DIRECCION:        "negocio_direccion",
  MONEDA_DEFAULT:           "moneda_default",
  MARGEN_DEFAULT_PCT:       "margen_default_pct",
  PRESUPUESTO_VALIDEZ_DIAS: "presupuesto_validez_dias",
  STOCK_ALERTA_DIAS:        "stock_alerta_dias",
} as const

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
    label: "Antelación de alertas (días)",
    descripcion: "Días de anticipación para avisar pagos y entregas próximas.",
    tipo: "number",
    placeholder: "7",
  },
]
