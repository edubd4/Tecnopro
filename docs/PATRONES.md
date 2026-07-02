# TECNOPRO — Patrones establecidos

Convenciones y patrones consolidados durante Fases 1 y 2. Un módulo nuevo (Ola C, Ola D o de mantenimiento) DEBE seguir estos patrones.

---

## Patrón · Anatomía de un módulo de dominio

Cada módulo (clientes, órdenes, turnos, presupuestos, etc.) tiene la misma estructura:

```
supabase/migrations/000N_<modulo>.sql     · enum + tabla + trigger id_publico + policies + grants
lib/validators/<modulo>.ts                 · schemas Zod con preprocess
lib/<modulo>-ui.ts                         · labels + variants de badge (si aplica)
app/(dashboard)/<modulo>/actions.ts        · server actions
app/(dashboard)/<modulo>/page.tsx          · lista (server)
app/(dashboard)/<modulo>/nuevo/page.tsx    · crear (server + form client)
app/(dashboard)/<modulo>/[id]/page.tsx     · ficha (server + form client de edición)
components/<modulo>/<ModuloForm>.tsx       · form crear/editar (client)
components/<modulo>/<ModuloListRow>.tsx    · fila clickeable con controles inline (client)
components/<modulo>/<CambiarEstado>.tsx    · si tiene estado (client)
```

---

## Patrón · Tabla de dominio en SQL

```sql
-- ─── Enum del dominio (si aplica) ───
create type <estado_x> as enum ('...', '...');

-- ─── Secuencia + tabla ───
create sequence public.<modulo>_id_publico_seq start with 1;

create table public.<modulo> (
  id                uuid primary key default gen_random_uuid(),
  id_publico        text not null unique,
  -- FKs con estrategia consciente:
  --   on delete restrict: entidad maestra que no queremos perder (clientes, servicios, repuestos)
  --   on delete set null: FK opcional que sobrevive al borrado (tecnico, orden vinculada)
  --   on delete cascade: item hijo que solo tiene sentido con el padre (orden_servicios)
  <fk_id>           uuid not null references public.<otra_tabla>(id) on delete <estrategia>,
  -- Campos del dominio
  ...
  estado            <estado_x> not null default 'INICIAL',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id),
  updated_by        uuid references auth.users(id)
);

-- ─── Trigger id_publico ───
create or replace function public.set_<modulo>_id_publico()
returns trigger language plpgsql as $$
begin
  if new.id_publico is null or new.id_publico = '' then
    new.id_publico := '<PREFIX>-' || lpad(nextval('public.<modulo>_id_publico_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger <modulo>_set_id_publico
  before insert on public.<modulo>
  for each row execute function public.set_<modulo>_id_publico();

create trigger <modulo>_touch_updated_at
  before update on public.<modulo>
  for each row execute function public.touch_updated_at();  -- helper ya existente

-- ─── Índices ───
create index idx_<modulo>_<campo> on public.<modulo>(<campo>);
-- Índice parcial si aplica: create index ... where <condicion>;

-- ─── RLS con current_user_rol() — NUNCA subquery a profiles ───
alter table public.<modulo> enable row level security;

create policy "<modulo>_select_..."
  on public.<modulo> for select
  using (public.current_user_rol() = 'admin');  -- o condiciones combinadas

create policy "<modulo>_write_admin"
  on public.<modulo> for all
  using (public.current_user_rol() = 'admin')
  with check (public.current_user_rol() = 'admin');

-- ─── GRANTs explícitos + REVOKE from anon ───
grant select, insert, update on public.<modulo> to authenticated;
grant usage on sequence public.<modulo>_id_publico_seq to authenticated;
revoke all on public.<modulo> from anon;
```

**Prefijos de id_publico** en uso: `CLI` (clientes), `OT` (órdenes), `PRES` (presupuestos), `EQ` (equipos — reservado), `REP` (repuestos), `TRN` (turnos), `MOV` (movimientos caja — reservado), `SRV` (servicios).

---

## Patrón · Server action con result discriminado

```ts
"use server"

type ActionResult<T = void> = { ok: false; error: string } | { ok: true; data?: T }

async function requireAuth() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles").select("rol, activo").eq("id", user.id).single()
  if (!profile?.activo) return { ok: false as const, error: "Usuario inactivo" }

  return { ok: true as const, supabase, user, rol: profile.rol }
}

export async function createX(input: XInput): Promise<ActionResult> {
  const parsed = xSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const auth = await requireAuth()
  if (!auth.ok) return { ok: false, error: auth.error }
  const { supabase, user } = auth

  const { data, error } = await supabase.from("x").insert({ ...parsed.data, created_by: user.id }).select("id, id_publico").single()
  if (error || !data) return { ok: false, error: error?.message ?? "..." }

  await logHistorial(supabase, {
    tipo: TIPO_EVENTO.XXX,
    descripcion: `...`,
    entidadTipo: "x",
    entidadId: data.id_publico,
    userId: user.id,
  })

  revalidatePath("/x")
  redirect(`/x/${data.id}`)  // create: redirect
  // update: return { ok: true }  ← el cliente hace router.refresh()
}
```

**Regla clave**: el discriminado siempre con `ok: true | false` literal, NUNCA con `error: string | null`. Ver `tecnopro/patron-discriminated-union-ok` en engram.

---

## Patrón · Fila de tabla clickeable

Ver `components/ordenes/OrdenListRow.tsx` y `components/presupuestos/PresupuestoListRow.tsx` como referencia.

```tsx
"use client"

export function XListRow(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <TableRow
      className={cn("cursor-pointer", isPending && "opacity-60 pointer-events-none")}
      onClick={() => router.push(`/x/${props.id}`)}
    >
      {/* Link a otro recurso: stopPropagation doble */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <a href={`/otro/${props.otro_id}`} onClick={(e) => e.stopPropagation()}>
          {props.otro_label}
        </a>
      </TableCell>

      {/* Control inline (select): stopPropagation en td Y en el control */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <select onChange={handleChange} onClick={(e) => e.stopPropagation()}>...</select>
      </TableCell>
    </TableRow>
  )
}
```

**Regla**: si en una fila hay un `<select>`, `<button>`, o `<a>` a otro recurso, TIENE que ser client component completo con stopPropagation en ambos niveles.

---

## Patrón · Client vs Server components

- **Server component** (default): sin `"use client"`. NO puede tener event handlers, `useState`, `useEffect`, `window`, etc.
- **Client component**: primera línea `"use client"`. Necesario para: `onClick`, `onChange`, `useState`, `useTransition`, `useRouter`, formularios con estado.

**Regla dura**: si un `<select>` o `<input>` en un server component necesita `onChange`, extraerlo a un client component. Ver `tecnopro/gotcha-rsc-event-handlers`.

**Regla dura 2**: NO pasar funciones ni componentes React como props de server a client. Solo JSON-serializable. Para pasar íconos: pasar la key como string y resolver client-side. Ver `tecnopro/gotcha-server-client-serialization`.

---

## Patrón · Item transaccional con RPC

Cuando una acción requiere 2+ operaciones atómicas (imputar repuesto = movimiento SALIDA + fila en orden_repuestos), crear un RPC en Postgres:

```sql
create or replace function public.imputar_repuesto_a_orden(
  p_orden_id uuid, p_repuesto_id uuid, p_cantidad integer, p_precio_unitario numeric
)
returns bigint
language plpgsql
security invoker
as $$
declare v_mov_id bigint; v_or_id bigint;
begin
  -- Insertar movimiento (dispara trigger que descuenta stock; si insuficiente → raise)
  insert into public.repuestos_movimientos (...) values (...) returning id into v_mov_id;
  -- Insertar la fila con FK al movimiento
  insert into public.orden_repuestos (...) values (..., v_mov_id) returning id into v_or_id;
  return v_or_id;
end;
$$;
```

Y desde el action:
```ts
const { error, data } = await supabase.rpc("imputar_repuesto_a_orden", { ... })
```

Postgres revierte automáticamente todo si algo falla. Cero código de rollback en TypeScript.

---

## Patrón · Detección de solapamiento temporal

Postgres tiene `tstzrange` + operador `&&` que detecta cualquier intersección entre 2 rangos. Ver `turnos_overlap_for_tecnico`:

```sql
where tstzrange(fecha_inicio, fecha_fin) && tstzrange(p_fecha_inicio, p_fecha_fin)
```

Captura los 4 casos de overlap (inicio dentro, fin dentro, contenedor, contenido) en una sola expresión.

---

## Patrón · Configuración declarativa

Los campos configurables por el admin están en la tabla `configuracion` (key-value) con seeds del bootstrap.

Módulos que consumen configuración (ej. `/presupuestos/nuevo`) leen los valores server-side con un helper:

```ts
async function getConfigNumero(clave: string, fallback: number): Promise<number> {
  const { data } = await supabase.from("configuracion").select("valor").eq("clave", clave).maybeSingle()
  const v = data?.valor
  if (v === null || v === undefined || v === "") return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
```

**Regla**: SIEMPRE con fallback. Si la clave no existe, el módulo sigue funcionando.

---

## Patrón · Snapshot en items imputados

`orden_servicios.descripcion_snapshot`, `presupuesto_repuestos.costo_snapshot`, etc.

**Regla**: cuando un item hace referencia a un maestro (servicio/repuesto), copiar los campos relevantes al momento del insert. Si mañana el maestro cambia de nombre o precio, la orden vieja mantiene lo que se acordó con el cliente.

---

## Patrón · Historial inmutable

Toda acción significativa loguea en `historial` (0001_init.sql):

```ts
await logHistorial(supabase, {
  tipo: TIPO_EVENTO.CAMBIO_ESTADO_ORDEN,        // o el que corresponda
  descripcion: `Orden OT-0042: RECIBIDA → DIAGNOSTICO`,
  entidadTipo: "orden",
  entidadId: "OT-0042",                          // id_publico, no uuid
  payload: { estado_anterior, estado_nuevo },
  userId: user.id,
})
```

`historial` es append-only por RLS + trigger. Correcciones = nuevo evento. Para exponer en UI: pendiente `/historial` como página admin-only (backlog).

---

## Patrón · Congelamiento post-cierre

Entidades con "cierre" (orden ENTREGADA, presupuesto APROBADO/RECHAZADO) tienen:

```ts
const puedeEditar = esAdmin && orden.estado !== "ENTREGADA" && orden.estado !== "CANCELADA"
```

En la UI, `puedeEditar` controla qué botones aparecen. En SQL, opcional agregar policy adicional que bloquee update de items si el padre está cerrado (no lo hicimos aún — depende del riesgo del negocio).

---

## Reglas de proceso

1. **`npm run build`** local antes del push (pesca errores de TS/ESLint que Vercel también pescaría).
2. **`npm run dev`** local para probar interactividad (el build NO ejecuta el código).
3. **Preview de Vercel verde antes de mergear** — no mergear "porque el build salió verde"; abrir el preview URL y clickear.
4. **Migración SQL aplicada antes del merge** — Guillermo/Eduardo la corre en el SQL Editor.
5. **`mem_save`** después de cada patrón/decisión/gotcha con `project: "tecnopro"`.

---

## Referencias en engram

Buscar con `mem_search "tecnopro/..."`:

- `tecnopro/kickoff` — setup inicial
- `tecnopro/setup-decisions` — decisiones de arranque
- `tecnopro/patron-modulo-maestro` — patrón de módulo (Clientes fue el molde)
- `tecnopro/patron-discriminated-union-ok` — result types con `ok: boolean`
- `tecnopro/patron-table-row-clickable` — filas de tabla clickeables
- `tecnopro/gotcha-server-client-serialization` — íconos como props server→client
- `tecnopro/gotcha-route-groups-collision` — `app/page.tsx` vs `app/(grupo)/page.tsx`
- `tecnopro/gotcha-rls-recursion` — recursión infinita en policies (0003)
- `tecnopro/gotcha-supabase-grants` — GRANTs faltantes (0004)
- `tecnopro/gotcha-ts-as-const-null` — `null as const` inválido
- `tecnopro/gotcha-rsc-event-handlers` — onChange en server component
- `tecnopro/gotcha-vercel-env-vars-build-time` — env vars al deploy
- `tecnopro/fase-1.2-auth` · `1.3-dashboard-shell` · `2-a1-...` · etc. — hitos
- `tecnopro/decision-crud-delete-strategy` — soft vs hard delete
- `tecnopro/estado-actual` — snapshot de sesión
