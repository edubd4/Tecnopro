# TECNOPRO — Estado del proyecto

Documento maestro para **retomar el proyecto en una sesión nueva**. Se actualiza al final de cada sub-fase.

**Última actualización**: cierre de **Wave 3 del audit UX + Fase 3 completa (IA)**. Sistema listo para **Fase 4 · capacitación con Guillermo y entrega final**.

---

## Cómo retomar en una sesión nueva de Claude Code

Cualquier Claude que abra este repo en una sesión limpia debería:

1. **Leer este archivo primero** (`docs/ESTADO-PROYECTO.md`) para tener el contexto.
2. **Levantar memoria persistente**: `mem_search "tecnopro"` — hay observations guardadas con decisiones arquitectónicas, gotchas y patrones (ver lista al final de [PATRONES.md](./PATRONES.md)).
3. **Leer `CLAUDE.md`** en la raíz para las convenciones de código.
4. **Leer `docs/PATRONES.md`** para los patrones establecidos.
5. **Leer `docs/ROADMAP.md`** para saber qué está hecho y qué falta.

Para el manual orientado a usuarios (Guillo y su equipo), ver `docs/MANUAL-USUARIO.md`. Para la propuesta comercial (documento de venta original transformado en snapshot de entrega), ver `Propuesta-TECNOPRO-MVP.html` fuera del repo.

---

## Snapshot del proyecto

### Cliente y contexto de negocio
- **Cliente**: Guillermo (**Onlinebytes**) — servicio técnico
- **Producto**: TECNOPRO — sistema de gestión integral
- **Precio original del MVP**: USD 3.500 · plan de 3 fases (MVP + Fase 2 desarrollo + Fase 3 integraciones)
- **Fases 2 y 3 realizadas** dentro del scope acordado — sin costo extra.
- **Repo**: [edubd4/Tecnopro](https://github.com/edubd4/Tecnopro) (público)
- **Producción**: `tecnopro-flax.vercel.app`
- **Supabase**: proyecto "onlinebytes1" en org "Onlinebytes", región São Paulo

### Stack
- Next.js 14 (app dir) + TypeScript strict
- Supabase Postgres + Auth (RLS ON desde día 1)
- Tailwind CSS con tokens `tp-*` (cyan/teal/ink) + Radix + Zod
- Vercel Production
- **Anthropic SDK (Claude Haiku)** — integrada en 3 casos de uso (Fase 3.1 + 3.2 + 3.3)

### Personas del sistema
- **Eduardo** (`edubd4`) — dev principal, owner del repo, admin en Supabase mientras dure el desarrollo
- **Guillermo** (`onlinebytes1@gmail.com`) — cliente final, admin del sistema. Toma ownership de Supabase/Vercel en la entrega final.
- **Técnicos** — cuentas creadas por Guillermo cuando arranque la operación

---

## Nav actual del sistema (12 items)

Después del rediseño Plata de Wave 1, el nav pasó de 14 a 12 items:

| Grupo | Items |
|---|---|
| **Operación** | Panel · Órdenes · Turnos · Clientes |
| **Comercial** | Presupuestos · Catálogo · Stock |
| **Plata** (admin) | Caja · Contabilidad |
| **Análisis** (admin) | Analytics · Alertas |
| **Sistema** (admin) | Usuarios · Historial · Configuración |

**Nota**: los módulos **Gastos** y **Tesorería** que estaban en el scope original de 14 se absorbieron en Caja y Contabilidad respectivamente. Guillo lo confirmó en el audit UX. Rutas antiguas siguen resolviéndose con redirect 301.

---

## Estado por módulo — **MVP COMPLETO + Wave 1/2/3 + Fase 3 IA COMPLETA ✅**

| Ola | Módulo | Estado | Migración | Nota |
|---|---|---|---|---|
| — | Auth + Dashboard shell | ✅ | 0001 | Login, sidebar filtrado por rol, guard |
| Fase 3 | **Reset password** | ✅ (W3) | — | Link en login → email de Supabase → cambio de password |
| Fase 3 | **Búsqueda global Cmd+K** | ✅ (W3) | — | CommandPalette global, busca en órdenes/presupuestos/clientes |
| A | Clientes | ✅ | 0002 | CRUD + soft delete + CLI-XXXX + fila clickeable (W2) |
| A | Catálogo | ✅ | 0005 | SRV-XXXX + tiempo con unidad min/h/d (W1) + fila clickeable (W2) |
| A | Stock | ✅ | 0005 | REP-XXXX + trigger de stock atómico + alerta + **ComboBox categoría/ubicación** (W1) + **stock inicial en /nuevo** (W1) + **código auto** (W1) |
| A | Usuarios | ✅ | 0001 | Hard delete + self-lock + fila clickeable (W2) |
| A | Configuración | ✅ | 0001 | + CRUD categorías de gasto (W1) + umbrales de alertas configurables (W2) |
| B | Órdenes | ✅ | 0006 + 0007 | Base + items con RPC transaccional + **Aviso automático por cambio de estado (Fase 3.2)** + notas destacadas (W3) |
| B | Turnos | ✅ | 0008 | Vista semanal + overlap + fecha_fin sugerida (W3) + fila clickeable (W2) |
| B | Presupuestos | ✅ | 0009 | Items + margen + **Mensaje con IA (Fase 3.1)** con fallback template |
| C | **Caja** (absorbe Gastos) | ✅ | 0010 + 0011 | Rediseñada W1: 3 pasos ¿entra/sale? → motivo → detalles. \"Gasto (con categoría)\" es una opción interna. |
| C | **Contabilidad** (absorbe Tesorería) | ✅ | 0012 | Pestañas Libro / Por cobrar. Export CSV con BOM UTF-8. |
| D | Panel principal | ✅ | — | Dual view por rol. KPI \"Por cobrar\" apunta a /contabilidad?tab=por-cobrar |
| D | Analytics | ✅ | — | 4 charts en SVG/CSS puro sin lib externa |
| D | Alertas | ✅ | — | Umbrales configurables (W2) |
| Sistema | **Historial** (nuevo W3) | ✅ | — | Vista admin de toda la auditoría con filtros por tipo y entidad |
| Fase 3 | **Chat con IA (drawer flotante)** | ✅ | 0013 + 0014 | Solo admin. Snapshot del negocio en cada request. Multi-turn con Claude Haiku. |

**14/14 módulos del scope MVP** entregados + **Fase 2 (audit UX Wave 1+2+3)** + **Fase 3 (IA completa)**.

---

## Fase 3 · IA — COMPLETA ✅

| Sub-fase | Descripción | Migración | PR |
|---|---|---|---|
| **3.1** ✅ | Mensaje de presupuesto con Claude Haiku + fallback template | — | #20 |
| **3.2** ✅ | Aviso automático al cliente por cambio de estado de orden | 0013 | #25 |
| **3.3** ✅ | Chat NL con drawer flotante (admin-only, solo lectura) | 0014 | #26 |

**Setup requerido**: `ANTHROPIC_API_KEY` en Vercel (Production + Preview). Sin la key, todo funciona con templates estáticos (fallback silencioso).

**Consumo estimado total**: <$1 USD/mes para uso típico (Haiku es muy barato).

---

## Wave 1/2/3 del audit UX/UI — COMPLETO ✅

Ver `docs/AUDIT-UX-2026-07-02.md` para el detalle de los 32 issues detectados.

| Wave | Contenido | PR |
|---|---|---|
| **1** ✅ | NumberInput/MoneyInput + ComboBox + stock inicial + CRUD categorías + **rediseño Plata (Caja+Gastos, Contabilidad+Tesorería)** + tiempo con unidad + código auto | #22, #23 |
| **2** ✅ | Sistema toasts + ConfirmDialog custom + umbrales configurables + filas clickeables faltantes (5 listas) | #24 |
| **3** ✅ | Vista /historial admin + reset password + Cmd+K global + fecha_fin sugerida + notas destacadas | #27 |

**Items del audit que quedan como backlog no-bloqueante** (nada crítico):
- Loading skeletons (M5)
- Formato fecha unificado (M6)
- Mobile responsive de tablas grandes (M7)
- Timeline visual de estados en presupuestos (M14)
- Cosméticos (B1-B5): favicon, empty states unificados

---

## Próximo paso — **Fase 4 · Capacitación y entrega**

El sistema está **listo para probarse en producción con datos reales**.

### Checklist antes de arrancar Fase 4

1. **Env vars en Vercel Production**:
   - ✅ Supabase URL + anon + service_role
   - ✅ APP_NAME + APP_URL
   - ⏳ **`ANTHROPIC_API_KEY`** (necesario para activar Fase 3 IA)
2. **Supabase Auth Redirect URLs**:
   - ⏳ Agregar `https://tecnopro-flax.vercel.app/reset-password` (para reset password de Wave 3)
3. **Aplicar todas las migraciones en SQL Editor** (si alguna quedó pendiente):
   - 0010, 0011, 0012 (Ola C)
   - 0013 (Fase 3.2 aviso automático de orden)
   - 0014 (Fase 3.3 chat con IA)
4. Verificar `NOTIFY pgrst, 'reload schema';` corrido después de las migraciones más recientes.

### Actividades de Fase 4

- [ ] Smoke tests end-to-end (checklists por módulo).
- [ ] Capacitación con Guillermo y técnicos (basada en `docs/MANUAL-USUARIO.md`).
- [ ] Período de prueba con datos reales (mínimo 2 semanas).
- [ ] Ajustes según feedback.
- [ ] **Entrega final**: transferencia de ownership de Supabase y Vercel a la cuenta del cliente.

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
- Env vars cargadas: 5 (Supabase URL + anon + service_role + APP_NAME + APP_URL). Pendiente: `ANTHROPIC_API_KEY`.

### Anthropic
- **API key pendiente** de configurar en Vercel. Sin la key, el sistema funciona con templates estáticos (los 3 casos de IA tienen fallback).

---

## Reglas de proceso aprendidas

1. **`npm run build` local antes del push** — TypeScript strict + ESLint pescan errores que Vercel también pescaría, pero sin round-trip.
2. **`npm run dev` local para verificar interactividad** — el build NO ejecuta el código, no detecta problemas de event handlers en server components ni bugs de UX. Regla nueva post-PR#7.
3. **No mergear hasta ver el preview URL de Vercel funcionando** — regla adoptada tras el PR#7.
4. **Migraciones SQL nuevas se aplican manualmente** en el SQL Editor de Supabase antes del merge.
5. **Un PR por sub-fase** — módulos grandes se parten (Ordenes fue B.1a + B.1b). Para las Waves 1/2/3 se metió todo en un solo PR por wave a pedido del owner para minimizar deploys.
6. **`stopPropagation` en cualquier control dentro de una fila clickeable**.
7. **Post-migración**: `NOTIFY pgrst, 'reload schema';` en el SQL Editor si aparecen errores "Could not find the table X in the schema cache".
8. **Fechas server → client como string ISO `YYYY-MM-DD`**, nunca como `Date` object. TZ drift entre UTC (server Vercel) y AR (client UTC-3) mete off-by-one bugs.
9. **Supabase-js no compara dos columnas de la misma tabla** (ej. `stock_actual <= stock_minimo`). Traer filas y filtrar en JS.
10. **IA con fallback template**: cada caso de uso de IA debe funcionar sin la API key. Try/catch la llamada → fallback template. Nunca romper el flow del usuario por fallar la IA.

---

## PRs mergeados (histórico completo)

| # | Título | Fase |
|---|---|---|
| #1 | feat(auth): login con Supabase + logout + guard del dashboard | 1.2 |
| #2 | feat(dashboard): shell con sidebar + placeholders de los 14 modulos | 1.3 |
| #3 | feat(clientes): modulo completo | 2A |
| #4 | feat(catalogo, stock): modulos completos | 2A |
| #5 | feat(usuarios, configuracion) | 2A |
| #6 | fix(usuarios): quitar update redundante | fix |
| #7 | feat(ordenes): CRUD base (Ola B.1a) | 2B |
| #8 | fix(ordenes): filtro de estado a client | fix |
| #9 | feat(ordenes): items imputados + movimiento SALIDA (Ola B.1b) | 2B |
| #10 | feat(ordenes): fila clickeable + estado inline | UX |
| #11 | feat(turnos): CRUD + vista semana | 2B |
| #12 | feat(presupuestos): modulo completo | 2B |
| #13 | chore(docs): snapshot post-Ola B | docs |
| #14 | feat(caja) + fix(turnos) | 2C.1 + fix |
| #15 | feat(gastos): con RPC transaccional a caja | 2C.2 |
| #16 | feat(tesoreria, contabilidad): vistas de reporting + export CSV | 2C.3 |
| #17 | feat(panel, analytics, alertas): cierre del MVP (Ola D) | 2D |
| #18 | docs: manual de uso end-user | docs |
| #19 | docs: eliminar mención integración WhatsApp | docs |
| #20 | feat(ia): mensaje de presupuesto con Claude Haiku | **3.1** |
| #21 | chore(docs): audit UX/UI + roadmap fixes | docs |
| #22 | feat(ui): NumberInput con formato es-AR | W1.1 |
| #23 | feat(ux): Wave 1 completa | **W1** |
| #24 | feat(ux): Wave 2 completa | **W2** |
| #25 | feat(ia): avisos automaticos por cambio de estado | **3.2** |
| #26 | feat(ia): chat con drawer flotante para consultas NL | **3.3** |
| #27 | feat(ux): Wave 3 completa | **W3** |

---

## Backlog acumulado (post-MVP, no bloqueante)

1. **Loading skeletons** con `<Suspense>` — pulido, mejora percepción de velocidad.
2. **Formato de fecha unificado** — auditoría de que todas las tablas usen `formatFecha`/`formatFechaHora`.
3. **Mobile responsive de tablas grandes** — convertir a card view en breakpoint móvil.
4. **Timeline visual de estados en presupuestos** — stepper para BORRADOR → ENVIADO → APROBADO.
5. **Convertir presupuesto aprobado a orden** con arrastre de items (pedido explícito de Guillo).
6. **Filtros por técnico/prioridad en `/ordenes`**.
7. **Cosméticos**: favicon custom TECNOPRO, empty states unificados en tono.
8. **Tool use de Anthropic en el chat** (Fase 3.3.1) — permitir que el modelo consulte DB en vivo en vez de solo leer snapshot.
9. **Historial de consumo de IA** en `/configuracion` o `/historial` — visualización de tokens usados por mes.

Nada bloqueante para arrancar la operación.

---

**Fin del snapshot.** Ver [ROADMAP.md](./ROADMAP.md) para vista de tareas por fase, [PATRONES.md](./PATRONES.md) para convenciones de código, [MANUAL-USUARIO.md](./MANUAL-USUARIO.md) para uso end-user, y [AUDIT-UX-2026-07-02.md](./AUDIT-UX-2026-07-02.md) para el audit UX/UI completo.
