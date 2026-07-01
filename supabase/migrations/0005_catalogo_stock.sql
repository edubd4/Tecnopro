-- ============================================================================
-- TECNOPRO · Fase 2 Ola A · Modulos 06 (Catalogo) + 07 (Stock)
-- Servicios del catalogo + repuestos con movimientos y stock autocalculado.
-- ============================================================================
-- Patrones aplicados desde el arranque:
-- - GRANTs explicitos a authenticated (no confiar en auto-exposicion)
-- - Policies via public.current_user_rol() para no volver a caer en recursion
-- - id_publico con secuencia dedicada + trigger
-- - Auditoria via historial (desde el server action, no desde SQL)

-- ─── Enums del dominio ─────────────────────────────────────────────────────
create type categoria_servicio as enum (
  'REPARACION', 'REDES', 'ACONDICIONAMIENTO', 'INSTALACION', 'DIAGNOSTICO', 'OTRO'
);

create type tipo_mov_repuesto as enum ('ENTRADA', 'SALIDA', 'AJUSTE');

-- ============================================================================
-- SERVICIOS (catalogo)
-- ============================================================================
create sequence public.servicios_id_publico_seq start with 1;

create table public.servicios (
  id                  uuid primary key default gen_random_uuid(),
  id_publico          text not null unique,
  nombre              text not null,
  descripcion         text,
  categoria           categoria_servicio not null default 'OTRO',
  precio_base         numeric(12,2) not null default 0 check (precio_base >= 0),
  tiempo_estimado_min integer check (tiempo_estimado_min is null or tiempo_estimado_min > 0),
  activo              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id),
  updated_by          uuid references auth.users(id)
);

create or replace function public.set_servicio_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := 'SRV-' || lpad(nextval('public.servicios_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger servicios_set_id_publico
  before insert on public.servicios
  for each row execute function public.set_servicio_id_publico();

create trigger servicios_touch_updated_at
  before update on public.servicios
  for each row execute function public.touch_updated_at();

create index idx_servicios_activo    on public.servicios(activo);
create index idx_servicios_categoria on public.servicios(categoria);
create index idx_servicios_nombre    on public.servicios(lower(nombre));

alter table public.servicios enable row level security;

create policy "servicios_select_authenticated"
  on public.servicios for select
  to authenticated
  using (public.current_user_rol() is not null);

create policy "servicios_write_admin"
  on public.servicios for all
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');

grant select, insert, update, delete on public.servicios to authenticated;
grant usage on sequence public.servicios_id_publico_seq to authenticated;
revoke all on public.servicios from anon;

-- ============================================================================
-- REPUESTOS (stock)
-- ============================================================================
create sequence public.repuestos_id_publico_seq start with 1;

create table public.repuestos (
  id            uuid primary key default gen_random_uuid(),
  id_publico    text not null unique,
  nombre        text not null,
  codigo        text,                 -- codigo interno o de proveedor
  descripcion   text,
  categoria     text,                 -- categoria libre (ej: RAM, discos, cables)
  costo         numeric(12,2) not null default 0 check (costo >= 0),
  precio_venta  numeric(12,2) not null default 0 check (precio_venta >= 0),
  stock_actual  integer not null default 0 check (stock_actual >= 0),
  stock_minimo  integer not null default 0 check (stock_minimo >= 0),
  ubicacion     text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id)
);

create or replace function public.set_repuesto_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := 'REP-' || lpad(nextval('public.repuestos_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger repuestos_set_id_publico
  before insert on public.repuestos
  for each row execute function public.set_repuesto_id_publico();

create trigger repuestos_touch_updated_at
  before update on public.repuestos
  for each row execute function public.touch_updated_at();

create index idx_repuestos_activo   on public.repuestos(activo);
create index idx_repuestos_nombre   on public.repuestos(lower(nombre));
create index idx_repuestos_codigo   on public.repuestos(codigo) where codigo is not null;
create index idx_repuestos_bajo     on public.repuestos(stock_actual) where activo and stock_minimo > 0;

alter table public.repuestos enable row level security;

create policy "repuestos_select_authenticated"
  on public.repuestos for select
  to authenticated
  using (public.current_user_rol() is not null);

create policy "repuestos_write_admin"
  on public.repuestos for all
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');

grant select, insert, update, delete on public.repuestos to authenticated;
grant usage on sequence public.repuestos_id_publico_seq to authenticated;
revoke all on public.repuestos from anon;

-- ============================================================================
-- MOVIMIENTOS DE REPUESTOS (append-only, mueven stock_actual via trigger)
-- ============================================================================
-- - ENTRADA:  suma cantidad al stock
-- - SALIDA:   resta cantidad del stock (falla si el resultado < 0)
-- - AJUSTE:   setea stock_actual = cantidad (ajuste absoluto por conteo fisico)
-- El trigger llena stock_anterior y stock_nuevo con snapshots. La tabla no
-- se actualiza ni se borra: correcciones = nuevo movimiento.
create table public.repuestos_movimientos (
  id              bigserial primary key,
  repuesto_id     uuid not null references public.repuestos(id) on delete restrict,
  tipo            tipo_mov_repuesto not null,
  cantidad        integer not null check (cantidad >= 0),
  stock_anterior  integer,
  stock_nuevo     integer,
  motivo          text,
  orden_id        uuid,       -- FK futura a ordenes cuando exista la tabla
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);

create index idx_mov_repuesto on public.repuestos_movimientos(repuesto_id, created_at desc);
create index idx_mov_tipo     on public.repuestos_movimientos(tipo);
create index idx_mov_orden    on public.repuestos_movimientos(orden_id) where orden_id is not null;

-- Trigger que aplica el movimiento al stock del repuesto.
-- Uso FOR UPDATE para bloquear la fila y evitar race conditions con movs paralelos.
create or replace function public.aplicar_movimiento_stock()
returns trigger language plpgsql as $$
declare
  stock_before integer;
  stock_after  integer;
begin
  select stock_actual into stock_before
    from public.repuestos
    where id = new.repuesto_id
    for update;

  if stock_before is null then
    raise exception 'Repuesto % no encontrado o inactivo', new.repuesto_id;
  end if;

  stock_after := case new.tipo
    when 'ENTRADA' then stock_before + new.cantidad
    when 'SALIDA'  then stock_before - new.cantidad
    when 'AJUSTE'  then new.cantidad
  end;

  if stock_after < 0 then
    raise exception 'Movimiento invalido: stock quedaria negativo (% - % = %)',
      stock_before, new.cantidad, stock_after;
  end if;

  new.stock_anterior := stock_before;
  new.stock_nuevo    := stock_after;

  update public.repuestos
    set stock_actual = stock_after,
        updated_at   = now(),
        updated_by   = new.created_by
    where id = new.repuesto_id;

  return new;
end;
$$;

create trigger repuestos_movimientos_apply
  before insert on public.repuestos_movimientos
  for each row execute function public.aplicar_movimiento_stock();

-- Inmutabilidad del historial de movimientos: no update, no delete.
create or replace function public.movimientos_block_mutations()
returns trigger language plpgsql as $$
begin
  raise exception 'repuestos_movimientos es inmutable: % no permitido. Registrar un nuevo movimiento.', TG_OP;
end;
$$;

create trigger repuestos_movimientos_no_update
  before update on public.repuestos_movimientos
  for each row execute function public.movimientos_block_mutations();

create trigger repuestos_movimientos_no_delete
  before delete on public.repuestos_movimientos
  for each row execute function public.movimientos_block_mutations();

alter table public.repuestos_movimientos enable row level security;

-- Todos los autenticados pueden leer movimientos (para historial en la ficha)
create policy "mov_select_authenticated"
  on public.repuestos_movimientos for select
  to authenticated
  using (public.current_user_rol() is not null);

-- Solo admin crea movimientos manuales. En Ola B, las ordenes tambien
-- van a crear movimientos SALIDA automaticamente (via server action con
-- service_role, o con permisos ampliados a tecnico segun regla).
create policy "mov_insert_admin"
  on public.repuestos_movimientos for insert
  to authenticated
  with check (public.current_user_rol() = 'admin');

grant select, insert on public.repuestos_movimientos to authenticated;
grant usage on sequence public.repuestos_movimientos_id_seq to authenticated;
revoke all on public.repuestos_movimientos from anon;
