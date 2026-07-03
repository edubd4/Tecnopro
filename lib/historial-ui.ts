// Labels + variants para el módulo /historial (Wave 3.1).
// Los tipos vienen del enum tipo_evento definido en el schema.

export const TIPO_EVENTO_LABEL: Record<string, string> = {
  CAMBIO_ESTADO_ORDEN:       "Cambio de estado orden",
  NUEVO_PRESUPUESTO:         "Nuevo presupuesto",
  CAMBIO_ESTADO_PRESUPUESTO: "Cambio de estado presupuesto",
  COBRO:                     "Cobro",
  GASTO:                     "Gasto",
  TURNO_ASIGNADO:            "Turno / Asignación",
  STOCK_MOVIMIENTO:          "Movimiento de stock",
  NUEVO_CLIENTE:             "Alta / Registro",
  NOTA:                      "Nota",
  ALERTA:                    "Alerta",
  MENSAJE_IA:                "Mensaje IA",
}

export const TIPO_EVENTO_VARIANT: Record<string, "cyan" | "amber" | "green" | "red" | "violet" | "gray"> = {
  CAMBIO_ESTADO_ORDEN:       "cyan",
  NUEVO_PRESUPUESTO:         "amber",
  CAMBIO_ESTADO_PRESUPUESTO: "amber",
  COBRO:                     "green",
  GASTO:                     "red",
  TURNO_ASIGNADO:            "cyan",
  STOCK_MOVIMIENTO:          "cyan",
  NUEVO_CLIENTE:             "gray",
  NOTA:                      "gray",
  ALERTA:                    "amber",
  MENSAJE_IA:                "violet",
}

export const ENTIDAD_TIPO_LABEL: Record<string, string> = {
  cliente:     "Cliente",
  orden:       "Orden",
  presupuesto: "Presupuesto",
  turno:       "Turno",
  repuesto:    "Repuesto",
  servicio:    "Servicio",
  usuario:     "Usuario",
  gasto:       "Gasto",
  movimiento:  "Movimiento",
  categoria_gasto: "Categoría gasto",
}

export function linkEntidad(tipo: string | null, id: string | null): string | null {
  if (!tipo || !id) return null
  switch (tipo) {
    case "orden":       return `/ordenes?q=${encodeURIComponent(id)}`
    case "presupuesto": return `/presupuestos?q=${encodeURIComponent(id)}`
    case "cliente":     return `/clientes?q=${encodeURIComponent(id)}`
    case "turno":       return `/turnos?q=${encodeURIComponent(id)}`
    case "repuesto":    return `/stock?q=${encodeURIComponent(id)}`
    case "servicio":    return `/catalogo?q=${encodeURIComponent(id)}`
    case "gasto":       return `/caja?q=${encodeURIComponent(id)}`
    default:            return null
  }
}
