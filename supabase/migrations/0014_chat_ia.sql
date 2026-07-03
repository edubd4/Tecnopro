-- ============================================================================
-- TECNOPRO · Fase 3.3 · Chat con IA (Claude Haiku)
-- ============================================================================
-- Tablas para persistir el chat entre el admin y el asistente de negocio.
--
-- Modelo:
--   chat_conversaciones  — una conversación por hilo (título auto-generado o
--                          "Nueva conversación" hasta que llegue el primer msg).
--   chat_mensajes        — cada mensaje del hilo (user / assistant).
--
-- Reglas duras:
--   - Solo admin activo puede crear y leer conversaciones.
--   - Cada admin ve SOLO sus propias conversaciones (aunque haya varios admins).
--   - Los mensajes son inmutables (patrón historial): update/delete bloqueados.
--   - Al borrar una conversación (soft), los mensajes se preservan.
-- ============================================================================

-- ─── chat_conversaciones ────────────────────────────────────────────────────
create table public.chat_conversaciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titulo      text not null default 'Nueva conversación',
  archivada   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_chat_conv_user    on public.chat_conversaciones(user_id, archivada, updated_at desc);
create index idx_chat_conv_updated on public.chat_conversaciones(updated_at desc);

create trigger chat_conversaciones_touch_updated_at
  before update on public.chat_conversaciones
  for each row execute function public.touch_updated_at();

alter table public.chat_conversaciones enable row level security;

-- SELECT: user propietario, siempre que sea admin activo.
create policy "chat_conv_select_own_admin"
  on public.chat_conversaciones for select
  using (
    auth.uid() = user_id
    and public.current_user_rol() = 'admin'
  );

-- INSERT: admin puede crear conversaciones para sí mismo.
create policy "chat_conv_insert_own_admin"
  on public.chat_conversaciones for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.current_user_rol() = 'admin'
  );

-- UPDATE: solo el owner admin puede archivar o cambiar título.
create policy "chat_conv_update_own_admin"
  on public.chat_conversaciones for update
  using (
    auth.uid() = user_id
    and public.current_user_rol() = 'admin'
  );

grant select, insert, update on public.chat_conversaciones to authenticated;
revoke all on public.chat_conversaciones from anon;

-- ─── chat_mensajes ──────────────────────────────────────────────────────────
create table public.chat_mensajes (
  id              bigserial primary key,
  conversacion_id uuid not null references public.chat_conversaciones(id) on delete cascade,
  rol             text not null check (rol in ('user', 'assistant')),
  contenido       text not null,
  tokens_input    integer,
  tokens_output   integer,
  model           text,
  created_at      timestamptz not null default now()
);

create index idx_chat_msg_conv on public.chat_mensajes(conversacion_id, created_at asc);

alter table public.chat_mensajes enable row level security;

-- SELECT/INSERT vía la conversación (mismo dueño admin).
create policy "chat_msg_all_via_conv"
  on public.chat_mensajes for all
  using (
    exists (
      select 1 from public.chat_conversaciones c
      where c.id = conversacion_id
      and c.user_id = auth.uid()
      and public.current_user_rol() = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.chat_conversaciones c
      where c.id = conversacion_id
      and c.user_id = auth.uid()
      and public.current_user_rol() = 'admin'
    )
  );

-- Inmutabilidad: no update, no delete (append-only).
create or replace function public.chat_mensajes_block_mutations()
returns trigger language plpgsql as $$
begin
  raise exception 'chat_mensajes es inmutable: % no permitido', TG_OP;
end;
$$;

create trigger chat_msg_no_update
  before update on public.chat_mensajes
  for each row execute function public.chat_mensajes_block_mutations();

create trigger chat_msg_no_delete
  before delete on public.chat_mensajes
  for each row execute function public.chat_mensajes_block_mutations();

grant select, insert on public.chat_mensajes to authenticated;
grant usage on sequence public.chat_mensajes_id_seq to authenticated;
revoke all on public.chat_mensajes from anon;
