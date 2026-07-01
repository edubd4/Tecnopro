-- ============================================================================
-- TECNOPRO · Fase 2 Ola B.1a · Modulo Ordenes (base)
-- Tabla ordenes con estado, prioridad, tecnico asignado, cliente referenciado.
-- Los items imputados (servicios, repuestos) se agregan en 0007 (Ola B.1b).
-- ============================================================================

-- ─── Enums del dominio ─────────────────────────────────────────────────────
create type estado_orden as enum (
  'RECIBIDA', 'DIAGNOSTICO', 'PRESUPUESTADA', 'EN_REPARACION',
  'LISTA', 'ENTREGADA', 'CANCELADA'
);

create type prioridad_orden as enum ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');

-- ─── Secuencia para el id_publico ──────────────────────────────────────────
create sequence public.ordenes_id_publico_seq start with 1;

-- ─── Tabla: ordenes ────────────────────────────────────────────────────────
create table public.ordenes (
  id                       uuid primary key default gen_random_uuid(),
  id_publico               text not null unique,
  cliente_id               uuid not null references public.clientes(id) on delete restrict,
  equipo_desc              text,                     -- marca/modelo/serie del equipo
  falla_declarada          text,                     -- lo que dice el cliente
  diagnostico              text,                     -- lo que encontro el tecnico
  estado                   estado_orden    not null default 'RECIBIDA',
  prioridad                prioridad_orden not null default 'NORMAL',
  tecnico_asignado_id      uuid references public.profiles(id) on delete set null,
  fecha_recepcion          timestamptz not null default now(),
  fecha_entrega_estimada   date,
  fecha_entrega_real       timestamptz,              -- se llena al pasar a ENTREGADA
  notas_internas           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references auth.users(id),
  updated_by               uuid references auth.users(id)
);

-- ─── Trigger para id_publico OT-XXXX ──────────────────────────────────────
create or replace function public.set_orden_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := 'OT-' || lpad(nextval('public.ordenes_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger ordenes_set_id_publico
  before insert on public.ordenes
  for each row execute function public.set_orden_id_publico();

create trigger ordenes_touch_updated_at
  before update on public.ordenes
  for each row execute function public.touch_updated_at();

-- ─── Trigger para fecha_entrega_real al pasar a ENTREGADA ─────────────────
create or replace function public.set_fecha_entrega_real()
returns trigger language plpgsql as $$
begin
  -- Al pasar a ENTREGADA: registrar el momento (si no lo seteo el user)
  if new.estado = 'ENTREGADA'
     and (old.estado is distinct from 'ENTREGADA')
     and new.fecha_entrega_real is null
  then
    new.fecha_entrega_real := now();
  end if;

  -- Si sale de ENTREGADA (correccion), limpiar la fecha
  if old.estado = 'ENTREGADA' and new.estado <> 'ENTREGADA' then
    new.fecha_entrega_real := null;
  end if;

  return new;
end;
$$;

create trigger ordenes_set_fecha_entrega
  before update on public.ordenes
  for each row execute function public.set_fecha_entrega_real();

-- ─── Indices ───────────────────────────────────────────────────────────────
create index idx_ordenes_estado           on public.ordenes(estado);
create index idx_ordenes_prioridad        on public.ordenes(prioridad);
create index idx_ordenes_cliente          on public.ordenes(cliente_id);
create index idx_ordenes_tecnico          on public.ordenes(tecnico_asignado_id) where tecnico_asignado_id is not null;
create index idx_ordenes_fecha_recepcion  on public.ordenes(fecha_recepcion desc);
create index idx_ordenes_fecha_entrega    on public.ordenes(fecha_entrega_estimada) where fecha_entrega_estimada is not null;
-- Indice compuesto util para "mis ordenes activas" del tecnico
create index idx_ordenes_tecnico_activas
  on public.ordenes(tecnico_asignado_id, estado)
  where estado not in ('ENTREGADA', 'CANCELADA');

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.ordenes enable row level security;

-- SELECT: admin ve todas · tecnico ve solo las asignadas a el o sin asignar
create policy "ordenes_select_admin"
  on public.ordenes for select
  using (public.current_user_rol() = 'admin');

create policy "ordenes_select_tecnico"
  on public.ordenes for select
  using (
    public.current_user_rol() = 'tecnico'
    and (tecnico_asignado_id = auth.uid() or tecnico_asignado_id is null)
  );

-- INSERT: admin puede crear · tecnico puede crear (recepcionista o solo admin?
-- En el MVP dejamos que tecnicos tambien recepcionen ordenes, para no trabar
-- el flujo si el admin no esta. Se puede restringir despues.)
create policy "ordenes_insert_authenticated"
  on public.ordenes for insert
  to authenticated
  with check (public.current_user_rol() is not null);

-- UPDATE: admin puede editar cualquiera · tecnico solo la asignada a el
create policy "ordenes_update_admin"
  on public.ordenes for update
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');

create policy "ordenes_update_tecnico_asignada"
  on public.ordenes for update
  using (
    public.current_user_rol() = 'tecnico'
    and tecnico_asignado_id = auth.uid()
  )
  with check (
    public.current_user_rol() = 'tecnico'
    and tecnico_asignado_id = auth.uid()
  );

-- DELETE: nadie desde la app. Cancelacion via estado = 'CANCELADA'.
-- (No creamos policy DELETE → bloqueado por RLS)

-- ─── GRANTs + REVOKE from anon ────────────────────────────────────────────
grant select, insert, update on public.ordenes to authenticated;
grant usage on sequence public.ordenes_id_publico_seq to authenticated;
revoke all on public.ordenes from anon;
