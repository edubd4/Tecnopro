-- ============================================================================
-- TECNOPRO · Migración inicial
-- Schema base: perfiles, roles, configuración, historial inmutable.
-- Tablas de dominio (clientes, órdenes, etc.) se agregan en migraciones por ola.
-- ============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums del dominio ──────────────────────────────────────────────────────
create type rol_usuario as enum ('admin', 'tecnico');

create type tipo_evento as enum (
  'CAMBIO_ESTADO_ORDEN',
  'NUEVO_PRESUPUESTO',
  'CAMBIO_ESTADO_PRESUPUESTO',
  'COBRO',
  'GASTO',
  'TURNO_ASIGNADO',
  'STOCK_MOVIMIENTO',
  'NUEVO_CLIENTE',
  'NOTA',
  'ALERTA',
  'MENSAJE_IA'
);

-- ─── Tabla: profiles ────────────────────────────────────────────────────────
-- Espejo de auth.users con campos de negocio. PK = auth.users.id.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nombre      text not null,
  rol         rol_usuario not null default 'tecnico',
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_profiles_rol on public.profiles(rol) where activo = true;

alter table public.profiles enable row level security;

-- Cada usuario lee su propio perfil. Admin lee todos.
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'admin' and p.activo = true
    )
  );

-- Solo admin actualiza perfiles (cambia roles, activa/desactiva).
create policy "profiles_update_admin"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'admin' and p.activo = true
    )
  );

-- ─── Tabla: configuracion ──────────────────────────────────────────────────
-- Key-value store para parámetros del negocio.
create table public.configuracion (
  id           bigserial primary key,
  clave        text not null unique,
  valor        text,
  descripcion  text,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id)
);

alter table public.configuracion enable row level security;

create policy "configuracion_select_authenticated"
  on public.configuracion for select
  to authenticated using (true);

create policy "configuracion_write_admin"
  on public.configuracion for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'admin' and p.activo = true
    )
  );

-- Seeds iniciales — el admin los puede editar después desde el panel.
insert into public.configuracion (clave, valor, descripcion) values
  ('negocio_nombre',          'TECNOPRO',          'Nombre comercial mostrado en la app y mensajes'),
  ('negocio_telefono',        '',                  'Teléfono de contacto'),
  ('negocio_direccion',       '',                  'Dirección física del local'),
  ('moneda_default',          'ARS',               'Moneda por defecto para operaciones'),
  ('margen_default_pct',      '30',                'Margen comercial por defecto sobre repuestos (%)'),
  ('presupuesto_validez_dias','7',                 'Días de validez de un presupuesto antes de marcarse VENCIDO'),
  ('stock_alerta_dias',       '7',                 'Antelación para alertas de stock bajo / pagos por vencer (días)');

-- ─── Tabla: historial (audit log inmutable) ────────────────────────────────
-- Solo INSERT. Update/delete bloqueados por RLS y por trigger.
create table public.historial (
  id           bigserial primary key,
  tipo         tipo_evento not null,
  descripcion  text not null,
  entidad_tipo text,                 -- 'orden' | 'presupuesto' | 'cliente' | ...
  entidad_id   text,                 -- ID legible (OT-0001, CLI-0001) o uuid
  payload      jsonb,                -- snapshot del cambio
  user_id      uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index idx_historial_entidad   on public.historial(entidad_tipo, entidad_id);
create index idx_historial_tipo      on public.historial(tipo);
create index idx_historial_created   on public.historial(created_at desc);
create index idx_historial_user      on public.historial(user_id);

alter table public.historial enable row level security;

-- Lectura: solo admin
create policy "historial_select_admin"
  on public.historial for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.rol = 'admin' and p.activo = true
    )
  );

-- Insert: cualquier usuario autenticado (la app loguea sus propias acciones)
create policy "historial_insert_authenticated"
  on public.historial for insert
  to authenticated with check (true);

-- ❌ NO se definen policies de UPDATE ni DELETE → bloqueado de fábrica con RLS.
-- Trigger de seguridad por las dudas (defensa en profundidad):
create or replace function public.historial_block_mutations()
returns trigger language plpgsql as $$
begin
  raise exception 'historial es inmutable: % no permitido', TG_OP;
end;
$$;

create trigger historial_no_update
  before update on public.historial
  for each row execute function public.historial_block_mutations();

create trigger historial_no_delete
  before delete on public.historial
  for each row execute function public.historial_block_mutations();

-- ─── Trigger: auto-crear profile al registrar un usuario ───────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'tecnico')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── updated_at automático ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger configuracion_touch_updated_at
  before update on public.configuracion
  for each row execute function public.touch_updated_at();
