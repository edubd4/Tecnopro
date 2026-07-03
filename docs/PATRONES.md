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

## Patrón · Movimientos inmutables (append-only)

Consolidado en Ola C. Aplica a `historial`, `repuestos_movimientos`, `movimientos_caja`, `gastos`.

```sql
create or replace function public.<tabla>_block_mutations()
returns trigger language plpgsql as $$
begin
  raise exception '<tabla> es inmutable: % no permitido. Registrar un nuevo movimiento (AJUSTE) para corregir.', TG_OP;
end;
$$;

create trigger <tabla>_no_update
  before update on public.<tabla>
  for each row execute function public.<tabla>_block_mutations();

create trigger <tabla>_no_delete
  before delete on public.<tabla>
  for each row execute function public.<tabla>_block_mutations();
```

**Regla**: correcciones = nuevo movimiento con origen `AJUSTE`. Si mañana descubrís que un gasto fue $3000 no $5000, no editás — hacés un movimiento_caja AJUSTE por $2000 en la dirección compensatoria. Beneficio: auditoría real, cero pérdida de historia.

**Regla de UI**: en la lista mostrar el badge "Inmutable" o mensaje "Los movimientos son append-only — para corregir, registrá un ajuste."

---

## Patrón · RPC transaccional multi-tabla

Usado en `imputar_repuesto_a_orden` (Ola B), `cobrar_orden` (Ola C.1), `registrar_gasto` (Ola C.2).

**Cuándo**: cuando una acción del usuario requiere insertar en **2+ tablas** que deben quedar consistentes (o ambas se insertan, o ninguna).

Ejemplo `registrar_gasto`:

```sql
create or replace function public.registrar_gasto(
  p_categoria_id bigint, p_monto numeric, p_descripcion text,
  p_fecha date, p_metodo_pago metodo_pago, p_notas text
)
returns uuid language plpgsql security invoker as $$
declare
  v_categoria_nombre text;
  v_mov_id uuid;
  v_gasto_id uuid;
begin
  -- Validaciones defensivas
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Monto invalido'; end if;

  select nombre into v_categoria_nombre
    from public.categorias_gasto where id = p_categoria_id and activo = true;
  if v_categoria_nombre is null then raise exception 'Categoria no encontrada o inactiva'; end if;

  -- Paso 1: crear movimiento en caja
  insert into public.movimientos_caja (tipo, origen, monto, metodo_pago, descripcion, created_by)
  values ('EGRESO', 'GASTO', p_monto, p_metodo_pago,
          v_categoria_nombre || ' · ' || p_descripcion, auth.uid())
  returning id into v_mov_id;

  -- Paso 2: crear gasto con link al movimiento (FK NOT NULL garantiza atomicidad semántica)
  insert into public.gastos (categoria_id, monto, descripcion, fecha, notas, movimiento_id, created_by)
  values (p_categoria_id, p_monto, p_descripcion, p_fecha, p_notas, v_mov_id, auth.uid())
  returning id into v_gasto_id;

  return v_gasto_id;
end;
$$;
```

**Desde el action**:
```ts
const { data: gastoId, error } = await supabase.rpc("registrar_gasto", { ... })
if (error || !gastoId) return { ok: false, error: error?.message ?? "..." }
```

Postgres hace rollback automático si algo falla. Cero código de compensación en TS. Ver `tecnopro/patron-rpc-transaccional` en engram.

---

## Patrón · Vista SQL como capa de reporte

Introducido en Ola C.3 (`ordenes_con_saldo` en migración 0012). Sin nuevas tablas — solo query almacenada.

**Cuándo usarlo**:
- Combinás 2+ tablas en una consulta que necesitás **repetidamente** desde la app.
- Los reportes necesitan campos derivados (sumas, restas, ratios).
- Querés que otras vistas del sistema (Panel, Alertas, Tesorería) usen la misma lógica sin duplicarla.

Ejemplo:
```sql
create or replace view public.ordenes_con_saldo as
with items_por_orden as (
  select o.id, o.id_publico, o.cliente_id, o.estado,
         coalesce((select sum(precio * cantidad) from public.orden_servicios where orden_id = o.id), 0)
         + coalesce((select sum(precio_unitario * cantidad) from public.orden_repuestos where orden_id = o.id), 0)
         as total
  from public.ordenes o
),
cobros_por_orden as (
  select orden_id, sum(monto)::numeric(14,2) as cobrado
  from public.movimientos_caja
  where tipo = 'INGRESO' and origen = 'COBRO_ORDEN' and orden_id is not null
  group by orden_id
)
select i.*, coalesce(c.cobrado, 0) as cobrado,
       (i.total - coalesce(c.cobrado, 0)) as saldo_pendiente
from items_por_orden i
left join cobros_por_orden c on c.orden_id = i.id;

grant select on public.ordenes_con_saldo to authenticated;
revoke all on public.ordenes_con_saldo from anon;
```

**RLS de la vista**: hereda RLS de las tablas base. Si `movimientos_caja` es admin-only y `ordenes` es role-based, la vista termina siendo efectivamente admin-only. No hay que agregar policies a la vista.

**Cuándo NO usar vista** (usar query directa en el app):
- Filtros muy variables por caller.
- Volumen chico y query no reusada.

---

## Patrón · TZ safety con string ISO en fechas server → client

Descubierto durante QA de Turnos (fix del PR#14).

**Problema**: pasar `Date` de server (UTC en Vercel) a client (AR en UTC-3) por props RSC hace que `.getDate()` en client devuelva el día anterior. Aritmética con fechas queda desalineada — bugs off-by-one y "el botón no funciona" cuando la URL resultante coincide accidentalmente con el URL actual.

**Regla**: nunca pasar `Date` como prop de server a client. Serializar como string ISO `"YYYY-MM-DD"`.

```tsx
// Server component
import { toISODate } from "@/lib/fechas"
<MyClientComponent weekStartISO={toISODate(weekStart)} />

// Client component
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)  // mediodía para dar margen a ambos lados
  d.setDate(d.getDate() + days)
  return toISODate(d)
}
```

**Regla dura**: `T12:00:00` (mediodía) en vez de `T00:00:00` al reconstruir. Con `T00:00`, cualquier TZ negativa (AR) retrocede al día anterior. Con `T12:00`, hay 12h de margen a cada lado, suficiente para toda TZ realista.

Ver `tecnopro/gotcha-tz-drift-server-client` en engram.

---

## Patrón · Charts en SVG/CSS puro (sin lib externa)

Usado en `/analytics` (Ola D). Cero dependencias — solo divs con width/height calculados.

**Barras horizontales** (`HorizontalBars`):
```tsx
const max = Math.max(...items.map(i => i.value), 1)
{items.map(item => {
  const pct = Math.max((item.value / max) * 100, 2)  // mínimo 2% para que se vea aunque sea 0
  return (
    <div className="h-2 rounded-full bg-tp-surface-mid overflow-hidden">
      <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
    </div>
  )
})}
```

**Barras verticales agrupadas** (`MonthlyFlow`, 2 series por mes):
```tsx
<div className="grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
  {data.map(m => (
    <div className="flex items-end gap-1 h-40">
      <div style={{ height: `${Math.max((m.ingresos / max) * heightPx, 2)}px` }} />
      <div style={{ height: `${Math.max((m.egresos / max) * heightPx, 2)}px` }} />
    </div>
  ))}
</div>
```

**Cuándo migrar a Recharts/Chart.js**: cuando aparezca la necesidad de zoom, tooltips ricos, animaciones o exportar imagen. Para MVP: no vale la pena la dep.

---

## Patrón · Filtro de período por preset URL

Usado en `/contabilidad` (Ola C.3).

```tsx
type Preset = "mes" | "anio" | "custom"

function resolvePeriodo(params: { preset?: string; desde?: string; hasta?: string }) {
  const preset: Preset =
    params.preset === "anio" ? "anio" :
    params.preset === "custom" ? "custom" :
    "mes"
  // ... construir { desde, hasta, label } según preset
}

// UI
<PresetLink current={periodo.preset} value="mes" label="Mes actual" />
<PresetLink current={periodo.preset} value="anio" label="Año actual" />
<form action="/contabilidad" method="get">
  <input type="hidden" name="preset" value="custom" />
  <input type="date" name="desde" defaultValue={...} />
  <input type="date" name="hasta" defaultValue={...} />
  <button type="submit">Custom</button>
</form>
```

**Regla**: el form custom usa **HTML form nativo** (`action` + `method="get"`), no `router.push`. Menos JS, funciona sin JS habilitado, más accesible.

---

## Patrón · Export CSV con BOM UTF-8

En `lib/fechas.ts`:

```ts
export function escapeCSVCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCSVCell).join(",")]
  for (const row of rows) lines.push(row.map(escapeCSVCell).join(","))
  return "﻿" + lines.join("\r\n")  // BOM UTF-8 al inicio
}
```

**Regla dura**: el `﻿` (BOM UTF-8) al principio del archivo. Sin BOM, **Excel abre el CSV en cp1252** y las tildes/símbolos aparecen como caracteres raros ("cÃ³digo" en vez de "código"). Con BOM, Excel detecta UTF-8 automáticamente.

**Regla de escape**: RFC 4180. Si la celda tiene coma, comilla o salto de línea, envolver en `"..."` y duplicar las comillas internas.

**Response headers en la API route**:
```ts
new NextResponse(csv, {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="tecnopro-libro-${desde}_${hasta}.csv"`,
    "Cache-Control": "no-store",
  },
})
```

---

## Patrón · Panel dual view por rol

En `/panel` (Ola D):

```tsx
export default async function PanelPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("nombre, rol").eq("id", user.id).single()
  const esAdmin = profile?.rol === ROL.ADMIN

  if (esAdmin) return <PanelAdmin nombre={profile.nombre ?? "Admin"} />
  return <PanelTecnico nombre={profile.nombre ?? "Técnico"} userId={user.id} />
}
```

**Regla**: `PanelAdmin` y `PanelTecnico` son **async server components** independientes. Cada uno hace sus propias queries (con `Promise.all`). Nada de condicional en la UI para cada sección — es más limpio tener 2 componentes hermanos con la lógica propia.

---

## Patrón · Contar filas eficientemente

En Supabase para KPIs:
```ts
supabase.from("ordenes").select("id", { count: "exact", head: true })
```

`head: true` evita traer los rows. Solo devuelve el count. Óptimo para tarjetas KPI del panel.

---

## Gotcha · Supabase-js no compara dos columnas de la misma tabla

Descubierto en Ola D (Alertas + Panel — stock bajo).

**Problema**: no podés hacer `.lte("stock_actual", "stock_minimo")` en Supabase-js. `.lte` compara con un valor literal, no con otra columna.

**Fix**: traer las filas con un filtro server-side laxo y filtrar en JS:
```ts
const { data } = await supabase
  .from("repuestos")
  .select("stock_actual, stock_minimo")
  .eq("activo", true)
  .gt("stock_minimo", 0)  // no traemos los que tienen stock_minimo=0

const bajo = data.filter(r => Number(r.stock_actual) <= Number(r.stock_minimo))
```

Si el volumen crece: crear vista SQL como `repuestos_bajo_stock` (todavía no es necesario).

Ver `tecnopro/gotcha-supabase-column-comparison` en engram.

---

## Patrón · Sistema de toasts custom (Context + Portal)

Introducido en Wave 2 (`components/ui/toast.tsx`). Sin dependencias externas — Context + `createPortal`.

```tsx
const toast = useToast()
toast.success("Cliente creado")
toast.error("No se pudo guardar")
toast.info("El presupuesto vence en 3 días")
```

**Setup en el layout**:
```tsx
<ToastProvider>
  <ConfirmProvider>
    {children}
  </ConfirmProvider>
</ToastProvider>
```

**Reglas**:
- Éxito: 4 segundos.
- Error: 6 segundos (más tiempo para leer).
- Portal fixed bottom-right con `z-[100]`.
- Fallback silencioso a `console.log` si `useToast()` se llama fuera del provider — no rompe el árbol.
- Después de cada `startTransition` exitoso: `toast.success("...")` contextual.
- Errores: `toast.error(result.error)` en el catch del action.

---

## Patrón · ConfirmDialog con Radix + useConfirm

Introducido en Wave 2 (`components/ui/confirm-dialog.tsx`). Reemplaza `window.confirm()`.

```tsx
const confirm = useConfirm()

async function handleDelete() {
  const ok = await confirm({
    title: "¿Cancelar orden OT-0042?",
    description: "La orden queda con estado CANCELADA. Podés revertirla cambiando el estado.",
    confirmLabel: "Cancelar orden",
    tone: "danger",  // danger | warning | default
  })
  if (!ok) return
  // ... proceder ...
}
```

**Reglas**:
- Retorna `Promise<boolean>` — API mucho más ergonómica que callbacks.
- `tone: "danger"` para acciones destructivas (botón rojo).
- `tone: "warning"` para acciones importantes reversibles.
- Radix AlertDialog garantiza accesibilidad + Escape + focus trap.
- Fallback a `window.confirm()` nativo si no hay provider (nunca debería pasar en producción).

---

## Patrón · IA con fallback silencioso al template

Consolidado en Fase 3 (los 3 casos de IA). Aplicado en `mensaje-presupuesto.ts`, `aviso-orden.ts`.

```ts
let mensaje: string
let source: "ia" | "template" = "template"

if (hayIADisponible()) {
  try {
    const ia = await generarMensajePresupuestoIA(datos)
    mensaje = ia.mensaje
    source = "ia"
  } catch (err) {
    console.error("[action] IA falló, fallback a template:", err)
    mensaje = generarMensajePresupuestoTemplate(datos)
  }
} else {
  mensaje = generarMensajePresupuestoTemplate(datos)
}
```

**Reglas duras**:
- Cada llamada a IA va con try/catch.
- Fallback estático que produce output equivalente (no idéntico, pero funcional).
- `console.error` para debug (Vercel logs) pero **nunca romper el flow del usuario**.
- Payload en `historial` con `source: 'ia' | 'template'` + tokens + model para tracking de consumo.
- `hayIADisponible()` chequea la env var sin crear cliente — evita exception al arrancar.

---

## Patrón · Multi-turn con Anthropic SDK

Introducido en Fase 3.3 (`lib/anthropic.ts` — función `llamarAnthropicMulti`). Para conversaciones donde el modelo necesita recordar mensajes previos.

```ts
const historial = await getMensajesDeConversacion(convId)

const response = await llamarAnthropicMulti({
  systemPrompt: `${SYSTEM_PROMPT_BASE}\n\n${snapshotNegocio}`,
  messages: historial.map((m) => ({
    role: m.rol as "user" | "assistant",
    content: m.contenido,
  })),
  maxTokens: 800,
  temperature: 0.4,
})
```

**Reglas**:
- El system prompt siempre incluye contexto fresco de negocio (regenerado en cada request).
- El historial se pasa como array `messages` para que el modelo mantenga contexto.
- Limitar el historial (ej. hasta 40 mensajes) para no crecer indefinidamente.
- `llamarAnthropic()` para casos one-shot (delega internamente a `llamarAnthropicMulti`).

---

## Patrón · Snapshot de negocio para system prompt

Introducido en Fase 3.3 (`lib/chat-context.ts`). Alternativa a tool use.

**Cuándo usarlo**: cuando el modelo necesita responder preguntas sobre el estado actual del negocio pero no necesita ejecutar queries dinámicas.

**Cómo funciona**:
1. Cada request al chat construye un "snapshot" del negocio con múltiples queries en paralelo (KPIs, alertas, top órdenes con saldo, etc.).
2. El snapshot se inyecta como texto plano al final del system prompt.
3. El modelo lee el snapshot y responde en base a esos datos.
4. Para consultas específicas ("¿cuánto le facturé al cliente X?"), sugiere qué módulo tiene el dato.

**Ventajas vs tool use**:
- Más simple (una sola llamada a la IA).
- Latencia predecible.
- No requiere protocolo de tool use.

**Desventajas**:
- El snapshot puede quedar desactualizado en tiempo real dentro de una misma conversación (rare edge case).
- Limitado a las métricas que el snapshot expone.

---

## Patrón · Command Palette con hotkey global

Introducido en Wave 3 (`components/nav/CommandPalette.tsx`). Búsqueda global desde cualquier pantalla con `Cmd+K` / `Ctrl+K`.

```tsx
// Hotkey handler global
React.useEffect(() => {
  function handler(e: KeyboardEvent) {
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setOpen((v) => !v)
    }
  }
  window.addEventListener("keydown", handler)
  return () => window.removeEventListener("keydown", handler)
}, [])
```

**Reglas**:
- Montado en el layout del dashboard, siempre disponible.
- Radix Dialog para overlay + focus management.
- Debounce del search (200ms) para no golpear la API con cada tecla.
- Navegación con teclado (↑↓ + Enter) — obligatorio para UX de teclado.
- `mouseEnter` en los items también actualiza el índice seleccionado.
- Endpoint API server-side (`/api/search`) para evitar exponer queries directas al cliente.

---

## Patrón · LinkRow para filas clickeables reutilizables

Introducido en Wave 2 (`components/ui/link-row.tsx`). Reemplaza el pattern manual "cursor-pointer + onClick + router.push" en 5+ listas.

```tsx
<LinkRow href={`/clientes/${c.id}`}>
  <TableCell>...</TableCell>
  <TableCell>...</TableCell>
</LinkRow>
```

**Reglas**:
- `<LinkRow>` envuelve `<TableRow>`, hace `router.push` al click.
- Controles interactivos dentro (dropdowns, buttons) deben usar `stopPropagation` para no gatillar navegación.
- Hover cambia sutilmente el background (`hover:bg-tp-surface-mid/30`).
- Cuando hay lógica más compleja en la fila (ej. select de estado inline), NO usar `LinkRow`; usar client component custom (patrón `OrdenListRow`).

---

## Reglas de proceso

1. **`npm run build`** local antes del push (pesca errores de TS/ESLint que Vercel también pescaría).
2. **`npm run dev`** local para probar interactividad (el build NO ejecuta el código).
3. **Preview de Vercel verde antes de mergear** — no mergear "porque el build salió verde"; abrir el preview URL y clickear.
4. **Migración SQL aplicada antes del merge** — Guillermo/Eduardo la corre en el SQL Editor.
5. **Post-migración con CREATE TYPE / CREATE VIEW / ALTER TABLE**: si aparece error "Could not find the table X in the schema cache", correr `NOTIFY pgrst, 'reload schema';` en el SQL Editor. PostgREST puede quedar con la cache vieja.
6. **`mem_save`** después de cada patrón/decisión/gotcha con `project: "tecnopro"`.
7. **Fechas server → client como string ISO** siempre. Ver patrón · TZ safety.
8. **IA siempre con fallback**: cada llamada a Anthropic va con try/catch y fallback a template. Nunca romper el flow del usuario por fallar la IA.

---

## Referencias en engram

Buscar con `mem_search "tecnopro/..."`:

### Setup e hitos
- `tecnopro/kickoff` — setup inicial
- `tecnopro/setup-decisions` — decisiones de arranque
- `tecnopro/fase-*` — hitos por fase
- `tecnopro/ola-c1-caja` · `tecnopro/ola-c2-gastos` · `tecnopro/ola-c3-tesoreria-contabilidad` · `tecnopro/ola-d-mvp-completo`

### Patrones
- `tecnopro/patron-modulo-maestro` — patrón de módulo (Clientes fue el molde)
- `tecnopro/patron-discriminated-union-ok` — result types con `ok: boolean`
- `tecnopro/patron-table-row-clickable` — filas de tabla clickeables
- `tecnopro/patron-rpc-transaccional` — RPC multi-tabla
- `tecnopro/patron-append-only` — movimientos inmutables
- `tecnopro/patron-vista-sql-reporte` — vistas para reporting
- `tecnopro/patron-tz-safety-iso-strings` — fechas server→client
- `tecnopro/patron-csv-bom-excel` — export CSV con BOM

### Decisiones
- `tecnopro/decision-crud-delete-strategy` — soft vs hard delete
- `tecnopro/decision-charts-svg-no-lib` — no meter Recharts en MVP
- `tecnopro/decision-categorias-gasto-configurables` — tabla vs enum

### Gotchas
- `tecnopro/gotcha-server-client-serialization` — íconos como props server→client
- `tecnopro/gotcha-route-groups-collision` — `app/page.tsx` vs `app/(grupo)/page.tsx`
- `tecnopro/gotcha-rls-recursion` — recursión infinita en policies (0003)
- `tecnopro/gotcha-supabase-grants` — GRANTs faltantes (0004)
- `tecnopro/gotcha-ts-as-const-null` — `null as const` inválido
- `tecnopro/gotcha-rsc-event-handlers` — onChange en server component
- `tecnopro/gotcha-vercel-env-vars-build-time` — env vars al deploy
- `tecnopro/gotcha-tz-drift-server-client` — Date server → client rompe navegación
- `tecnopro/gotcha-supabase-column-comparison` — no se pueden comparar dos columnas
- `tecnopro/gotcha-postgrest-schema-cache` — NOTIFY pgrst reload schema post-migración
