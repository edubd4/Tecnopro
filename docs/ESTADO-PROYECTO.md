# TECNOPRO — Estado del proyecto

Documento maestro para **retomar el proyecto en una sesión nueva**. Se actualiza al final de cada sub-fase.

**Última actualización**: cierre del **MVP completo** (Fase 2 · Olas A + B + C + D). 14/14 módulos entregados. Próximo paso: **Fase 3 · IA integrada**.

---

## Cómo retomar en una sesión nueva de Claude Code

Cualquier Claude que abra este repo en una sesión limpia debería:

1. **Leer este archivo primero** (`docs/ESTADO-PROYECTO.md`) para tener el contexto.
2. **Levantar memoria persistente**: `mem_search "tecnopro"` — hay observations guardadas con decisiones arquitectónicas, gotchas y patrones (ver lista al final de [PATRONES.md](./PATRONES.md)).
3. **Leer `CLAUDE.md`** en la raíz para las convenciones de código.
4. **Leer `docs/PATRONES.md`** para los patrones establecidos.
5. **Leer `docs/ROADMAP.md`** para saber qué está hecho y qué falta.

Si Eduardo dice "seguí con TECNOPRO", empezar por los pasos de arriba.

Para el manual orientado a usuarios (Guillo y su equipo), ver `docs/MANUAL-USUARIO.md`.

---

## Snapshot del proyecto

### Cliente y contexto de negocio
- **Cliente**: Guillermo (**Onlinebytes**) — servicio técnico
- **Producto**: TECNOPRO — sistema de gestión integral
- **Precio MVP**: USD 3.500 · plan de 3 fases (MVP + Fase 2 desarrollo + Fase 3 integraciones)
- **Repo**: [edubd4/Tecnopro](https://github.com/edubd4/Tecnopro) (público)
- **Producción**: `tecnopro-flax.vercel.app`
- **Supabase**: proyecto "onlinebytes1" en org "Onlinebytes", región São Paulo

### Stack
- Next.js 14 (app dir) + TypeScript strict
- Supabase Postgres + Auth (RLS ON desde día 1)
- Tailwind CSS con tokens `tp-*` (cyan/teal/ink) + Radix + Zod
- Vercel Production
- Anthropic SDK (Claude Haiku) — **Fase 3, aún no integrado**

### Personas del sistema
- **Eduardo** (`edubd4`) — dev principal, owner del repo, admin en Supabase mientras dure el desarrollo
- **Guillermo** (`onlinebytes1@gmail.com`) — cliente final, admin del sistema. Toma ownership de Supabase/Vercel en la entrega final.
- **Técnicos** — cuentas creadas por Guillermo cuando arranque la operación

---

## Estado por módulo — **MVP COMPLETO ✅**

| Ola | Módulo | Estado | Migración | Nota |
|---|---|---|---|---|
| — | Auth + Dashboard shell | ✅ | 0001 | Login, sidebar filtrado por rol, guard |
| A | Clientes | ✅ | 0002 | CRUD + soft delete + CLI-XXXX |
| A | Catálogo | ✅ | 0005 | SRV-XXXX |
| A | Stock | ✅ | 0005 | REP-XXXX + trigger de stock atómico + alerta |
| A | Usuarios | ✅ | 0001 | Hard delete + self-lock |
| A | Configuración | ✅ | 0001 | 7 campos declarativos leídos por otros módulos |
| B | Órdenes | ✅ | 0006 + 0007 | Base + items con RPC transaccional stock+orden |
| B | Turnos | ✅ | 0008 | Vista semanal + overlap detection (tstzrange) |
| B | Presupuestos | ✅ | 0009 | Items + margen sugerido + mensaje template (firma preparada para IA) |
| C | Caja | ✅ | 0010 | Movimientos inmutables + saldo view + RPC cobrar_orden |
| C | Gastos | ✅ | 0011 | Categorías configurables + RPC registrar_gasto (crea EGRESO en caja) |
| C | Tesorería | ✅ | 0012 (view) | Vista `ordenes_con_saldo` + resumen mensual |
| C | Contabilidad | ✅ | — | Libro filtrable + export CSV con BOM UTF-8 |
| D | Panel principal | ✅ | — | KPIs con dual view admin/técnico |
| D | Analytics | ✅ | — | 4 charts en SVG/CSS puro sin lib externa |
| D | Alertas | ✅ | — | 4 secciones (entregas, saldos, stock, presupuestos) |

**14/14 módulos del MVP** — todos entregados.

---

## Próximo paso — **Fase 3 · IA integrada**

### Alcance de Fase 3

Reemplazar templates estáticos por generación con **Claude Haiku** vía Anthropic SDK. Tres casos de uso principales:

1. **Mensaje de presupuesto** — reemplaza `generarMensajePresupuestoTemplate` en `lib/mensaje-presupuesto.ts`. El swap ya está preparado (firma async lista para cambiar solo la implementación).
2. **Avisos automáticos a clientes** — "tu equipo está listo", "demora en repuesto", "presupuesto por vencer". Se dispara desde cambios de estado.
3. **Consultas internas en NL** — "órdenes que vencen esta semana", "cuánto facturé en redes este mes". Un input en el panel que devuelve respuestas contextualizadas.

### Setup técnico requerido

1. **API Key**: agregar `ANTHROPIC_API_KEY` como env var en Vercel (Production + Preview).
2. **Endpoint API**: crear `app/api/ia/generate/route.ts` con auth check propio (nunca desde client component).
3. **Rate limiting**: por usuario, para evitar sorpresas de facturación.
4. **Logging de consumo**: agregar campo `costo_tokens` al `historial` (payload) para trackear uso por usuario.

### Sugerencia de PRs para Fase 3

- **PR 3.1** — Endpoint `/api/ia/generate` con Anthropic SDK + swap de mensaje de presupuesto. Es el uso más simple y ya está preparado. Ideal para validar la conexión y el flujo.
- **PR 3.2** — Avisos de estado. Trigger desde cambio de estado de orden.
- **PR 3.3** — Consultas en NL. Requiere prompt engineering con contexto del user y de la DB.

Estimado: 2-3 semanas de trabajo. Requiere validación de consumo/costo con Guillo.

---

## Preparado para Fase 3 · IA

**El swap para Claude Haiku ya está preparado**. Ver `lib/mensaje-presupuesto.ts`:

```ts
// Fase 2 actual — template sincrónico
export function generarMensajePresupuestoTemplate(d: DatosMensajePresupuesto): string { ... }

// Fase 3 — reemplazo directo con IA
export async function generarMensajePresupuestoIA(d: DatosMensajePresupuesto): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(d) }],
  })
  return extractText(response)
}
```

El action `generarMensajeAutomatico` cambia solo la función que llama. UI cero cambios.

---

## Fase 4 · Capacitación y entrega

Después de Fase 3:

1. Smoke tests end-to-end
2. Capacitación con Guillermo y técnicos
3. Período de prueba con datos reales
4. Ajustes según feedback
5. **Entrega final**: transferencia de ownership de Supabase y Vercel a la cuenta del cliente

---

## Cuentas y credenciales (referencia)

### GitHub
- Owner del repo: `edubd4`
- Autor de commits configurado: `edubd4 <eduardo.barreiro93@gmail.com>` (config local del repo, no global)

### Supabase
- Org: **Onlinebytes**
- Proyecto: `onlinebytes1` (ID `lqrrlzfntjubfkfjdjbl`)
- Región: São Paulo
- Owner: cuenta con email del cliente. Eduardo tiene acceso mientras dure el desarrollo.

### Vercel
- Team/Org: **onlinebytes**
- Proyecto: `tecnopro`
- Dominio: `tecnopro-flax.vercel.app`
- Owner: `onlinebytes1-1961` (Vercel account del cliente)
- Env vars cargadas: 5 (Supabase URL + anon + service_role + APP_NAME + APP_URL)

### Anthropic
- **Aún no configurado**. En Fase 3 se agrega `ANTHROPIC_API_KEY` como env var en Vercel.

---

## Reglas de proceso aprendidas

1. **`npm run build` local antes del push** — TypeScript strict + ESLint pescan errores que Vercel también pescaría, pero sin round-trip.
2. **`npm run dev` local para verificar interactividad** — el build NO ejecuta el código, no detecta problemas de event handlers en server components ni bugs de UX. Regla nueva post-PR#7.
3. **No mergear hasta ver el preview URL de Vercel funcionando** — regla adoptada tras el PR#7 donde mergeamos con bug del onChange.
4. **Migraciones SQL nuevas se aplican manualmente** en el SQL Editor de Supabase antes del merge (o inmediatamente después). No hay CI que las aplique automáticamente todavía.
5. **Un PR por sub-fase** — módulos grandes se parten (Ordenes fue B.1a + B.1b, por ejemplo).
6. **`stopPropagation` en cualquier control dentro de una `<TableRow>` clickeable**.
7. **Post-migración: `NOTIFY pgrst, 'reload schema';`** en el SQL Editor si aparecen errores "Could not find the table X in the schema cache". PostgREST puede quedar con la cache vieja después de un CREATE TYPE o CREATE VIEW.
8. **Fechas server → client como string ISO `YYYY-MM-DD`**, nunca como `Date` object. TZ drift entre UTC (server Vercel) y AR (client UTC-3) mete off-by-one bugs. Reconstruir con `T12:00:00` en client para dar margen.
9. **Supabase-js no compara dos columnas de la misma tabla** (ej. `stock_actual <= stock_minimo`). Traer filas relevantes y filtrar en JS, o crear vista SQL si el volumen lo justifica.

---

## PRs mergeados (histórico)

| # | Título | Ola |
|---|---|---|
| #1 | feat(auth): login con Supabase + logout + guard del dashboard | 1.2 |
| #2 | feat(dashboard): shell con sidebar + placeholders de los 14 modulos | 1.3 |
| #3 | feat(clientes): modulo completo (CRUD + busqueda + auditoria) | 2A |
| #4 | feat(catalogo, stock): modulos completos con CRUD + movimientos de stock | 2A |
| #5 | feat(usuarios, configuracion): alta de usuarios y edicion de config del negocio | 2A |
| #6 | fix(usuarios): quitar update redundante + agregar delete real | fix |
| #7 | feat(ordenes): CRUD base (Ola B.1a) | 2B |
| #8 | fix(ordenes): mover filtro de estado a client component | fix |
| #9 | feat(ordenes): items imputados + movimiento SALIDA automatico (Ola B.1b) | 2B |
| #10 | feat(ordenes): fila clickeable + cambio de estado inline + link al cliente | UX |
| #11 | feat(turnos): CRUD + vista semana + deteccion de superposiciones (Ola B.2) | 2B |
| #12 | feat(presupuestos): modulo completo con margen, estados y mensaje template (Ola B.3) | 2B |
| #13 | chore(docs): snapshot de estado + patrones consolidados post-Ola B | docs |
| #14 | feat(caja) + fix(turnos): modulo Caja + fix navegador de semana por drift de TZ | 2C.1 + fix |
| #15 | feat(gastos): modulo Gastos con RPC transaccional a caja (Ola C.2) | 2C.2 |
| #16 | feat(tesoreria, contabilidad): vistas de reporting + export CSV (Ola C.3) | 2C.3 |
| #17 | feat(panel, analytics, alertas): cierre del MVP (Ola D) | 2D |

---

## Backlog acumulado (post-MVP, no bloqueante)

Ordenado por prioridad relativa según valor para Guillo:

1. **CRUD de categorías de gasto en UI** — por ahora se gestionan vía SQL Editor. Bajo impacto porque los 8 seeds cubren casi todo, pero es una asimetría del sistema.
2. **Convertir presupuesto aprobado a orden** — con arrastre de items. Pedido explícito de Guillo, ahorra doble carga.
3. **Vista `/historial`** para el admin — hoy la tabla `historial` está poblada pero solo se ve desde SQL Editor.
4. **Filtro por técnico/prioridad en `/ordenes`** — la lista actualmente solo filtra por estado.
5. **UX de filas clickeables** — aplicado en Órdenes y Presupuestos. Falta en Clientes, Catálogo, Stock, Usuarios, Turnos (lista).
6. **Umbrales de `/alertas` a `configuracion`** — 30d saldos y 7d presupuestos están hardcoded como constants.
7. **Comprobantes de gastos** — Fase 3 con Supabase Storage.
8. **"Pagos por vencer" en Tesorería** — requiere tabla de vencimientos que no está en el MVP.
9. **Filtros de fecha en `/caja`** — hoy trae últimos 200.

---

**Fin del snapshot.** Ver [ROADMAP.md](./ROADMAP.md) para la vista de tareas y fases y [PATRONES.md](./PATRONES.md) para las convenciones de código. Para uso end-user, ver [MANUAL-USUARIO.md](./MANUAL-USUARIO.md).
