export const ESTADO_TURNO_LABEL: Record<string, string> = {
  PROGRAMADO: "Programado",
  EN_CURSO: "En curso",
  COMPLETADO: "Completado",
  NO_ASISTIO: "No asistió",
  CANCELADO: "Cancelado",
}

export const ESTADO_TURNO_VARIANT: Record<string, "green" | "cyan" | "amber" | "red" | "gray"> = {
  PROGRAMADO: "cyan",
  EN_CURSO: "amber",
  COMPLETADO: "green",
  NO_ASISTIO: "red",
  CANCELADO: "gray",
}
