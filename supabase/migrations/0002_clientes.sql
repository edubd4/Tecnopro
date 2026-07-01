-- ============================================================================
-- TECNOPRO · Fase 2 Ola A · Modulo Clientes
-- Tabla clientes con IDs legibles (CLI-0001), RLS y auditoria.
-- ============================================================================

-- ─── Enums del modulo ──────────────────────────────────────────────────────
create type tipo_cliente as enum ('PARTICULAR', 'EMPRESA');
create type estado_cliente as enum ('ACTIVO', 'INACTIVO');

-- ─── Secuencia para el id_publico ──────────────────────────────────────────
create sequence public.clientes_id_publico_seq start with 1;

-- ─── Tabla: clientes ───────────────────────────────────────────────────────
create table public.clientes (
  id             uuid primary key default gen_random_uuid(),
  id_publico     text not null unique,
  tipo           tipo_cliente not null default 'PARTICULAR',
  nombre         text not null,
  apellido       text,
  razon_social   text,
  documento      text,                     -- DNI, CUIT, CUIL
  telefono       text,
  whatsapp       text,
  email          text,
  direccion      text,
  provincia      text,
  ciudad         text,
  notas          text,
  estado         estado_cliente not null default 'ACTIVO',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id),
  updated_by     uuid references auth.users(id)
);

-- Trigger para setear id_publico automaticamente en cada insert.
create or replace function public.set_cliente_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := 'CLI-' || lpad(nextval('public.clientes_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger clientes_set_id_publico
  before insert on public.clientes
  for each row execute function public.set_cliente_id_publico();

create trigger clientes_touch_updated_at
  before update on public.clientes
  for each row execute function public.touch_updated_at();

-- ─── Indices para busqueda y filtrado ──────────────────────────────────────
create index idx_clientes_estado    on public.clientes(estado);
create index idx_clientes_tipo      on public.clientes(tipo);
create index idx_clientes_nombre    on public.clientes(lower(nombre));
create index idx_clientes_apellido  on public.clientes(lower(apellido)) where apellido is not null;
create index idx_clientes_razon     on public.clientes(lower(razon_social)) where razon_social is not null;
create index idx_clientes_telefono  on public.clientes(telefono) where telefono is not null;
create index idx_clientes_documento on public.clientes(documento) where documento is not null;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.clientes enable row level security;

-- Admin y tecnico pueden leer todos los clientes.
create policy "clientes_select_authenticated"
  on public.clientes for select
  to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.activo = true
    )
  );

-- Solo admin puede insertar/actualizar/eliminar clientes.
-- (Los tecnicos podrian dar de alta un cliente en una fase futura; por ahora admin only.)
create policy "clientes_write_admin"
  on public.clientes for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'admin' and p.activo = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'admin' and p.activo = true
    )
  );

-- ─── Grants para la sequence al role authenticated ─────────────────────────
-- La sequence se llama desde el trigger (security definer del owner por default).
-- El grant es defensivo por si en el futuro se llama directo.
grant usage on sequence public.clientes_id_publico_seq to authenticated;
