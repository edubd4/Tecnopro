// ENUMs del dominio TECNOPRO — usar exactamente estos strings en toda la app.
// Cada ENUM tiene espejo en Postgres (ver supabase/migrations/0001_init.sql).

// ─── Roles ────────────────────────────────────────────────────────────────────
export const ROL = {
  ADMIN: 'admin',
  TECNICO: 'tecnico',
} as const
export type Rol = typeof ROL[keyof typeof ROL]

// ─── Clientes ─────────────────────────────────────────────────────────────────
export const ESTADO_CLIENTE = {
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
} as const
export type EstadoCliente = typeof ESTADO_CLIENTE[keyof typeof ESTADO_CLIENTE]

// ─── Órdenes de trabajo ───────────────────────────────────────────────────────
export const ESTADO_ORDEN = {
  RECIBIDA: 'RECIBIDA',
  DIAGNOSTICO: 'DIAGNOSTICO',
  PRESUPUESTADA: 'PRESUPUESTADA',
  EN_REPARACION: 'EN_REPARACION',
  LISTA: 'LISTA',
  ENTREGADA: 'ENTREGADA',
  CANCELADA: 'CANCELADA',
} as const
export type EstadoOrden = typeof ESTADO_ORDEN[keyof typeof ESTADO_ORDEN]

export const PRIORIDAD_ORDEN = {
  BAJA: 'BAJA',
  NORMAL: 'NORMAL',
  ALTA: 'ALTA',
  URGENTE: 'URGENTE',
} as const
export type PrioridadOrden = typeof PRIORIDAD_ORDEN[keyof typeof PRIORIDAD_ORDEN]

// ─── Presupuestos ─────────────────────────────────────────────────────────────
export const ESTADO_PRESUPUESTO = {
  BORRADOR: 'BORRADOR',
  ENVIADO: 'ENVIADO',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  VENCIDO: 'VENCIDO',
} as const
export type EstadoPresupuesto = typeof ESTADO_PRESUPUESTO[keyof typeof ESTADO_PRESUPUESTO]

// ─── Turnos ──────────────────────────────────────────────────────────────────
export const ESTADO_TURNO = {
  PROGRAMADO: 'PROGRAMADO',
  EN_CURSO: 'EN_CURSO',
  COMPLETADO: 'COMPLETADO',
  NO_ASISTIO: 'NO_ASISTIO',
  CANCELADO: 'CANCELADO',
} as const
export type EstadoTurno = typeof ESTADO_TURNO[keyof typeof ESTADO_TURNO]

// ─── Catálogo de servicios ────────────────────────────────────────────────────
export const CATEGORIA_SERVICIO = {
  REPARACION: 'REPARACION',
  REDES: 'REDES',
  ACONDICIONAMIENTO: 'ACONDICIONAMIENTO',
  INSTALACION: 'INSTALACION',
  DIAGNOSTICO: 'DIAGNOSTICO',
  OTRO: 'OTRO',
} as const
export type CategoriaServicio = typeof CATEGORIA_SERVICIO[keyof typeof CATEGORIA_SERVICIO]

// ─── Stock / movimientos de repuestos ─────────────────────────────────────────
export const TIPO_MOV_REPUESTO = {
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',
  AJUSTE: 'AJUSTE',
} as const
export type TipoMovRepuesto = typeof TIPO_MOV_REPUESTO[keyof typeof TIPO_MOV_REPUESTO]

// ─── Caja y movimientos de plata ──────────────────────────────────────────────
export const TIPO_MOV_CAJA = {
  INGRESO: 'INGRESO',
  EGRESO: 'EGRESO',
} as const
export type TipoMovCaja = typeof TIPO_MOV_CAJA[keyof typeof TIPO_MOV_CAJA]

export const ORIGEN_MOV_CAJA = {
  COBRO_ORDEN: 'COBRO_ORDEN',
  GASTO: 'GASTO',
  AJUSTE: 'AJUSTE',
  APERTURA: 'APERTURA',
  CIERRE: 'CIERRE',
  OTRO: 'OTRO',
} as const
export type OrigenMovCaja = typeof ORIGEN_MOV_CAJA[keyof typeof ORIGEN_MOV_CAJA]

export const METODO_PAGO = {
  EFECTIVO: 'EFECTIVO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  TARJETA_DEBITO: 'TARJETA_DEBITO',
  TARJETA_CREDITO: 'TARJETA_CREDITO',
  MERCADO_PAGO: 'MERCADO_PAGO',
  OTRO: 'OTRO',
} as const
export type MetodoPago = typeof METODO_PAGO[keyof typeof METODO_PAGO]

// ─── Historial / auditoría ────────────────────────────────────────────────────
export const TIPO_EVENTO = {
  CAMBIO_ESTADO_ORDEN: 'CAMBIO_ESTADO_ORDEN',
  NUEVO_PRESUPUESTO: 'NUEVO_PRESUPUESTO',
  CAMBIO_ESTADO_PRESUPUESTO: 'CAMBIO_ESTADO_PRESUPUESTO',
  COBRO: 'COBRO',
  GASTO: 'GASTO',
  TURNO_ASIGNADO: 'TURNO_ASIGNADO',
  STOCK_MOVIMIENTO: 'STOCK_MOVIMIENTO',
  NUEVO_CLIENTE: 'NUEVO_CLIENTE',
  NOTA: 'NOTA',
  ALERTA: 'ALERTA',
  MENSAJE_IA: 'MENSAJE_IA',
} as const
export type TipoEvento = typeof TIPO_EVENTO[keyof typeof TIPO_EVENTO]

// ─── Helpers de IDs legibles ──────────────────────────────────────────────────
// Las secuencias y prefijos viven en SQL. En TS exponemos las constantes para
// uso en UI (búsquedas, links, badges).
export const ID_PREFIX = {
  CLIENTE: 'CLI',
  ORDEN: 'OT',
  PRESUPUESTO: 'PRES',
  EQUIPO: 'EQ',
  REPUESTO: 'REP',
  TURNO: 'TRN',
  MOV_CAJA: 'MOV',
} as const
