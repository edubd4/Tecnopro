-- ============================================================================
-- TECNOPRO · Fase 2 Ola B.2 · Modulo Turnos
-- Agenda de turnos con deteccion de superposiciones por tecnico.
-- ============================================================================

-- ─── Enum del dominio ──────────────────────────────────────────────────────
create type estado_turno as enum (
  'PROGRAMADO', 'EN_CURSO', 'COMPLETADO', 'NO_ASISTIO', 'CANCELADO'
);

-- ─── Secuencia para el id_publico ──────────────────────────────────────────
create sequence public.turnos_id_publico_seq start with 1;

-- ─── Tabla: turnos ─────────────────────────────────────────────────────────
create table public.turnos (
  id             uuid primary key default gen_random_uuid(),
  id_publico     text not null unique,
  titulo         text not null,
  descripcion    text,
  cliente_id     uuid references public.clientes(id) on delete set null,
  orden_id       uuid references public.ordenes(id)  on delete set null,
  tecnico_id     uuid references public.profiles(id) on delete set null,
  fecha_inicio   timestamptz not null,
  fecha_fin      timestamptz not null,
  estado         estado_turno not null default 'PROGRAMADO',
  color          text,                     -- HEX opcional para diferenciar tipos
  notas_internas text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id),
  updated_by     uuid references auth.users(id),
  check (fecha_inicio < fecha_fin)
);

-- ─── Trigger id_publico ────────────────────────────────────────────────────
create or replace function public.set_turno_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := 'TRN-' || lpad(nextval('public.turnos_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger turnos_set_id_publico
  before insert on public.turnos
  for each row execute function public.set_turno_id_publico();

create trigger turnos_touch_updated_at
  before update on public.turnos
  for each row execute function public.touch_updated_at();

-- ─── Indices ───────────────────────────────────────────────────────────────
create index idx_turnos_fecha_inicio on public.turnos(fecha_inicio);
create index idx_turnos_tecnico      on public.turnos(tecnico_id) where tecnico_id is not null;
create index idx_turnos_cliente      on public.turnos(cliente_id) where cliente_id is not null;
create index idx_turnos_orden        on public.turnos(orden_id)   where orden_id   is not null;
create index idx_turnos_estado       on public.turnos(estado);
create index idx_turnos_activos
  on public.turnos(tecnico_id, fecha_inicio)
  where estado not in ('CANCELADO', 'NO_ASISTIO');

-- ─── Detectar superposiciones para un tecnico ─────────────────────────────
-- Usa tstzrange + operador && para intersect. SECURITY DEFINER para
-- ejecutarse desde server actions sin depender del RLS del caller (el
-- server action ya validó permisos con requireAuth).
create or replace function public.turnos_overlap_for_tecnico(
  p_tecnico_id     uuid,
  p_fecha_inicio   timestamptz,
  p_fecha_fin      timestamptz,
  p_exclude_id     uuid default null
)
returns table (
  id            uuid,
  id_publico    text,
  titulo        text,
  fecha_inicio  timestamptz,
  fecha_fin     timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select id, id_publico, titulo, fecha_inicio, fecha_fin
  from public.turnos
  where tecnico_id = p_tecnico_id
    and estado not in ('CANCELADO', 'NO_ASISTIO')
    and (p_exclude_id is null or id <> p_exclude_id)
    and tstzrange(fecha_inicio, fecha_fin) && tstzrange(p_fecha_inicio, p_fecha_fin);
$$;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.turnos enable row level security;

-- SELECT: admin todos; tecnico ve los suyos o los sin asignar
create policy "turnos_select_admin"
  on public.turnos for select
  using (public.current_user_rol() = 'admin');

create policy "turnos_select_tecnico"
  on public.turnos for select
  using (
    public.current_user_rol() = 'tecnico'
    and (tecnico_id = auth.uid() or tecnico_id is null)
  );

-- INSERT: authenticated (admin puede crear cualquiera; tecnico crea los propios)
create policy "turnos_insert_authenticated"
  on public.turnos for insert
  to authenticated
  with check (public.current_user_rol() is not null);

-- UPDATE: admin cualquiera; tecnico solo el asignado a el
create policy "turnos_update_admin"
  on public.turnos for update
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');

create policy "turnos_update_tecnico"
  on public.turnos for update
  using (
    public.current_user_rol() = 'tecnico'
    and tecnico_id = auth.uid()
  )
  with check (
    public.current_user_rol() = 'tecnico'
    and tecnico_id = auth.uid()
  );

-- DELETE: nadie. Cancelacion via estado = 'CANCELADO'.

-- ─── GRANTs + REVOKE from anon ────────────────────────────────────────────
grant select, insert, update on public.turnos to authenticated;
grant usage on sequence public.turnos_id_publico_seq to authenticated;
grant execute on function public.turnos_overlap_for_tecnico(uuid, timestamptz, timestamptz, uuid) to authenticated;
revoke all on public.turnos from anon;
