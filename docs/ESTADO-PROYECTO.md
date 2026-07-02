# TECNOPRO — Estado del proyecto

Documento maestro para **retomar el proyecto en una sesión nueva**. Se actualiza al final de cada sub-fase.

**Última actualización**: cierre de Ola B (Órdenes + Turnos + Presupuestos)

---

## Cómo retomar en una sesión nueva de Claude Code

Cualquier Claude que abra este repo en una sesión limpia debería:

1. **Leer este archivo primero** (`docs/ESTADO-PROYECTO.md`) para tener el contexto.
2. **Levantar memoria persistente**: `mem_search "tecnopro"` — hay ~20 observations guardadas con decisiones arquitectónicas, gotchas y patrones.
3. **Leer `CLAUDE.md`** en la raíz para las convenciones de código.
4. **Leer `docs/PATRONES.md`** para los patrones establecidos.
5. **Leer `docs/ROADMAP.md`** para saber qué está hecho y qué falta.

Si Eduardo dice "seguí con TECNOPRO", empezar por los pasos de arriba.

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
- Anthropic SDK (Claude Haiku) — Fase 3, aún no integrado

### Personas del sistema
- **Eduardo** (`edubd4`) — dev principal, owner del repo, admin en Supabase mientras dure el desarrollo
- **Guillermo** (`onlinebytes1@gmail.com`) — cliente final, admin del sistema. Toma ownership de Supabase/Vercel en la entrega final.
- **Técnicos** — cuentas creadas por Guillermo cuando arranque la operación

---

## Estado por módulo

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
| C | Caja | ⏳ | — | Ingresos/egresos, saldo, cierre diario |
| C | Gastos | ⏳ | — | Egresos por categoría con comprobante |
| C | Tesorería | ⏳ | — | Cobros pendientes, pagos por vencer |
| C | Contabilidad | ⏳ | — | Libro + exportación CSV |
| D | Panel principal | ⏳ | — | KPIs, alertas, resumen del día |
| D | Analytics | ⏳ | — | Órdenes por estado/técnico, tendencias |
| D | Alertas | ⏳ | — | Pagos, entregas, stock bajo |

**14/14 módulos del MVP** — 9 listos, 5 pendientes (Ola C + Ola D).

---

## Próximo paso — dónde arrancar

**Ola C · Plata** — 4 módulos que Guillermo va a usar todo el día:

1. **Caja**: ingresos por cobro de órdenes + egresos varios, saldo en vivo, cierre diario. Tabla `movimientos_caja` con `tipo` (INGRESO/EGRESO), `origen` (COBRO_ORDEN/GASTO/AJUSTE/APERTURA/CIERRE/OTRO), `metodo_pago`, `orden_id` opcional. Los movimientos son inmutables (patrón historial).

2. **Gastos**: entidad separada con categorías configurables + adjunto de comprobante (Supabase Storage). Cada gasto genera un `movimiento_caja` de tipo EGRESO automáticamente.

3. **Tesorería básica**: NO es una tabla nueva. Vista compuesta que muestra:
   - Órdenes con cobro pendiente (leyendo `ordenes` + suma de items)
   - Pagos a vencer en los próximos N días (`stock_alerta_dias` de config)
   - Resumen mensual de ingresos vs egresos

4. **Contabilidad básica**: reporte + exportación CSV del libro de ingresos/egresos.

### Sugerencia de PRs para Ola C

- **PR 2C.1** — Caja (tabla + actions + UI). Se conecta con órdenes: al cobrar una orden APROBADA, se crea el ingreso.
- **PR 2C.2** — Gastos (tabla + categorías configurables + adjunto). Cada gasto crea egreso en caja.
- **PR 2C.3** — Tesorería + Contabilidad (vistas + exportación). Sin tablas nuevas.

Estimado: ~3 PRs, similar a Ola A.

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

---

## Backlog capturado del feedback del usuario

- **UX de filas clickeables**: aplicado en Órdenes (PR#10) y Presupuestos (PR#12). Pendiente aplicar a Clientes, Catálogo, Stock, Usuarios, Turnos (lista).
- **Vista `/historial`** para el admin (ver todos los eventos loguéados sin ir al SQL Editor).
- **Filtro por técnico/prioridad** en la lista de órdenes.
- **Convertir presupuesto aprobado a orden** (o pasar los items directo).

---

**Fin del snapshot.** Ver [ROADMAP.md](./ROADMAP.md) para la vista de tareas y [PATRONES.md](./PATRONES.md) para las convenciones de código.
