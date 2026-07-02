-- ============================================================================
-- TECNOPRO · Fase 2 Ola C.3 · Vistas de reporte (Tesoreria + Contabilidad)
-- Sin tablas nuevas: solo vistas que combinan ordenes/items/movimientos_caja
-- para simplificar las queries del reporting.
-- ============================================================================
-- Regla: las vistas respetan RLS de las tablas base (Postgres las evalua para
-- cada consulta). RLS de ordenes: admin ve todas, tecnico ve solo asignadas.
-- RLS de movimientos_caja: admin-only. Entonces esta vista es efectivamente
-- admin-only tambien.

-- ─── Vista: ordenes_con_saldo ──────────────────────────────────────────────
-- Expone por orden: total imputado (servicios + repuestos), total cobrado
-- (movimientos_caja INGRESO/COBRO_ORDEN vinculados), y saldo pendiente.
-- Usada por /tesoreria y (proximo) /panel.
create or replace view public.ordenes_con_saldo as
with items_por_orden as (
  select
    o.id,
    o.id_publico,
    o.cliente_id,
    o.estado,
    o.prioridad,
    o.tecnico_asignado_id,
    o.fecha_recepcion,
    o.fecha_entrega_estimada,
    o.fecha_entrega_real,
    coalesce(
      (select sum(precio * cantidad)
         from public.orden_servicios
         where orden_id = o.id),
      0
    )
    +
    coalesce(
      (select sum(precio_unitario * cantidad)
         from public.orden_repuestos
         where orden_id = o.id),
      0
    ) as total
  from public.ordenes o
),
cobros_por_orden as (
  select
    orden_id,
    sum(monto)::numeric(14,2) as cobrado,
    count(*)::int             as cobros
  from public.movimientos_caja
  where tipo = 'INGRESO'
    and origen = 'COBRO_ORDEN'
    and orden_id is not null
  group by orden_id
)
select
  i.id,
  i.id_publico,
  i.cliente_id,
  i.estado,
  i.prioridad,
  i.tecnico_asignado_id,
  i.fecha_recepcion,
  i.fecha_entrega_estimada,
  i.fecha_entrega_real,
  i.total::numeric(14,2)                                  as total,
  coalesce(c.cobrado, 0)::numeric(14,2)                   as cobrado,
  (i.total - coalesce(c.cobrado, 0))::numeric(14,2)       as saldo_pendiente,
  coalesce(c.cobros, 0)                                   as cantidad_cobros
from items_por_orden i
left join cobros_por_orden c on c.orden_id = i.id;

comment on view public.ordenes_con_saldo is
  'Orden con total imputado, total cobrado y saldo pendiente. RLS heredada de ordenes + movimientos_caja.';

grant select on public.ordenes_con_saldo to authenticated;
revoke all on public.ordenes_con_saldo from anon;
