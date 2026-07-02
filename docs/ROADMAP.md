# TECNOPRO — Roadmap técnico

Estado del proyecto y hoja de ruta. Ver también [ESTADO-PROYECTO.md](./ESTADO-PROYECTO.md) para retomar en una nueva sesión, y [PATRONES.md](./PATRONES.md) para las convenciones establecidas.

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

## ✅ Fase 2 · Módulos del MVP

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

### ⏳ Ola C · Plata (4 módulos)
- [ ] **08 · Caja** — ingresos y egresos, saldo en vivo, cierre diario con resumen
- [ ] **09 · Gastos** — registro de egresos por categoría con comprobante adjunto
- [ ] **10 · Tesorería básica** — cobros pendientes, pagos por vencer, resumen mensual
- [ ] **11 · Contabilidad básica** — libro de ingresos y egresos, exportación CSV

### ⏳ Ola D · Visión (3 módulos)
- [ ] **01 · Panel principal** — KPIs, alertas del día, turnos, caja, órdenes activas
- [ ] **12 · Analytics** — órdenes por estado/técnico, servicios más vendidos, tendencia mensual
- [ ] **Alertas del sistema** — pagos por vencer, entregas próximas, stock bajo, nuevas asignaciones

---

## ⏳ Fase 3 · IA integrada

Reemplazar `lib/mensaje-presupuesto.ts` con llamadas a Claude Haiku. La firma ya está preparada: la función pura `generarMensajePresupuestoTemplate(datos)` se cambia por `generarMensajePresupuestoIA(datos)` sin tocar UI ni actions.

- [ ] Endpoint `/api/ia/generate` con Anthropic SDK
- [ ] **Caso 1**: Mensaje de presupuesto (reemplaza el template actual)
- [ ] **Caso 2**: Mensajes de estado ("tu equipo está listo", "demora en repuesto")
- [ ] **Caso 3**: Consultas internas en NL ("órdenes que vencen esta semana", "cuánto facturé en redes este mes")
- [ ] Rate limiting + logging de consumo por usuario

---

## ⏳ Fase 4 · Capacitación y prueba real

- [ ] Smoke tests end-to-end
- [ ] Capacitación con Guillermo y técnicos
- [ ] Período de prueba con datos reales
- [ ] Ajustes según feedback
- [ ] **Entrega final**: transferencia de ownership de Supabase y Vercel a la cuenta de Onlinebytes

---

## 🔵 Fase 5+ · Backlog

Para futuras fases comerciales según la propuesta:
- Proveedores y cadena de compra
- Tesorería completa (flujo proyectado, conciliación bancaria)
- Analytics avanzados configurables
- IA con acciones directas (asignar turnos, mover órdenes, crear clientes)
- Integración WhatsApp Business API
- Google Calendar / Calendly
- AFIP / Monotributo / IVA

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

---

## Convenciones activas

- **Branches**: `feat/<modulo>`, `fix/<descripcion>`, `chore/<tarea>`
- **Commits**: Conventional Commits sin `Co-Authored-By`
- **PRs**: uno por módulo o por sub-fase. NO push directo a main (excepto el bootstrap inicial).
- **Regla de proceso**: `npm run build` + `npm run dev` local antes del push. Preview URL de Vercel verificado antes de mergear.
- **Migraciones SQL**: numeradas, aplicadas manualmente por Guillermo/Eduardo en el SQL Editor de Supabase antes del merge.
- **Memoria engram**: cada decisión/gotcha/patrón queda con `mem_save` y `project: tecnopro`. Ver [ESTADO-PROYECTO.md](./ESTADO-PROYECTO.md) para levantar contexto en sesión nueva.
