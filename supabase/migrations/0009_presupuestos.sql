-- ============================================================================
-- TECNOPRO · Fase 2 Ola B.3 · Modulo Presupuestos
-- Cotizaciones con items (servicios + repuestos), margen y mensaje generado.
-- ============================================================================
-- Diferencia clave vs ordenes: los repuestos NO descuentan stock aca.
-- Presupuesto = intencion de compra, no consumo real.

-- ─── Enum del dominio ─────────────────────────────────────────────────────
create type estado_presupuesto as enum (
  'BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO', 'VENCIDO'
);

-- ─── Secuencia para el id_publico ─────────────────────────────────────────
create sequence public.presupuestos_id_publico_seq start with 1;

-- ─── Tabla: presupuestos ──────────────────────────────────────────────────
create table public.presupuestos (
  id                uuid primary key default gen_random_uuid(),
  id_publico        text not null unique,
  cliente_id        uuid not null references public.clientes(id) on delete restrict,
  orden_id          uuid references public.ordenes(id) on delete set null,
  titulo            text not null,
  descripcion       text,
  estado            estado_presupuesto not null default 'BORRADOR',
  validez_hasta     date not null default (current_date + interval '7 days'),
  margen_pct        numeric(5,2) not null default 30 check (margen_pct >= 0 and margen_pct <= 500),
  mensaje_generado  text,                     -- texto listo para copiar al cliente
  notas_internas    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  enviado_at        timestamptz,              -- se llena al pasar a ENVIADO
  respondido_at     timestamptz,              -- se llena al pasar a APROBADO/RECHAZADO
  created_by        uuid references auth.users(id),
  updated_by        uuid references auth.users(id)
);

create or replace function public.set_presupuesto_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := 'PRES-' || lpad(nextval('public.presupuestos_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger presupuestos_set_id_publico
  before insert on public.presupuestos
  for each row execute function public.set_presupuesto_id_publico();

create trigger presupuestos_touch_updated_at
  before update on public.presupuestos
  for each row execute function public.touch_updated_at();

-- Trigger que setea enviado_at / respondido_at al cambiar de estado
create or replace function public.set_presupuesto_timestamps()
returns trigger language plpgsql as $$
begin
  -- ENVIADO
  if new.estado = 'ENVIADO' and (old.estado is distinct from 'ENVIADO') and new.enviado_at is null then
    new.enviado_at := now();
  end if;

  -- APROBADO / RECHAZADO
  if new.estado in ('APROBADO', 'RECHAZADO') and (old.estado not in ('APROBADO', 'RECHAZADO')) and new.respondido_at is null then
    new.respondido_at := now();
  end if;

  -- Volver a BORRADOR limpia los timestamps
  if new.estado = 'BORRADOR' and old.estado <> 'BORRADOR' then
    new.enviado_at := null;
    new.respondido_at := null;
  end if;

  return new;
end;
$$;

create trigger presupuestos_set_timestamps
  before update on public.presupuestos
  for each row execute function public.set_presupuesto_timestamps();

-- ─── Indices ──────────────────────────────────────────────────────────────
create index idx_presupuestos_cliente  on public.presupuestos(cliente_id);
create index idx_presupuestos_orden    on public.presupuestos(orden_id) where orden_id is not null;
create index idx_presupuestos_estado   on public.presupuestos(estado);
create index idx_presupuestos_created  on public.presupuestos(created_at desc);
create index idx_presupuestos_vencidos on public.presupuestos(validez_hasta) where estado = 'ENVIADO';

-- ─── Tabla: presupuesto_servicios ──────────────────────────────────────────
create table public.presupuesto_servicios (
  id                   bigserial primary key,
  presupuesto_id       uuid not null references public.presupuestos(id) on delete cascade,
  servicio_id          uuid not null references public.servicios(id) on delete restrict,
  descripcion_snapshot text not null,
  precio               numeric(12,2) not null check (precio >= 0),
  cantidad             integer not null check (cantidad > 0),
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id)
);

create index idx_pres_srv_pres on public.presupuesto_servicios(presupuesto_id);

-- ─── Tabla: presupuesto_repuestos ─────────────────────────────────────────
-- Guardamos costo_snapshot para auditar de donde salio el margen.
create table public.presupuesto_repuestos (
  id                   bigserial primary key,
  presupuesto_id       uuid not null references public.presupuestos(id) on delete cascade,
  repuesto_id          uuid not null references public.repuestos(id) on delete restrict,
  descripcion_snapshot text not null,
  costo_snapshot       numeric(12,2) not null default 0,
  precio_unitario      numeric(12,2) not null check (precio_unitario >= 0),
  cantidad             integer not null check (cantidad > 0),
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id)
);

create index idx_pres_rep_pres on public.presupuesto_repuestos(presupuesto_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.presupuestos enable row level security;

-- SELECT: authenticated con profile activo
create policy "presupuestos_select_authenticated"
  on public.presupuestos for select
  to authenticated
  using (public.current_user_rol() is not null);

-- INSERT/UPDATE: admin cualquiera; tecnico solo si esta asignado a la orden
create policy "presupuestos_write_admin"
  on public.presupuestos for all
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');

create policy "presupuestos_write_tecnico"
  on public.presupuestos for all
  using (
    public.current_user_rol() = 'tecnico'
    and orden_id is not null
    and exists (
      select 1 from public.ordenes o
      where o.id = orden_id and o.tecnico_asignado_id = auth.uid()
    )
  )
  with check (
    public.current_user_rol() = 'tecnico'
    and orden_id is not null
    and exists (
      select 1 from public.ordenes o
      where o.id = orden_id and o.tecnico_asignado_id = auth.uid()
    )
  );

-- Items: mismo acceso que el presupuesto padre
alter table public.presupuesto_servicios enable row level security;

create policy "pres_srv_all_via_pres"
  on public.presupuesto_servicios for all
  using (
    exists (
      select 1 from public.presupuestos p
      where p.id = presupuesto_id
      and (
        public.current_user_rol() = 'admin'
        or (
          public.current_user_rol() = 'tecnico'
          and p.orden_id is not null
          and exists (
            select 1 from public.ordenes o
            where o.id = p.orden_id and o.tecnico_asignado_id = auth.uid()
          )
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.presupuestos p
      where p.id = presupuesto_id
      and (
        public.current_user_rol() = 'admin'
        or (
          public.current_user_rol() = 'tecnico'
          and p.orden_id is not null
          and exists (
            select 1 from public.ordenes o
            where o.id = p.orden_id and o.tecnico_asignado_id = auth.uid()
          )
        )
      )
    )
  );

alter table public.presupuesto_repuestos enable row level security;

create policy "pres_rep_all_via_pres"
  on public.presupuesto_repuestos for all
  using (
    exists (
      select 1 from public.presupuestos p
      where p.id = presupuesto_id
      and (
        public.current_user_rol() = 'admin'
        or (
          public.current_user_rol() = 'tecnico'
          and p.orden_id is not null
          and exists (
            select 1 from public.ordenes o
            where o.id = p.orden_id and o.tecnico_asignado_id = auth.uid()
          )
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.presupuestos p
      where p.id = presupuesto_id
      and (
        public.current_user_rol() = 'admin'
        or (
          public.current_user_rol() = 'tecnico'
          and p.orden_id is not null
          and exists (
            select 1 from public.ordenes o
            where o.id = p.orden_id and o.tecnico_asignado_id = auth.uid()
          )
        )
      )
    )
  );

-- ─── GRANTs + REVOKE from anon ────────────────────────────────────────────
grant select, insert, update on public.presupuestos to authenticated;
grant usage on sequence public.presupuestos_id_publico_seq to authenticated;
grant select, insert, update, delete on public.presupuesto_servicios to authenticated;
grant select, insert, update, delete on public.presupuesto_repuestos to authenticated;
grant usage on sequence public.presupuesto_servicios_id_seq to authenticated;
grant usage on sequence public.presupuesto_repuestos_id_seq to authenticated;
revoke all on public.presupuestos          from anon;
revoke all on public.presupuesto_servicios from anon;
revoke all on public.presupuesto_repuestos from anon;
