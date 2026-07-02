// Módulo Gastos: la mayoría de labels son dinámicos (categorías vienen de DB).
// Los labels de METODO_PAGO están en lib/caja-ui.ts — se reusan desde ahí.
// Los helpers de fecha viven en lib/fechas.ts — se re-exportan acá para no
// romper las imports existentes.
export { rangoMesActual, nombreMes } from "@/lib/fechas"
