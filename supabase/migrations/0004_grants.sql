-- ============================================================================
-- TECNOPRO · Fix · GRANTs explicitos para el rol authenticated
-- ============================================================================
-- Sintoma en produccion: "permission denied for table clientes".
--
-- Causa: el proyecto Supabase se creo con "Automatically expose new tables"
-- APAGADO (correcto por seguridad). Eso significa que las tablas nuevas NO
-- reciben grants automaticos al rol authenticated → sin el grant basico,
-- Postgres rechaza la query ANTES de evaluar RLS.
--
-- Regla para modulos futuros: TODA tabla nueva en public. debe incluir su
-- bloque de GRANTs al rol authenticated en la misma migracion.
-- Los grants son el piso amplio; las policies RLS afinan que filas puede
-- tocar cada usuario.
-- ============================================================================

-- ─── profiles ────────────────────────────────────────────────────────────
-- SELECT: lee su propio profile / admin lee todos (via policies)
-- UPDATE: admin edita roles/activo (via policy)
-- INSERT: NO hace falta, el trigger handle_new_user() (SECURITY DEFINER)
--         crea los profiles como postgres
grant select, update on public.profiles to authenticated;

-- ─── configuracion ──────────────────────────────────────────────────────
-- SELECT: cualquier autenticado ve la config (marcas, moneda default, etc.)
-- INSERT/UPDATE/DELETE: solo admin (via policy)
grant select, insert, update, delete on public.configuracion to authenticated;
grant usage on sequence public.configuracion_id_seq to authenticated;

-- ─── historial ──────────────────────────────────────────────────────────
-- SELECT: solo admin (via policy)
-- INSERT: cualquier autenticado loguea sus propias acciones
-- UPDATE/DELETE: bloqueados por RLS + trigger de inmutabilidad
grant select, insert on public.historial to authenticated;
grant usage on sequence public.historial_id_seq to authenticated;

-- ─── clientes ───────────────────────────────────────────────────────────
-- SELECT: cualquier autenticado con profile activo
-- INSERT/UPDATE/DELETE: solo admin (via policy)
grant select, insert, update, delete on public.clientes to authenticated;
-- La secuencia clientes_id_publico_seq ya recibio grant en 0002, no hace falta repetir.

-- ─── Defensa en profundidad ─────────────────────────────────────────────
-- Aseguramos que anon (no logueado) NO tenga NINGUN acceso a estas tablas.
-- El grant a authenticated NO implica anon; esto es solo defensivo por si
-- algo se granted antes.
revoke all on public.profiles       from anon;
revoke all on public.configuracion  from anon;
revoke all on public.historial      from anon;
revoke all on public.clientes       from anon;
