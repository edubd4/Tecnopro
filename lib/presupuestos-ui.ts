export const ESTADO_PRES_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  VENCIDO: "Vencido",
}

export const ESTADO_PRES_VARIANT: Record<string, "gray" | "cyan" | "green" | "red" | "amber"> = {
  BORRADOR: "gray",
  ENVIADO: "cyan",
  APROBADO: "green",
  RECHAZADO: "red",
  VENCIDO: "amber",
}
