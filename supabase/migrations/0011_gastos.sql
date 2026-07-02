-- ============================================================================
-- TECNOPRO · Fase 2 Ola C.2 · Modulo Gastos
-- Registro de egresos categorizados. Cada gasto genera un movimiento_caja
-- EGRESO/GASTO en la misma transaccion via RPC.
-- ============================================================================
-- Patrones aplicados:
-- - RPC transaccional (patron imputar_repuesto_a_orden): gastos + movimientos_caja
--   en una sola transaccion. Si algo falla, rollback total.
-- - Append-only: sin UPDATE ni DELETE. Correcciones = movimiento AJUSTE en caja
--   + nuevo gasto si corresponde. Consistente con movimientos_caja y historial.
-- - categorias_gasto configurable (tabla, no enum): Guillo agrega/desactiva
--   sin migraciones. UI de gestion queda como backlog (por ahora via SQL).
-- - RLS admin-only. Solo Guillo maneja plata.
-- - Comprobante (adjunto de foto/PDF): reservado para Fase 3.

-- ─── Tabla: categorias_gasto (configurable) ────────────────────────────────
create table public.categorias_gasto (
  id          bigserial primary key,
  nombre      text not null unique,
  activo      boolean not null default true,
  orden       integer not null default 0,     -- para ordenar el dropdown
  created_at  timestamptz not null default now()
);

-- Seeds iniciales. Guillo puede desactivar o agregar mas via UI (backlog) o SQL.
insert into public.categorias_gasto (nombre, orden) values
  ('Proveedores',    10),
  ('Servicios',      20),   -- luz, internet, agua
  ('Impuestos',      30),
  ('Sueldos',        40),
  ('Alquiler',       50),
  ('Insumos',        60),
  ('Mantenimiento',  70),
  ('Otros',          99);

create index idx_categorias_gasto_activo on public.categorias_gasto(activo, orden);

alter table public.categorias_gasto enable row level security;

-- Todos los authenticated leen (para poblar el dropdown del form).
create policy "categorias_gasto_select_authenticated"
  on public.categorias_gasto for select
  to authenticated
  using (public.current_user_rol() is not null);

-- Solo admin escribe (crear/desactivar/reordenar).
create policy "categorias_gasto_write_admin"
  on public.categorias_gasto for all
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');

grant select, insert, update on public.categorias_gasto to authenticated;
grant usage on sequence public.categorias_gasto_id_seq to authenticated;
revoke all on public.categorias_gasto from anon;

-- ─── Secuencia para el id_publico ──────────────────────────────────────────
create sequence public.gastos_id_publico_seq start with 1;

-- ─── Tabla: gastos ─────────────────────────────────────────────────────────
create table public.gastos (
  id            uuid primary key default gen_random_uuid(),
  id_publico    text not null unique,
  categoria_id  bigint not null references public.categorias_gasto(id) on delete restrict,
  monto         numeric(12,2) not null check (monto > 0),
  descripcion   text not null,
  fecha         date not null default current_date,
  notas         text,
  -- Link 1-a-1 al movimiento de caja generado por el RPC. Nunca null porque
  -- el gasto solo se crea via registrar_gasto que inserta ambos en atomico.
  movimiento_id uuid not null references public.movimientos_caja(id) on delete restrict,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);

-- ─── Trigger id_publico GST-XXXX ──────────────────────────────────────────
create or replace function public.set_gasto_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := 'GST-' || lpad(nextval('public.gastos_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger gastos_set_id_publico
  before insert on public.gastos
  for each row execute function public.set_gasto_id_publico();

-- ─── Trigger: inmutabilidad ────────────────────────────────────────────────
-- Sin UPDATE ni DELETE. Correcciones = nuevo movimiento AJUSTE en caja.
create or replace function public.gastos_block_mutations()
returns trigger language plpgsql as $$
begin
  raise exception 'gastos es inmutable: % no permitido. Registrar un movimiento AJUSTE en caja para corregir.', TG_OP;
end;
$$;

create trigger gastos_no_update
  before update on public.gastos
  for each row execute function public.gastos_block_mutations();

create trigger gastos_no_delete
  before delete on public.gastos
  for each row execute function public.gastos_block_mutations();

-- ─── Indices ───────────────────────────────────────────────────────────────
create index idx_gastos_fecha       on public.gastos(fecha desc);
create index idx_gastos_categoria   on public.gastos(categoria_id);
create index idx_gastos_movimiento  on public.gastos(movimiento_id);
create index idx_gastos_created     on public.gastos(created_at desc);
-- Indice compuesto para el resumen "gastos de este mes por categoria"
create index idx_gastos_fecha_cat   on public.gastos(fecha, categoria_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.gastos enable row level security;

create policy "gastos_select_admin"
  on public.gastos for select
  using (public.current_user_rol() = 'admin');

create policy "gastos_insert_admin"
  on public.gastos for insert
  to authenticated
  with check (public.current_user_rol() = 'admin');

-- Sin policy de UPDATE/DELETE: RLS los bloquea + trigger de inmutabilidad.

-- ─── RPC transaccional: registrar_gasto ───────────────────────────────────
-- Crea en una sola transaccion:
-- 1. movimientos_caja tipo=EGRESO origen=GASTO (via insert directo)
-- 2. gastos con link al movimiento
-- Si cualquier paso falla, rollback total. Cero codigo TS necesario.
create or replace function public.registrar_gasto(
  p_categoria_id  bigint,
  p_monto         numeric,
  p_descripcion   text,
  p_fecha         date,
  p_metodo_pago   metodo_pago,
  p_notas         text
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_categoria_nombre text;
  v_mov_id           uuid;
  v_gasto_id         uuid;
  v_fecha            date := coalesce(p_fecha, current_date);
  v_desc             text := coalesce(nullif(trim(p_descripcion), ''), null);
  v_user_id          uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto invalido';
  end if;

  if v_desc is null then
    raise exception 'Descripcion obligatoria';
  end if;

  -- Verificar que la categoria existe y esta activa
  select nombre into v_categoria_nombre
    from public.categorias_gasto
    where id = p_categoria_id and activo = true;

  if v_categoria_nombre is null then
    raise exception 'Categoria no encontrada o inactiva';
  end if;

  -- Paso 1: crear movimiento_caja EGRESO/GASTO
  insert into public.movimientos_caja
    (tipo, origen, monto, metodo_pago, descripcion, created_by)
  values
    ('EGRESO', 'GASTO', p_monto, p_metodo_pago,
     v_categoria_nombre || ' · ' || v_desc,
     v_user_id)
  returning id into v_mov_id;

  -- Paso 2: crear gasto con link al movimiento
  insert into public.gastos
    (categoria_id, monto, descripcion, fecha, notas, movimiento_id, created_by)
  values
    (p_categoria_id, p_monto, v_desc, v_fecha, nullif(trim(p_notas), ''), v_mov_id, v_user_id)
  returning id into v_gasto_id;

  return v_gasto_id;
end;
$$;

comment on function public.registrar_gasto is
  'Registra un gasto: crea EGRESO en caja + fila en gastos en transaccion atomica.';

-- ─── GRANTs + REVOKE from anon ────────────────────────────────────────────
grant select, insert on public.gastos to authenticated;
grant usage on sequence public.gastos_id_publico_seq to authenticated;
grant execute on function public.registrar_gasto(bigint, numeric, text, date, metodo_pago, text) to authenticated;
revoke all on public.gastos from anon;
