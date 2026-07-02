// Labels + badge variants para el módulo Caja.
// Los ENUMs viven en lib/constants.ts; acá van los textos para UI.

export const TIPO_MOV_CAJA_LABEL: Record<string, string> = {
  INGRESO: "Ingreso",
  EGRESO: "Egreso",
}

export const TIPO_MOV_CAJA_VARIANT: Record<string, "green" | "red"> = {
  INGRESO: "green",
  EGRESO: "red",
}

export const ORIGEN_MOV_CAJA_LABEL: Record<string, string> = {
  COBRO_ORDEN: "Cobro de orden",
  GASTO: "Gasto",
  AJUSTE: "Ajuste",
  APERTURA: "Apertura",
  CIERRE: "Cierre",
  OTRO: "Otro",
}

export const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA_DEBITO: "Débito",
  TARJETA_CREDITO: "Crédito",
  MERCADO_PAGO: "Mercado Pago",
  OTRO: "Otro",
}

// Orígenes disponibles al crear un movimiento manual desde /caja/nuevo.
// COBRO_ORDEN queda fuera: solo se genera desde la ficha de orden vía RPC.
export const ORIGENES_MANUALES = ["GASTO", "AJUSTE", "APERTURA", "CIERRE", "OTRO"] as const
