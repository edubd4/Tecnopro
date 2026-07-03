# TECNOPRO — Roadmap técnico

Estado del proyecto y hoja de ruta. Ver también [ESTADO-PROYECTO.md](./ESTADO-PROYECTO.md) para retomar en una nueva sesión, [PATRONES.md](./PATRONES.md) para las convenciones establecidas, y [MANUAL-USUARIO.md](./MANUAL-USUARIO.md) para el uso end-user.

---

## ✅ Fase 0 · Setup de cuentas y repo
- [x] Repo público `edubd4/Tecnopro`
- [x] Cuenta Supabase (proyecto **Onlinebytes**, región São Paulo, RLS auto ON)
- [x] Cuenta Vercel conectada al repo (dominio `tecnopro-flax.vercel.app`)
- [x] Env vars cargadas en Vercel (URL + anon + service_role + APP_NAME + APP_URL)
- [ ] **`ANTHROPIC_API_KEY`** pendiente en Vercel (Production + Preview) — necesario para activar la IA de Fase 3

---

## ✅ Fase 1 · Bootstrap del proyecto
- [x] **1.1** Esqueleto + tooling · Next.js 14 (app dir), TS strict, Tailwind con tokens `tp-*`, ESLint, Zod
- [x] **1.2** Auth real · Login con Supabase Auth, guard de dashboard, logout, primer admin
- [x] **1.3** Shell del dashboard · Sidebar responsive con 5 grupos + 12 items filtrable por rol, drawer mobile
- [x] **1.4** Deploy inicial · Vercel Production en verde

---

## ✅ Fase 2 · Módulos del MVP + Waves de UX — COMPLETO

### ✅ Ola A · Maestros (5 módulos)
- [x] **03 · Clientes** — CRUD + búsqueda + soft delete + IDs `CLI-XXXX`
- [x] **06 · Catálogo de servicios** — CRUD + IDs `SRV-XXXX` + categorías + **tiempo con unidad min/h/d (Wave 1)**
- [x] **07 · Inventario / Stock** — CRUD + IDs `REP-XXXX` + movimientos inmutables + trigger de stock atómico + alerta + **ComboBox categoría/ubicación (Wave 1)** + **stock inicial en /nuevo (Wave 1)** + **código auto (Wave 1)**
- [x] **13 · Usuarios y técnicos** — CRUD + hard delete + cambio de contraseña + self-lock
- [x] **14 · Configuraciones** — 7 campos declarativos + **umbrales de alertas configurables (Wave 2)** + **CRUD categorías de gasto (Wave 1)**

### ✅ Ola B · Operación (3 módulos)
- [x] **02 · Órdenes de trabajo** — CRUD + estado + asignar técnico + items imputados con RPC transaccional + fila clickeable + **Aviso automático por cambio de estado (Fase 3.2)** + **notas destacadas (Wave 3)**
- [x] **04 · Turnos + Calendario** — CRUD + vista semanal + vista lista + navegador de semanas + detección de overlap + **fecha_fin sugerida (Wave 3)**
- [x] **05 · Presupuestos** — CRUD + items con margen sugerido + estados con auto-timestamps + **Mensaje generado con IA / fallback template (Fase 3.1)**

### ✅ Ola C · Plata — REDISEÑADA (Wave 1: de 4 a 2 módulos)
- [x] **08 · Caja** (absorbe Gastos) — `movimientos_caja` append-only + vista `saldo_caja` + RPC `cobrar_orden()` + **MovimientoForm rediseñado en 3 pasos: ¿entra/sale? → motivo → detalles**. \"Gasto (con categoría)\" es una opción interna que llama al RPC `registrar_gasto`. RLS admin-only.
- [x] **11 · Contabilidad** (absorbe Tesorería) — Pestañas **Libro** y **Por cobrar**. Vista SQL `ordenes_con_saldo` + export CSV con BOM UTF-8. Redirects 301 desde `/gastos` y `/tesoreria`.

### ✅ Ola D · Visión (3 módulos)
- [x] **01 · Panel principal** — Dual view por rol: admin ve 4 KPIs + banner de alertas + últimas 5 órdenes + últimos 5 movimientos; técnico ve sus órdenes activas + turnos de hoy
- [x] **12 · Analytics** — 4 charts en SVG/CSS puro
- [x] **Alertas del sistema** — 4 secciones (entregas vencidas, saldos con demora, stock bajo, presupuestos por vencer) + empty state verde + **umbrales configurables (Wave 2)**

### ✅ Wave 1 · Fundamentos de UX (PR#22 + #23)
- [x] **NumberInput / MoneyInput** con formato es-AR (separador de miles, decimal). Aplicado en 11 forms.
- [x] **ComboBox** con autocompletado desde existentes + \"Crear nueva\".
- [x] **Stock inicial** en `/stock/nuevo` (opción \"no afecta caja\").
- [x] **CRUD categorías de gasto** en `/configuracion/categorias-gasto`.
- [x] **Rediseño Plata**: Caja absorbe Gastos, Contabilidad absorbe Tesorería.
- [x] **Código auto** en repuesto (fallback a `id_publico` si vacío).
- [x] **Tiempo con unidad** min/h/d en Catálogo.

### ✅ Wave 2 · Feedback y confirmaciones (PR#24)
- [x] Sistema custom de **toasts** (`components/ui/toast.tsx`).
- [x] **ConfirmDialog** con Radix AlertDialog (`useConfirm()` retorna `Promise<boolean>`).
- [x] 15 usos de `alert()` / `window.confirm()` reemplazados.
- [x] `toast.success` contextual en cada acción exitosa.
- [x] **Umbrales configurables**: 2 campos nuevos en config (`alerta_saldo_vencido_dias`, `alerta_presupuesto_por_vencer_dias`). Sin migración SQL.
- [x] **Filas clickeables** faltantes en 5 listas (Clientes, Catálogo, Stock, Usuarios, Turnos-lista).

### ✅ Wave 3 · Pulido final (PR#27)
- [x] **Vista `/historial` admin** — auditoría completa con filtros por tipo y entidad, paginación.
- [x] **Reset password** — link en login, `/olvide-contrasena` + `/reset-password` con Supabase Auth nativo.
- [x] **Búsqueda global Cmd+K** — `CommandPalette` con hotkey global, busca en órdenes/presupuestos/clientes.
- [x] **fecha_fin sugerida** en TurnoForm (inicio + 1h).
- [x] **Notas internas destacadas** en ficha de orden (borde amber + label \"No visibles al cliente\").

---

## ✅ Fase 3 · IA integrada — COMPLETA

Integración con **Claude Haiku** (`claude-haiku-4-5-20251001`) vía Anthropic SDK. Todos los casos con **fallback silencioso al template** si no hay `ANTHROPIC_API_KEY`.

- [x] **PR 3.1 · Mensaje de presupuesto** (PR#20) — `lib/mensaje-presupuesto.ts` con `generarMensajePresupuestoIA()`. System prompt fijo (rioplatense, no inventar precios, max 15 líneas). Historial con `payload.source` + tokens + model.
- [x] **PR 3.2 · Avisos automáticos por cambio de estado** (PR#25) — Migración 0013 con `mensaje_estado_generado` y `mensaje_estado_para` en `ordenes`. 5 estados generan aviso: RECIBIDA, DIAGNOSTICO, PRESUPUESTADA, EN_REPARACION, LISTA. `AvisoOrdenSection` con botón Copiar + Regenerar.
- [x] **PR 3.3 · Chat NL con drawer flotante** (PR#26) — Migración 0014 con `chat_conversaciones` y `chat_mensajes` (inmutable). Admin-only. Snapshot del negocio en cada request. Multi-turn con hasta 40 mensajes. `llamarAnthropicMulti()` para historial.

### Setup técnico requerido
- [ ] Agregar `ANTHROPIC_API_KEY` como env var en Vercel (Production + Preview).
- [ ] Aplicar migraciones **0013** y **0014** en el SQL Editor.
- [ ] Correr `NOTIFY pgrst, 'reload schema';` post-migración si aparecen errores \"schema cache\".

**Consumo estimado total**: < USD 1 / mes para uso típico. Claude Haiku es muy barato.

---

## ⏳ Fase 4 · Capacitación y prueba real

Última fase antes de la entrega definitiva.

- [ ] Smoke tests end-to-end (checklists por módulo, no automation por ahora)
- [ ] Capacitación con Guillermo y técnicos (basada en `docs/MANUAL-USUARIO.md`)
- [ ] Período de prueba con datos reales (mínimo 2 semanas)
- [ ] Ajustes según feedback
- [ ] **Entrega final**: transferencia de ownership de Supabase y Vercel a la cuenta de Onlinebytes

---

## 🔵 Fase 5+ · Backlog largo plazo

Para futuras fases comerciales según feedback real de uso:
- **Proveedores** y cadena de compra (nueva tabla + relacionar con compras/repuestos)
- **Tesorería completa** (flujo proyectado, conciliación bancaria)
- **Analytics avanzados** configurables (dashboards personalizables por Guillo)
- **IA con acciones directas** (asignar turnos, mover órdenes, crear clientes desde NL) — actualmente el chat es solo lectura
- Tool use de Anthropic en el chat (permitir queries en vivo a la DB)
- Sincronización con **Google Calendar / Calendly** para turnos
- **AFIP / Monotributo / IVA** (facturación electrónica)
- App nativa (React Native / Expo)

---

## Backlog acumulado (post-Wave 3, no bloqueante)

Cosas del audit UX que quedaron afuera de las Waves. Todo cosmético / no bloqueante:

1. **Loading skeletons** con Suspense (M5)
2. **Formato de fecha unificado** — auditoría (M6)
3. **Mobile responsive de tablas grandes** — card view en breakpoint (M7)
4. **Timeline visual de estados en presupuestos** (M14)
5. **Convertir presupuesto aprobado a orden** con arrastre de items (pedido de Guillo, no en audit)
6. **Filtros por técnico/prioridad en `/ordenes`**
7. **Cosméticos**: favicon custom, empty states unificados en tono

---

## Base de datos — migraciones aplicadas

| # | Archivo | Contenido |
|---|---|---|
| 0001 | `0001_init.sql` | profiles, configuracion (con seeds), historial (inmutable), trigger auto-profile al registrar user |
| 0002 | `0002_clientes.sql` | clientes con CLI-XXXX |
| 0003 | `0003_fix_rls_recursion.sql` | fix crítico: `current_user_rol()` SECURITY DEFINER para evitar recursión infinita en policies |
| 0004 | `0004_grants.sql` | fix crítico: GRANTs explícitos al rol `authenticated` |
| 0005 | `0005_catalogo_stock.sql` | servicios, repuestos, repuestos_movimientos + trigger de stock atómico |
| 0006 | `0006_ordenes.sql` | ordenes con OT-XXXX + trigger de fecha_entrega_real |
| 0007 | `0007_orden_items.sql` | orden_servicios, orden_repuestos + RPCs `imputar_repuesto_a_orden` y `desimputar_repuesto_de_orden` |
| 0008 | `0008_turnos.sql` | turnos con TRN-XXXX + RPC `turnos_overlap_for_tecnico` |
| 0009 | `0009_presupuestos.sql` | presupuestos, presupuesto_servicios, presupuesto_repuestos + trigger auto-timestamps |
| 0010 | `0010_caja.sql` | movimientos_caja append-only con MOV-XXXX + vista saldo_caja + RPC cobrar_orden + RLS admin-only |
| 0011 | `0011_gastos.sql` | categorias_gasto (configurable, 8 seeds) + gastos append-only con GST-XXXX + RPC registrar_gasto |
| 0012 | `0012_reporting_views.sql` | vista `ordenes_con_saldo` combinando ordenes + items + cobros |
| **0013** | `0013_orden_aviso.sql` | (Fase 3.2) columnas `mensaje_estado_generado` y `mensaje_estado_para` en `ordenes` |
| **0014** | `0014_chat_ia.sql` | (Fase 3.3) tablas `chat_conversaciones` y `chat_mensajes` (inmutable) con RLS admin-only owner |

---

## Convenciones activas

- **Branches**: `feat/<modulo>`, `fix/<descripcion>`, `chore/<tarea>`
- **Commits**: Conventional Commits sin `Co-Authored-By`
- **PRs**: uno por módulo o por sub-fase. Waves 1/2/3 en un solo PR por wave (decisión del owner para minimizar deploys).
- **Regla de proceso**: `npm run build` + `npm run dev` local antes del push. Preview URL de Vercel verificado antes de mergear.
- **Migraciones SQL**: numeradas, aplicadas manualmente por Guillermo/Eduardo en el SQL Editor antes del merge. Post-migración con CREATE TYPE / CREATE VIEW / ALTER TABLE, correr `NOTIFY pgrst, 'reload schema';` si aparece \"schema cache\" error.
- **Memoria engram**: cada decisión/gotcha/patrón queda con `mem_save` y `project: tecnopro`.
- **Fechas server → client como string ISO** (`YYYY-MM-DD`), nunca como objeto `Date`. Reconstruir con `T12:00:00` en client para evitar drift de TZ.
- **IA con fallback**: cada llamada a Anthropic va con try/catch y fallback a template estático. Nunca romper el flow del usuario por fallar la IA.
