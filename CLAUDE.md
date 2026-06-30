# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Qué es TECNOPRO

Sistema de gestión integral para servicio técnico. Cliente: **Guillermo (Onlinebytes)**.

- 14 módulos en MVP: panel, órdenes, clientes, turnos, presupuestos, catálogo, stock, caja, gastos, tesorería, contabilidad básica, analytics, usuarios, configuraciones
- IA integrada con Claude Haiku (mensajes, presupuestos, consultas internas)
- Roles: `admin` (Guillermo) y `tecnico`

Repo público: `edubd4/Tecnopro`. Propietario y mantenedor: Eduardo Barreiro. Cliente toma ownership de Supabase/Vercel en la entrega final.

## Stack

- **Next.js 14** (app dir) + TypeScript strict
- **Supabase** (Postgres + Auth + Storage) — RLS ON desde día 1
- **Tailwind CSS** + Radix + tokens `tp-`
- **Anthropic SDK** (Claude Haiku) para la capa de IA
- **Zod** para validación
- Vercel hosting

## Comandos

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Verificación de tipos + producción
npm run lint
```

Sin test suite. Verificar con `npm run build` antes de cerrar una tarea.

## Arquitectura

### Route groups

- `app/(auth)/` — rutas públicas (login)
- `app/(dashboard)/` — protegido por `middleware.ts` + guard en layout
- `app/api/` — endpoints server-side. Usar `createServiceRoleClient()` solo cuando se necesite bypass de RLS.

### Patrón de fetch

- **Server components** → leen Supabase directo con `createServerClient()`
- **Client components** → llaman API routes internas, nunca tocan Supabase directamente para writes sensibles

### Archivos clave de `lib/`

| Archivo | Para qué |
|---|---|
| `lib/supabase/server.ts` | `createServerClient()` (anon) + `createServiceRoleClient()` (service_role) |
| `lib/supabase/client.ts` | `createClient()` para componentes cliente — solo auth + reads no sensibles |
| `lib/utils.ts` | `cn()`, `formatPesos()` (ARS), `formatFecha()`, `formatFechaHora()` |
| `lib/constants.ts` | TODOS los ENUMs del dominio como `const` tipados |
| `lib/auth-m2m.ts` | `validateApiKey()` para endpoints webhook |

## ENUMs — usar exactamente estos strings

```
rol_usuario:       admin | tecnico
estado_cliente:    ACTIVO | INACTIVO
estado_orden:      RECIBIDA | DIAGNOSTICO | PRESUPUESTADA | EN_REPARACION | LISTA | ENTREGADA | CANCELADA
prioridad_orden:   BAJA | NORMAL | ALTA | URGENTE
estado_presupuesto: BORRADOR | ENVIADO | APROBADO | RECHAZADO | VENCIDO
estado_turno:      PROGRAMADO | EN_CURSO | COMPLETADO | NO_ASISTIO | CANCELADO
categoria_servicio: REPARACION | REDES | ACONDICIONAMIENTO | INSTALACION | DIAGNOSTICO | OTRO
tipo_mov_repuesto: ENTRADA | SALIDA | AJUSTE
tipo_mov_caja:     INGRESO | EGRESO
origen_mov_caja:   COBRO_ORDEN | GASTO | AJUSTE | APERTURA | CIERRE | OTRO
metodo_pago:       EFECTIVO | TRANSFERENCIA | TARJETA_DEBITO | TARJETA_CREDITO | MERCADO_PAGO | OTRO
tipo_evento:       CAMBIO_ESTADO_ORDEN | NUEVO_PRESUPUESTO | CAMBIO_ESTADO_PRESUPUESTO | COBRO | GASTO | TURNO_ASIGNADO | STOCK_MOVIMIENTO | NUEVO_CLIENTE | NOTA | ALERTA | MENSAJE_IA
```

## IDs legibles

Generados en API routes o triggers SQL, no por Supabase.

- Clientes: `CLI-0001`
- Órdenes: `OT-0001`
- Presupuestos: `PRES-0001`
- Equipos: `EQ-0001`
- Repuestos: `REP-0001`
- Turnos: `TRN-0001`
- Movimientos de caja: `MOV-0001`

## Design system

Dark theme por defecto. Tokens Tailwind con prefijo `tp-` (TECNOPRO) — definidos en `tailwind.config.ts` + `app/globals.css`.

| Token | Para qué |
|---|---|
| `tp-bg`, `tp-card`, `tp-input` | Superficies |
| `tp-cyan`, `tp-teal` | Acentos primarios (gradiente cian → teal) |
| `tp-green`, `tp-red`, `tp-amber`, `tp-violet` | Semánticos (ok / error / alerta / IA) |
| `tp-text`, `tp-secondary`, `tp-muted` | Tipografía |
| `tp-surface-{low,mid,high,highest}` | Elevaciones |
| `tp-line`, `tp-line-soft` | Bordes |
| `bg-tp-grad` | Gradiente principal cian→teal |

Fonts: `font-display` (Space Grotesk, titulares) + `font-sans` (Inter, body) + `font-mono` (JetBrains Mono, datos/IDs)

Badge por estado de orden:
- Verde → LISTA / ENTREGADA
- Cyan → RECIBIDA / DIAGNOSTICO
- Amber → EN_REPARACION / PRESUPUESTADA
- Rojo → CANCELADA

## Reglas de seguridad — no romper

1. RLS está habilitado en TODA tabla del schema `public`. Toda tabla nueva tiene que nacer con `enable row level security` y al menos una policy.
2. `SUPABASE_SERVICE_ROLE_KEY` solo server-side (API routes, server components con cuidado). Nunca en client components.
3. `ANTHROPIC_API_KEY` solo server-side. Las llamadas a la IA pasan por una API route propia.
4. `WEBHOOK_API_KEY` se valida con `validateApiKey()` en cada endpoint `app/api/webhook/*`.
5. `historial`: tabla inmutable. INSERT only. UPDATE y DELETE bloqueados con RLS + trigger.
6. Deletes de entidades de negocio (clientes, órdenes, etc.): soft delete (`activo = false`), no `delete from`.
7. Cambios sensibles → siempre insertar en `historial` antes de retornar.

## Convenciones de código

- TypeScript strict — sin `any`
- `async/await` siempre, nunca `.then()`
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`) — sin `Co-Authored-By`
- Sin tests por ahora — verificar con `npm run build` y prueba manual del flujo afectado
- Una feature por commit / por PR

## Roadmap

Ver `docs/ROADMAP.md` (TBD) para el plan en fases. Estado actual: **Fase 1 — Bootstrap**.
