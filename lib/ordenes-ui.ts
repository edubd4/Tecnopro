// Helpers de presentacion para el modulo Ordenes.
// Vive en lib/ para poder importarse desde server components sin arrastrar
// codigo client-only.

export const ESTADO_ORDEN_LABEL: Record<string, string> = {
  RECIBIDA: "Recibida",
  DIAGNOSTICO: "En diagnóstico",
  PRESUPUESTADA: "Presupuestada",
  EN_REPARACION: "En reparación",
  LISTA: "Lista para entrega",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",
}

export const ESTADO_ORDEN_VARIANT: Record<string, "green" | "cyan" | "amber" | "red" | "violet" | "gray"> = {
  RECIBIDA: "cyan",
  DIAGNOSTICO: "cyan",
  PRESUPUESTADA: "amber",
  EN_REPARACION: "amber",
  LISTA: "green",
  ENTREGADA: "green",
  CANCELADA: "red",
}

export const PRIORIDAD_LABEL: Record<string, string> = {
  BAJA: "Baja",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
}

export const PRIORIDAD_VARIANT: Record<string, "gray" | "cyan" | "amber" | "red"> = {
  BAJA: "gray",
  NORMAL: "cyan",
  ALTA: "amber",
  URGENTE: "red",
}
