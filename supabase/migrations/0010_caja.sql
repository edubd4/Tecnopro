-- ============================================================================
-- TECNOPRO · Fase 2 Ola C.1 · Modulo Caja
-- Movimientos de caja append-only con saldo autocalculable.
-- ============================================================================
-- Patrones aplicados (calcados de repuestos_movimientos y historial):
-- - Append-only: update/delete bloqueados por trigger. Correcciones = movimiento
--   opuesto (AJUSTE, CIERRE, etc.). Igual que repuestos_movimientos.
-- - id_publico MOV-XXXX con secuencia + trigger dedicados.
-- - RLS admin-only (Caja vive en el grupo "Plata" del nav, admin-only).
-- - FK opcional a orden para el flujo COBRO_ORDEN (on delete set null: el
--   movimiento sobrevive si se borra la orden, para no perder plata en la
--   contabilidad).
-- - RPC transaccional cobrar_orden(): asegura consistencia entre orden y caja.

-- ─── Enums del dominio ─────────────────────────────────────────────────────
create type tipo_mov_caja as enum ('INGRESO', 'EGRESO');

create type origen_mov_caja as enum (
  'COBRO_ORDEN', 'GASTO', 'AJUSTE', 'APERTURA', 'CIERRE', 'OTRO'
);

create type metodo_pago as enum (
  'EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO',
  'MERCADO_PAGO', 'OTRO'
);

-- ─── Secuencia para el id_publico ──────────────────────────────────────────
create sequence public.movimientos_caja_id_publico_seq start with 1;

-- ─── Tabla: movimientos_caja ───────────────────────────────────────────────
create table public.movimientos_caja (
  id            uuid primary key default gen_random_uuid(),
  id_publico    text not null unique,
  tipo          tipo_mov_caja   not null,
  origen        origen_mov_caja not null,
  monto         numeric(12,2)   not null check (monto > 0),
  metodo_pago   metodo_pago     not null default 'EFECTIVO',
  descripcion   text            not null,
  -- FK opcional a orden (para COBRO_ORDEN). Set null si la orden desaparece:
  -- la plata ya se movio, el movimiento se queda por auditoria contable.
  orden_id      uuid references public.ordenes(id) on delete set null,
  fecha         timestamptz     not null default now(),
  created_at    timestamptz     not null default now(),
  created_by    uuid references auth.users(id)
);

-- ─── Trigger id_publico MOV-XXXX ──────────────────────────────────────────
create or replace function public.set_movimiento_caja_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := 'MOV-' || lpad(nextval('public.movimientos_caja_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger movimientos_caja_set_id_publico
  before insert on public.movimientos_caja
  for each row execute function public.set_movimiento_caja_id_publico();

-- ─── Trigger: inmutabilidad (patron historial + repuestos_movimientos) ────
-- No update, no delete. Correcciones = nuevo movimiento con origen = AJUSTE.
create or replace function public.movimientos_caja_block_mutations()
returns trigger language plpgsql as $$
begin
  raise exception 'movimientos_caja es inmutable: % no permitido. Registrar un nuevo movimiento (AJUSTE) para corregir.', TG_OP;
end;
$$;

create trigger movimientos_caja_no_update
  before update on public.movimientos_caja
  for each row execute function public.movimientos_caja_block_mutations();

create trigger movimientos_caja_no_delete
  before delete on public.movimientos_caja
  for each row execute function public.movimientos_caja_block_mutations();

-- ─── Indices ───────────────────────────────────────────────────────────────
create index idx_mov_caja_fecha   on public.movimientos_caja(fecha desc);
create index idx_mov_caja_tipo    on public.movimientos_caja(tipo);
create index idx_mov_caja_origen  on public.movimientos_caja(origen);
create index idx_mov_caja_metodo  on public.movimientos_caja(metodo_pago);
create index idx_mov_caja_orden   on public.movimientos_caja(orden_id) where orden_id is not null;
create index idx_mov_caja_created on public.movimientos_caja(created_at desc);

-- ─── Vista: saldo_caja ─────────────────────────────────────────────────────
-- Suma sencilla de ingresos - egresos. Consumida desde la lista y desde /panel.
create or replace view public.saldo_caja as
select
  coalesce(sum(case when tipo = 'INGRESO' then monto else -monto end), 0)::numeric(14,2) as saldo,
  coalesce(sum(case when tipo = 'INGRESO' then monto else 0 end), 0)::numeric(14,2)      as total_ingresos,
  coalesce(sum(case when tipo = 'EGRESO'  then monto else 0 end), 0)::numeric(14,2)      as total_egresos,
  count(*)::int as movimientos_total
from public.movimientos_caja;

-- ─── RLS ───────────────────────────────────────────────────────────────────
-- Caja es admin-only: solo Guillermo maneja plata. Los tecnicos no ven la caja.
alter table public.movimientos_caja enable row level security;

create policy "mov_caja_select_admin"
  on public.movimientos_caja for select
  using (public.current_user_rol() = 'admin');

create policy "mov_caja_insert_admin"
  on public.movimientos_caja for insert
  to authenticated
  with check (public.current_user_rol() = 'admin');

-- Sin policy de UPDATE/DELETE: RLS los bloquea + trigger de inmutabilidad.

-- ─── RPC transaccional: cobrar_orden ──────────────────────────────────────
-- Registra un INGRESO con origen = COBRO_ORDEN vinculado a la orden.
-- Se usa desde la ficha de orden cuando esta en LISTA o ENTREGADA.
-- No modifica el estado de la orden (eso lo hace el flujo normal de estados).
create or replace function public.cobrar_orden(
  p_orden_id     uuid,
  p_monto        numeric,
  p_metodo_pago  metodo_pago,
  p_descripcion  text
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id_publico  text;
  v_mov_id      uuid;
  v_user_id     uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto invalido';
  end if;

  -- Verificar que la orden existe (defensa; RLS ya filtra por rol al leer)
  select id_publico into v_id_publico
    from public.ordenes
    where id = p_orden_id;

  if v_id_publico is null then
    raise exception 'Orden no encontrada';
  end if;

  insert into public.movimientos_caja
    (tipo, origen, monto, metodo_pago, descripcion, orden_id, created_by)
  values
    ('INGRESO', 'COBRO_ORDEN', p_monto, p_metodo_pago,
     coalesce(nullif(p_descripcion, ''), 'Cobro de orden ' || v_id_publico),
     p_orden_id, v_user_id)
  returning id into v_mov_id;

  return v_mov_id;
end;
$$;

comment on function public.cobrar_orden is
  'Registra un INGRESO en caja vinculado a la orden. Origen = COBRO_ORDEN.';

-- ─── GRANTs + REVOKE from anon ────────────────────────────────────────────
grant select, insert on public.movimientos_caja to authenticated;
grant usage on sequence public.movimientos_caja_id_publico_seq to authenticated;
grant select on public.saldo_caja to authenticated;
grant execute on function public.cobrar_orden(uuid, numeric, metodo_pago, text) to authenticated;
revoke all on public.movimientos_caja from anon;
revoke all on public.saldo_caja       from anon;
