-- ============================================================================
-- TECNOPRO · Fase 2 Ola B.1b · Items imputados a la orden
-- Servicios y repuestos que se agregan a una orden de trabajo.
-- Los repuestos disparan movimiento SALIDA automatico via RPC transaccional.
-- ============================================================================

-- ─── Tabla: orden_servicios ────────────────────────────────────────────────
create table public.orden_servicios (
  id                   bigserial primary key,
  orden_id             uuid not null references public.ordenes(id) on delete cascade,
  servicio_id          uuid not null references public.servicios(id) on delete restrict,
  descripcion_snapshot text not null,           -- snapshot del nombre al momento de imputar
  precio               numeric(12,2) not null check (precio >= 0),
  cantidad             integer not null check (cantidad > 0),
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id)
);

create index idx_orden_servicios_orden on public.orden_servicios(orden_id);

-- ─── Tabla: orden_repuestos ───────────────────────────────────────────────
create table public.orden_repuestos (
  id                   bigserial primary key,
  orden_id             uuid not null references public.ordenes(id) on delete cascade,
  repuesto_id          uuid not null references public.repuestos(id) on delete restrict,
  descripcion_snapshot text not null,
  precio_unitario      numeric(12,2) not null check (precio_unitario >= 0),
  cantidad             integer not null check (cantidad > 0),
  movimiento_id        bigint references public.repuestos_movimientos(id),
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id)
);

create index idx_orden_repuestos_orden on public.orden_repuestos(orden_id);

-- ─── RPC transaccional para imputar un repuesto ────────────────────────────
-- Hace 2 cosas en una sola transaccion:
-- 1. Crea el movimiento SALIDA (el trigger aplicar_movimiento_stock descuenta)
-- 2. Inserta la fila en orden_repuestos con link al movimiento
-- Si cualquiera falla (ej. stock insuficiente), la transaccion revierte todo.
create or replace function public.imputar_repuesto_a_orden(
  p_orden_id         uuid,
  p_repuesto_id      uuid,
  p_cantidad         integer,
  p_precio_unitario  numeric
)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_nombre  text;
  v_mov_id  bigint;
  v_or_id   bigint;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  -- Snapshot del nombre del repuesto
  select nombre into v_nombre from public.repuestos where id = p_repuesto_id and activo = true;
  if v_nombre is null then
    raise exception 'Repuesto no encontrado o inactivo';
  end if;

  -- Crear movimiento SALIDA (trigger descuenta stock; si insuficiente, raise)
  insert into public.repuestos_movimientos (repuesto_id, tipo, cantidad, motivo, orden_id, created_by)
  values (p_repuesto_id, 'SALIDA', p_cantidad, 'Imputación a orden', p_orden_id, v_user_id)
  returning id into v_mov_id;

  -- Registrar en orden_repuestos con link al movimiento
  insert into public.orden_repuestos (orden_id, repuesto_id, descripcion_snapshot, precio_unitario, cantidad, movimiento_id, created_by)
  values (p_orden_id, p_repuesto_id, v_nombre, p_precio_unitario, p_cantidad, v_mov_id, v_user_id)
  returning id into v_or_id;

  return v_or_id;
end;
$$;

comment on function public.imputar_repuesto_a_orden is
  'Imputa un repuesto a una orden en transaccion atomica: crea SALIDA de stock + registra en orden_repuestos.';

-- ─── RPC transaccional para revertir un repuesto ──────────────────────────
create or replace function public.desimputar_repuesto_de_orden(
  p_orden_repuesto_id bigint
)
returns void
language plpgsql
security invoker
as $$
declare
  v_repuesto_id uuid;
  v_cantidad    integer;
  v_orden_id    uuid;
  v_user_id     uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select repuesto_id, cantidad, orden_id
    into v_repuesto_id, v_cantidad, v_orden_id
    from public.orden_repuestos
    where id = p_orden_repuesto_id;

  if v_repuesto_id is null then
    raise exception 'Ítem no encontrado';
  end if;

  -- ENTRADA para devolver stock al inventario
  insert into public.repuestos_movimientos (repuesto_id, tipo, cantidad, motivo, orden_id, created_by)
  values (v_repuesto_id, 'ENTRADA', v_cantidad, 'Reversión de imputación', v_orden_id, v_user_id);

  -- Borrar la linea (el movimiento SALIDA original se preserva por auditoria)
  delete from public.orden_repuestos where id = p_orden_repuesto_id;
end;
$$;

comment on function public.desimputar_repuesto_de_orden is
  'Revierte la imputacion de un repuesto: crea ENTRADA compensatoria + borra la linea. El SALIDA original queda por auditoria.';

-- ─── Agregar columna orden_id a repuestos_movimientos si no existe ────────
-- (0005 no la habia agregado pero la referenciamos en el RPC)
alter table public.repuestos_movimientos
  add column if not exists orden_id uuid;

create index if not exists idx_mov_orden on public.repuestos_movimientos(orden_id) where orden_id is not null;

-- ─── RLS ───────────────────────────────────────────────────────────────────
-- Regla: podes leer/escribir un item de orden solo si tenes acceso a la orden.
alter table public.orden_servicios enable row level security;

create policy "orden_servicios_all_via_orden"
  on public.orden_servicios for all
  using (
    exists (
      select 1 from public.ordenes o
      where o.id = orden_id
      and (
        public.current_user_rol() = 'admin'
        or (
          public.current_user_rol() = 'tecnico'
          and (o.tecnico_asignado_id = auth.uid() or o.tecnico_asignado_id is null)
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.ordenes o
      where o.id = orden_id
      and (
        public.current_user_rol() = 'admin'
        or (
          public.current_user_rol() = 'tecnico'
          and o.tecnico_asignado_id = auth.uid()
        )
      )
    )
  );

alter table public.orden_repuestos enable row level security;

create policy "orden_repuestos_all_via_orden"
  on public.orden_repuestos for all
  using (
    exists (
      select 1 from public.ordenes o
      where o.id = orden_id
      and (
        public.current_user_rol() = 'admin'
        or (
          public.current_user_rol() = 'tecnico'
          and (o.tecnico_asignado_id = auth.uid() or o.tecnico_asignado_id is null)
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.ordenes o
      where o.id = orden_id
      and (
        public.current_user_rol() = 'admin'
        or (
          public.current_user_rol() = 'tecnico'
          and o.tecnico_asignado_id = auth.uid()
        )
      )
    )
  );

-- ─── GRANTs + REVOKE from anon ────────────────────────────────────────────
grant select, insert, update, delete on public.orden_servicios to authenticated;
grant select, insert, update, delete on public.orden_repuestos to authenticated;
grant usage on sequence public.orden_servicios_id_seq to authenticated;
grant usage on sequence public.orden_repuestos_id_seq to authenticated;
grant execute on function public.imputar_repuesto_a_orden(uuid, uuid, integer, numeric) to authenticated;
grant execute on function public.desimputar_repuesto_de_orden(bigint) to authenticated;
revoke all on public.orden_servicios from anon;
revoke all on public.orden_repuestos from anon;
