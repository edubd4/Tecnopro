# TECNOPRO

> Sistema de gestión integral para servicio técnico. MVP con IA integrada.

Sistema a medida para **Onlinebytes** (Guillermo). 14 módulos operativos + asistente de IA (Claude Haiku) para mensajes, presupuestos y consultas internas.

## Stack

- **Next.js 14** (app dir) + TypeScript strict
- **Supabase** Postgres + Auth + Storage (RLS desde día 1)
- **Tailwind CSS** + Radix UI
- **Anthropic SDK** (Claude Haiku) para la capa de IA
- **Vercel** para deploy

## Setup local

```bash
git clone https://github.com/edubd4/Tecnopro.git
cd Tecnopro
npm install

cp env.example .env.local
# completar las keys de Supabase (Project Settings -> API)

npm run dev
# http://localhost:3000
```

## Estructura

```
Tecnopro/
├── app/
│   ├── (auth)/login/        # login público
│   ├── (dashboard)/         # panel protegido por auth
│   ├── api/                 # endpoints server-side
│   ├── globals.css          # tokens de tema (tp-*)
│   └── layout.tsx
├── components/
│   └── ui/                  # primitivos shadcn manuales
├── lib/
│   ├── supabase/            # clientes server + browser
│   ├── constants.ts         # ENUMs del dominio
│   ├── utils.ts             # cn, formatPesos, formatFecha
│   └── auth-m2m.ts          # API key validator
├── supabase/
│   └── migrations/          # SQL versionado
├── middleware.ts            # guard de auth
├── tailwind.config.ts       # tokens tp-*
└── CLAUDE.md                # guía para Claude Code
```

## Roadmap

- ✅ **Fase 1** — Bootstrap (estructura, auth, schema base, tokens de diseño)
- 🔜 **Fase 2** — Módulos del MVP en olas:
  - A · Maestros (clientes, servicios, stock, usuarios, config)
  - B · Operación (órdenes, turnos+calendario, presupuestos)
  - C · Plata (caja, gastos, tesorería, contabilidad básica)
  - D · Visión (panel, analytics, alertas)
- 🔜 **Fase 3** — IA integrada (Claude Haiku)
- 🔜 **Fase 4** — Capacitación y prueba con uso real

Ver `CLAUDE.md` para detalles de arquitectura y convenciones.

## Licencia

Privado. Propiedad intelectual desarrollada para Onlinebytes.
