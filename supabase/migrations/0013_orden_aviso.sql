-- ============================================================================
-- TECNOPRO · Fase 3.2 · Aviso automático de orden por cambio de estado
-- ============================================================================
-- Agrega 2 columnas a `ordenes`:
--   mensaje_estado_generado (text): último aviso generado para el cliente.
--   mensaje_estado_para (text): estado al que corresponde el aviso (para saber
--                               si está desactualizado si el estado cambió después).
--
-- El aviso se regenera automáticamente cuando la orden pasa por estados que
-- ameriten avisar al cliente (RECIBIDA, DIAGNOSTICO, PRESUPUESTADA,
-- EN_REPARACION, LISTA). Los estados ENTREGADA y CANCELADA no generan aviso
-- automático (el cliente ya se enteró).
--
-- La generación puede ser IA (Claude Haiku) con fallback al template. Cero
-- migración adicional cuando se prende la IA.

alter table public.ordenes
  add column if not exists mensaje_estado_generado text,
  add column if not exists mensaje_estado_para     text;

comment on column public.ordenes.mensaje_estado_generado is
  'Aviso para el cliente generado al cambiar el estado (IA o template).';
comment on column public.ordenes.mensaje_estado_para is
  'Estado al que corresponde el aviso guardado. Si difiere del estado actual, el aviso está desactualizado.';
