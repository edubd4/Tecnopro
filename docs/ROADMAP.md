# TECNOPRO — Roadmap técnico

Plan de construcción en fases. Cada fase cierra con commit/PR atómico.

## Fase 0 · Setup de cuentas y repo ✅
*(Manual del usuario)*

- [x] Crear repo público `edubd4/Tecnopro`
- [x] Crear cuenta y proyecto Supabase a nombre del cliente (`São Paulo`, RLS auto ON)
- [x] Crear cuenta Vercel
- [ ] Conectar repo a Vercel (queda para Fase 1 al primer deploy)
- [ ] Anthropic API key (queda para Fase 3)

## Fase 1 · Bootstrap del proyecto 🟢 EN CURSO

Base estructural lista para desarrollar módulos encima.

### 1.1 · Esqueleto + tooling (este commit)
- [x] Estructura Next.js 14 (app dir, route groups `(auth)` / `(dashboard)`)
- [x] TS strict, ESLint, Tailwind, PostCSS, `components.json`
- [x] Tokens de diseño TECNOPRO (`tp-*`) — paleta cyan/teal/ink + tipografías Space Grotesk + Inter + JetBrains Mono
- [x] `lib/supabase/{server,client}.ts`
- [x] `lib/utils.ts` (cn, formatPesos, formatFecha, formatFechaHora)
- [x] `lib/constants.ts` con todos los ENUMs del dominio
- [x] `lib/auth-m2m.ts` para webhooks futuros
- [x] `middleware.ts` con guard de auth
- [x] Landing pública, login placeholder, dashboard placeholder
- [x] Migración inicial Supabase: `profiles`, `configuracion`, `historial` (inmutable) + triggers
- [x] CLAUDE.md, README.md, ROADMAP.md

### 1.2 · Auth real
- [ ] Form de login (`app/(auth)/login`) con Supabase Auth
- [ ] Crear primer admin (Guillermo) en Supabase Auth
- [ ] Componente `<UserMenu>` para logout
- [ ] Endpoint `/api/auth/callback` si hace falta

### 1.3 · Shell del dashboard
- [ ] Sidebar con navegación a los 14 módulos (placeholders)
- [ ] Header con nombre de usuario, rol, switch de tema (opcional fase 2)
- [ ] Layout responsive (mobile-first decente, no perfecto)
- [ ] `components/ui/` con primitivos: Button, Input, Label, Card, Badge, Table, Dialog, DropdownMenu, Toast — copiados/adaptados de Gojulito

### 1.4 · Deploy inicial
- [ ] Vercel conectado al repo, env vars cargadas
- [ ] Preview deployment funcionando
- [ ] Dominio (opcional, si Guillermo decide uno)

---

## Fase 2 · Módulos del MVP

Los 14 módulos en 4 olas. Cada ola es un set de migraciones SQL + rutas + UI.

### Ola A · Maestros
Datos base que el resto consume.

- [ ] **03 · Clientes** — alta, edición, búsqueda, historial por cliente
- [ ] **06 · Catálogo de servicios** — categorías, precio base, tiempo estimado
- [ ] **07 · Inventario / Stock** — repuestos, costo, stock mínimo, movimientos
- [ ] **13 · Usuarios y técnicos** — alta de técnicos, asignación, permisos
- [ ] **14 · Configuraciones** — datos del negocio, márgenes, branding

### Ola B · Operación
Núcleo transaccional.

- [ ] **02 · Órdenes de trabajo** — estado, técnico, repuestos imputados, historial
- [ ] **04 · Turnos + calendario** — vista día/semana/mes, detección de superposición
- [ ] **05 · Presupuestos** — items, márgenes, estado (BORRADOR/ENVIADO/...), validez

### Ola C · Plata
Depende de órdenes y cobros.

- [ ] **08 · Caja** — ingresos, egresos, saldo en vivo, cierre diario
- [ ] **09 · Gastos** — categorías, comprobantes, impacto en resultado
- [ ] **10 · Tesorería básica** — cobros pendientes, pagos a vencer, mes
- [ ] **11 · Contabilidad básica** — libro de ingresos/egresos, exportación CSV

### Ola D · Visión
Lee todo lo anterior.

- [ ] **01 · Panel principal** — KPIs, alertas, turnos del día, caja del día
- [ ] **12 · Analytics** — órdenes por estado/técnico, servicios top, tendencias
- [ ] **Alertas en sistema** — pagos por vencer, entregas próximas, stock bajo, nuevas asignaciones

---

## Fase 3 · IA integrada

Capa de Claude Haiku conectada al sistema.

- [ ] Endpoint `/api/ia/generate` con Anthropic SDK
- [ ] Caso 1 · Mensaje de presupuesto listo para copiar
- [ ] Caso 2 · Redacción del presupuesto a partir de items
- [ ] Caso 3 · Consultas internas en NL ("órdenes que vencen esta semana")
- [ ] Caso 4 · Mensajes de estado y seguimiento
- [ ] Logging del consumo por usuario (para que Guillermo controle costos)
- [ ] Rate limiting básico

---

## Fase 4 · Capacitación y prueba real

- [ ] Smoke tests end-to-end de los flujos críticos
- [ ] Sesión de capacitación con Guillermo y técnicos
- [ ] Período de prueba con datos reales
- [ ] Ajustes según feedback
- [ ] **Entrega final**: transferencia de ownership de Supabase + Vercel a cuenta del cliente

---

## Fase 5+ · Backlog (no se hace ahora)

Para futuras fases comerciales según la propuesta:

- Proveedores y cadena de compra
- Tesorería completa (flujo proyectado, conciliación bancaria)
- Contabilidad ampliada
- Analytics avanzados configurables
- IA con acciones directas (asignar turnos, mover órdenes, crear clientes)
- Integración WhatsApp Business API
- Sincronización con Google Calendar / Calendly
- Integración AFIP / Monotributo / IVA

---

## Convenciones de trabajo

- **Branches**: `feat/<modulo>`, `fix/<descripcion>`, `chore/<tarea>`
- **Commits**: Conventional Commits, sin `Co-Authored-By`
- **PRs**: Un PR por módulo o por sub-fase
- **Migraciones SQL**: Una por módulo o por feature significativa, prefijo numérico (`0002_clientes.sql`)
- **Verify**: `npm run build` + prueba manual del flujo antes de cerrar PR
- **Memoria persistente** (engram): cada decisión arquitectónica o gotcha → `mem_save` con `project: tecnopro`
