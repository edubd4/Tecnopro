# TECNOPRO — Roadmap técnico

Estado del proyecto y hoja de ruta. Ver también [ESTADO-PROYECTO.md](./ESTADO-PROYECTO.md) para retomar en una nueva sesión, [PATRONES.md](./PATRONES.md) para las convenciones establecidas, y [MANUAL-USUARIO.md](./MANUAL-USUARIO.md) para el uso end-user.

---

## ✅ Fase 0 · Setup de cuentas y repo
- [x] Repo público `edubd4/Tecnopro`
- [x] Cuenta Supabase (proyecto **Onlinebytes**, región São Paulo, RLS auto ON)
- [x] Cuenta Vercel conectada al repo (dominio `tecnopro-flax.vercel.app`)
- [x] Env vars cargadas en Vercel (URL + anon + service_role + APP_NAME + APP_URL)

---

## ✅ Fase 1 · Bootstrap del proyecto
- [x] **1.1** Esqueleto + tooling · Next.js 14 (app dir), TS strict, Tailwind con tokens `tp-*`, ESLint, Zod
- [x] **1.2** Auth real · Login con Supabase Auth, guard de dashboard, logout, primer admin
- [x] **1.3** Shell del dashboard · Sidebar responsive con 5 grupos + 14 items filtrable por rol, drawer mobile
- [x] **1.4** Deploy inicial · Vercel Production en verde

---

## ✅ Fase 2 · Módulos del MVP — COMPLETO

### ✅ Ola A · Maestros (5 módulos)
- [x] **03 · Clientes** — CRUD + búsqueda + soft delete + IDs `CLI-XXXX`
- [x] **06 · Catálogo de servicios** — CRUD + IDs `SRV-XXXX` + categorías
- [x] **07 · Inventario / Stock** — CRUD + IDs `REP-XXXX` + movimientos inmutables ENTRADA/SALIDA/AJUSTE con trigger que actualiza stock atómicamente + alerta stock bajo
- [x] **13 · Usuarios y técnicos** — CRUD + hard delete + cambio de contraseña por admin + self-lock (no podés desactivarte ni sacarte admin)
- [x] **14 · Configuraciones** — form declarativo con 7 campos (nombre negocio, teléfono, dirección, moneda, márgenes, validez presupuesto, ventana alertas)

### ✅ Ola B · Operación (3 módulos)
- [x] **02 · Órdenes de trabajo** — CRUD + estado + asignar técnico + items imputados (servicios + repuestos con movimiento SALIDA automático via RPC transaccional) + cálculo de total + fila clickeable + cambio de estado inline
- [x] **04 · Turnos + Calendario** — CRUD + vista semanal (grilla 7×14 con posición absoluta) + vista lista + navegador de semanas + detección de overlap con `tstzrange && tstzrange`
- [x] **05 · Presupuestos** — CRUD + items (servicios + repuestos con margen sugerido `costo × (1 + m/100)`) + estados (BORRADOR/ENVIADO/APROBADO/RECHAZADO/VENCIDO) + auto-timestamps `enviado_at`/`respondido_at` + generador de mensaje template + copy-to-clipboard + editor manual + congelamiento post-respuesta

### ✅ Ola C · Plata (4 módulos)
- [x] **08 · Caja** — `movimientos_caja` append-only con `MOV-XXXX` + vista `saldo_caja` + RPC `cobrar_orden()` transaccional + integración con ficha de orden (sección `CobrosOrdenSection`) + RLS admin-only
- [x] **09 · Gastos** — `gastos` con `GST-XXXX` + `categorias_gasto` configurable (8 seeds) + RPC `registrar_gasto()` que crea EGRESO en caja en la misma transacción + append-only + filtros por categoría en la lista
- [x] **10 · Tesorería básica** — Vista SQL `ordenes_con_saldo` (total imputado - cobrado = saldo) + 4 tarjetas KPI (por cobrar, ingresos mes, egresos mes, neto) + tabla ordenada por saldo desc
- [x] **11 · Contabilidad básica** — Libro de movimientos con filtros preset mes/año/custom + resumen del período + **export CSV** (API route `/api/contabilidad/csv` con BOM UTF-8 para Excel)

### ✅ Ola D · Visión (3 módulos)
- [x] **01 · Panel principal** — Dual view por rol: admin ve 4 KPIs (saldo, por cobrar, órdenes activas, turnos hoy) + banner de alertas condicional + últimas 5 órdenes + últimos 5 movimientos; técnico ve sus órdenes activas + turnos de hoy
- [x] **12 · Analytics** — 4 charts en SVG/CSS puro sin lib externa: órdenes por estado, órdenes por técnico, ingresos vs egresos 6 meses, top 5 categorías de gasto del mes
- [x] **Alertas del sistema** — 4 secciones (entregas vencidas, saldos con demora > 30d, stock bajo, presupuestos por vencer en 7 días) + empty state verde si todo en orden

---

## ⏳ Fase 3 · IA integrada

Reemplazar templates estáticos por generación con **Claude Haiku** (`claude-haiku-4-5-20251001`). La firma ya está preparada: la función pura `generarMensajePresupuestoTemplate(datos)` se cambia por `generarMensajePresupuestoIA(datos)` sin tocar UI ni actions.

### Setup técnico
- [ ] Agregar `ANTHROPIC_API_KEY` como env var en Vercel (Production + Preview)
- [ ] Crear `app/api/ia/generate/route.ts` con auth check propio (admin/técnico según feature)
- [ ] Agregar `Anthropic` client helper en `lib/anthropic.ts`

### Casos de uso — sub-PRs sugeridos
- [ ] **PR 3.1 · Mensaje de presupuesto** — Swap directo del template. Bajo riesgo (feature ya existente), valida la integración. Rate limit por presupuesto: 1 regeneración cada 30s.
- [ ] **PR 3.2 · Avisos automáticos** — "tu equipo está listo", "demora en repuesto". Trigger desde cambio de estado de orden. Guarda en `historial` con tipo `MENSAJE_IA` + costo_tokens.
- [ ] **PR 3.3 · Consultas internas en NL** — Panel del admin con input "preguntá lo que quieras sobre el negocio". Prompt engineering con contexto de rol + estructura del schema. Retorna texto o tabla según intent.

### Cross-cutting
- [ ] Rate limiting por usuario (por ejemplo, 50 llamadas/día/user)
- [ ] Logging de consumo: campo `costo_tokens` en `historial.payload` para cada `MENSAJE_IA`
- [ ] Panel de admin para ver consumo mensual y por técnico
- [ ] Prompt library en `lib/prompts/` — versionable

Estimado: 2-3 semanas.

---

## ⏳ Fase 4 · Capacitación y prueba real

- [ ] Smoke tests end-to-end (checklists por módulo, no automation por ahora)
- [ ] Capacitación con Guillermo y técnicos (basada en `docs/MANUAL-USUARIO.md`)
- [ ] Período de prueba con datos reales (mínimo 2 semanas)
- [ ] Ajustes según feedback
- [ ] **Entrega final**: transferencia de ownership de Supabase y Vercel a la cuenta de Onlinebytes

---

## 🔵 Fase 5+ · Backlog largo plazo

Para futuras fases comerciales según la propuesta:
- Proveedores y cadena de compra (nueva tabla + relacionar con compras/repuestos)
- Tesorería completa (flujo proyectado, conciliación bancaria)
- Analytics avanzados configurables (dashboards personalizables por Guillo)
- IA con **acciones directas** (asignar turnos, mover órdenes, crear clientes desde NL)
- Integración WhatsApp Business API (envío automático de mensajes)
- Google Calendar / Calendly para turnos
- AFIP / Monotributo / IVA (facturación electrónica)
- App nativa (React Native / Expo)

---

## Backlog acumulado (post-MVP, no bloqueante)

Cosas que quedaron afuera del MVP pero se pueden agregar en cualquier momento:

1. **CRUD de categorías de gasto en UI** — hoy se manejan vía SQL Editor.
2. **Convertir presupuesto aprobado a orden** con arrastre de items (pedido explícito de Guillo).
3. **Vista `/historial`** para el admin.
4. **Filtro por técnico/prioridad en `/ordenes`**.
5. **UX de filas clickeables** en Clientes / Catálogo / Stock / Usuarios / Turnos-lista.
6. **Umbrales de `/alertas` a `configuracion`** (30d saldos, 7d presupuestos hoy hardcoded).
7. **Filtros de fecha en `/caja`**.
8. **"Pagos por vencer" en Tesorería** — requiere tabla de vencimientos.

---

## Base de datos — migraciones aplicadas

| # | Archivo | Contenido |
|---|---|---|
| 0001 | `0001_init.sql` | profiles, configuracion (con seeds), historial (inmutable), trigger auto-profile al registrar user |
| 0002 | `0002_clientes.sql` | clientes con CLI-XXXX |
| 0003 | `0003_fix_rls_recursion.sql` | fix crítico: `current_user_rol()` SECURITY DEFINER para evitar recursión infinita en policies |
| 0004 | `0004_grants.sql` | fix crítico: GRANTs explícitos al rol `authenticated` (proyecto Supabase creado con "auto expose" OFF) |
| 0005 | `0005_catalogo_stock.sql` | servicios, repuestos, repuestos_movimientos + trigger de stock atómico |
| 0006 | `0006_ordenes.sql` | ordenes con OT-XXXX + trigger de fecha_entrega_real |
| 0007 | `0007_orden_items.sql` | orden_servicios, orden_repuestos + RPCs `imputar_repuesto_a_orden` y `desimputar_repuesto_de_orden` |
| 0008 | `0008_turnos.sql` | turnos con TRN-XXXX + RPC `turnos_overlap_for_tecnico` |
| 0009 | `0009_presupuestos.sql` | presupuestos, presupuesto_servicios, presupuesto_repuestos + trigger auto-timestamps |
| 0010 | `0010_caja.sql` | movimientos_caja append-only con MOV-XXXX + vista saldo_caja + RPC cobrar_orden + RLS admin-only |
| 0011 | `0011_gastos.sql` | categorias_gasto (configurable, 8 seeds) + gastos append-only con GST-XXXX + RPC registrar_gasto |
| 0012 | `0012_reporting_views.sql` | vista `ordenes_con_saldo` combinando ordenes + items + cobros |

Sin migraciones para Ola D — todos los módulos son composición de datos existentes.

---

## Convenciones activas

- **Branches**: `feat/<modulo>`, `fix/<descripcion>`, `chore/<tarea>`
- **Commits**: Conventional Commits sin `Co-Authored-By`
- **PRs**: uno por módulo o por sub-fase. NO push directo a main (excepto el bootstrap inicial).
- **Regla de proceso**: `npm run build` + `npm run dev` local antes del push. Preview URL de Vercel verificado antes de mergear.
- **Migraciones SQL**: numeradas, aplicadas manualmente por Guillermo/Eduardo en el SQL Editor de Supabase antes del merge. Post-migración con CREATE TYPE / CREATE VIEW, correr `NOTIFY pgrst, 'reload schema';` si aparece "schema cache" error.
- **Memoria engram**: cada decisión/gotcha/patrón queda con `mem_save` y `project: tecnopro`. Ver [ESTADO-PROYECTO.md](./ESTADO-PROYECTO.md) para levantar contexto en sesión nueva.
- **Fechas server → client como string ISO** (`YYYY-MM-DD`), nunca como objeto `Date`. Reconstruir con `T12:00:00` en client para evitar drift de TZ.
