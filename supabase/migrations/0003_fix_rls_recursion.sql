-- ============================================================================
-- TECNOPRO · Fix · Recursion infinita en policies RLS
-- ============================================================================
-- Sintoma: "infinite recursion detected in policy for relation profiles"
--
-- Causa: las policies de admin en varias tablas hacian
--        exists (select 1 from public.profiles where ...)
-- y como public.profiles tambien tiene RLS habilitada, la consulta interna
-- vuelve a disparar la policy de profiles → recursion infinita.
--
-- Fix: crear una funcion helper con SECURITY DEFINER que lee el rol del
-- usuario actual saltando RLS. Todas las policies pasan a usar esta funcion.
-- ============================================================================

-- ─── Helper: rol del usuario actual (bypasa RLS por SECURITY DEFINER) ─────
create or replace function public.current_user_rol()
returns rol_usuario
language sql
security definer
stable
set search_path = public
as $$
  select rol
  from public.profiles
  where id = auth.uid() and activo = true
  limit 1;
$$;

comment on function public.current_user_rol() is
  'Devuelve el rol_usuario del usuario autenticado. SECURITY DEFINER para evitar recursion en policies. Usar en RLS en vez de subquery a profiles.';

revoke all on function public.current_user_rol() from public;
grant execute on function public.current_user_rol() to authenticated;

-- ─── profiles ────────────────────────────────────────────────────────────
-- Policies viejas: recursivas. Dropear y recrear.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

-- SELECT: cada uno lee su propio profile. Admin lee todos.
create policy "profiles_select_self"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select
  using (public.current_user_rol() = 'admin');

-- UPDATE: solo admin puede editar profiles (cambiar roles, activar/desactivar).
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.current_user_rol() = 'admin');

-- ─── configuracion ───────────────────────────────────────────────────────
drop policy if exists "configuracion_write_admin" on public.configuracion;

create policy "configuracion_write_admin"
  on public.configuracion for all
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');

-- ─── historial ──────────────────────────────────────────────────────────
drop policy if exists "historial_select_admin" on public.historial;

create policy "historial_select_admin"
  on public.historial for select
  using (public.current_user_rol() = 'admin');

-- ─── clientes ───────────────────────────────────────────────────────────
drop policy if exists "clientes_select_authenticated" on public.clientes;
drop policy if exists "clientes_write_admin" on public.clientes;

-- SELECT: cualquier usuario autenticado con profile activo puede leer.
create policy "clientes_select_authenticated"
  on public.clientes for select
  to authenticated
  using (public.current_user_rol() is not null);

create policy "clientes_write_admin"
  on public.clientes for all
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');
