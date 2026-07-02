import { BarChart3, ClipboardList, Users as UsersIcon, Tag, TrendingUp } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { formatPesos } from "@/lib/utils"
import { ESTADO_ORDEN_LABEL } from "@/lib/ordenes-ui"
import { nombreMes } from "@/lib/fechas"

// ============================================================================
// Analytics — admin-only (RLS de las tablas base ya lo bloquea).
// Charts en SVG/CSS puro, sin dependencias.
// ============================================================================

const ESTADO_COLOR: Record<string, string> = {
  RECIBIDA: "bg-tp-cyan",
  DIAGNOSTICO: "bg-tp-cyan",
  PRESUPUESTADA: "bg-tp-amber",
  EN_REPARACION: "bg-tp-amber",
  LISTA: "bg-tp-green",
  ENTREGADA: "bg-tp-green",
  CANCELADA: "bg-tp-red",
}

export default async function AnalyticsPage() {
  const supabase = await createServerClient()

  const [
    ordenesPorEstadoRes,
    ordenesTecnicoRes,
    tecnicosRes,
    movimientosRes,
    gastosCategoriaRes,
  ] = await Promise.all([
    supabase.from("ordenes").select("estado"),
    supabase.from("ordenes").select("tecnico_asignado_id"),
    supabase.from("profiles").select("id, nombre").in("rol", ["admin", "tecnico"]).eq("activo", true),
    supabase
      .from("movimientos_caja")
      .select("tipo, monto, fecha")
      .gte("fecha", ultimosMesesISO(6))
      .order("fecha", { ascending: true }),
    supabase
      .from("gastos")
      .select(`monto, categoria:categoria_id ( nombre )`)
      .gte("fecha", inicioMesISO()),
  ])

  // ─── Órdenes por estado ─────────────────────────────────────────
  const porEstado: Record<string, number> = {}
  for (const o of (ordenesPorEstadoRes.data ?? []) as { estado: string }[]) {
    porEstado[o.estado] = (porEstado[o.estado] ?? 0) + 1
  }
  const estadosOrden = ["RECIBIDA", "DIAGNOSTICO", "PRESUPUESTADA", "EN_REPARACION", "LISTA", "ENTREGADA", "CANCELADA"] as const
  const barrasEstado = estadosOrden
    .map((e) => ({ label: ESTADO_ORDEN_LABEL[e] ?? e, value: porEstado[e] ?? 0, color: ESTADO_COLOR[e] ?? "bg-tp-line" }))
    .filter((b) => b.value > 0)

  // ─── Órdenes por técnico ─────────────────────────────────────────
  const porTecnico: Record<string, number> = {}
  for (const o of (ordenesTecnicoRes.data ?? []) as { tecnico_asignado_id: string | null }[]) {
    const key = o.tecnico_asignado_id ?? "__sin_asignar__"
    porTecnico[key] = (porTecnico[key] ?? 0) + 1
  }
  const tecnicosMap = new Map<string, string>()
  for (const t of (tecnicosRes.data ?? []) as { id: string; nombre: string }[]) {
    tecnicosMap.set(t.id, t.nombre)
  }
  const barrasTecnico = Object.entries(porTecnico)
    .map(([id, count]) => ({
      label: id === "__sin_asignar__" ? "Sin asignar" : (tecnicosMap.get(id) ?? "—"),
      value: count,
      color: id === "__sin_asignar__" ? "bg-tp-line" : "bg-tp-cyan",
    }))
    .sort((a, b) => b.value - a.value)

  // ─── Ingresos vs egresos últimos 6 meses ─────────────────────────
  const flujo = agruparPorMes(
    (movimientosRes.data ?? []) as { tipo: string; monto: number; fecha: string }[],
    6,
  )

  // ─── Top 5 categorías de gasto del mes ───────────────────────────
  const porCategoria: Record<string, number> = {}
  for (const g of (gastosCategoriaRes.data ?? []) as unknown as {
    monto: number
    categoria: { nombre: string } | null
  }[]) {
    const nombre = g.categoria?.nombre ?? "—"
    porCategoria[nombre] = (porCategoria[nombre] ?? 0) + Number(g.monto)
  }
  const topCategorias = Object.entries(porCategoria)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([label, value]) => ({ label, value, color: "bg-tp-amber" }))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Módulo · Analytics
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
            Métricas del negocio
          </h1>
          <p className="text-tp-secondary mt-1">
            Distribución de órdenes, carga por técnico, flujo del semestre y categorías de gasto del mes.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card icon={<ClipboardList className="w-4 h-4" />} title="Órdenes por estado" subtitle="Todas las órdenes del sistema">
            {barrasEstado.length === 0 ? <EmptyChart /> : <HorizontalBars items={barrasEstado} format={(v) => String(v)} />}
          </Card>

          <Card icon={<UsersIcon className="w-4 h-4" />} title="Órdenes por técnico" subtitle="Carga histórica de trabajo">
            {barrasTecnico.length === 0 ? <EmptyChart /> : <HorizontalBars items={barrasTecnico} format={(v) => String(v)} />}
          </Card>
        </div>

        <Card icon={<TrendingUp className="w-4 h-4" />} title="Ingresos vs egresos" subtitle="Últimos 6 meses">
          {flujo.every((f) => f.ingresos === 0 && f.egresos === 0) ? <EmptyChart /> : <MonthlyFlow data={flujo} />}
        </Card>

        <Card icon={<Tag className="w-4 h-4" />} title="Top categorías de gasto" subtitle={`Mes en curso · ${nombreMes()}`}>
          {topCategorias.length === 0 ? <EmptyChart /> : <HorizontalBars items={topCategorias} format={formatPesos} />}
        </Card>
      </div>
    </div>
  )
}

function ultimosMesesISO(meses: number): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() - (meses - 1))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}

function inicioMesISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}

type MesFlujo = { periodo: string; label: string; ingresos: number; egresos: number }

function agruparPorMes(
  movs: { tipo: string; monto: number; fecha: string }[],
  cantidadMeses: number,
): MesFlujo[] {
  const map = new Map<string, { ingresos: number; egresos: number }>()
  const hoy = new Date()
  for (let i = cantidadMeses - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    map.set(`${y}-${m}`, { ingresos: 0, egresos: 0 })
  }
  for (const mv of movs) {
    const periodo = mv.fecha.substring(0, 7)
    const bucket = map.get(periodo)
    if (!bucket) continue
    if (mv.tipo === "INGRESO") bucket.ingresos += Number(mv.monto)
    else if (mv.tipo === "EGRESO") bucket.egresos += Number(mv.monto)
  }
  return Array.from(map.entries()).map(([periodo, val]) => {
    const [y, m] = periodo.split("-")
    const nombre = new Date(Number(y), Number(m) - 1, 1)
    const label = new Intl.DateTimeFormat("es-AR", { month: "short" }).format(nombre)
    return { periodo, label, ingresos: val.ingresos, egresos: val.egresos }
  })
}

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-tp-cyan/10 text-tp-cyan p-2">{icon}</div>
        <div>
          <h2 className="font-display font-semibold">{title}</h2>
          {subtitle && <p className="text-xs font-mono text-tp-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-32 rounded-md bg-tp-surface-mid/30">
      <p className="text-sm text-tp-muted font-mono flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Sin datos todavía
      </p>
    </div>
  )
}

function HorizontalBars({
  items,
  format,
}: {
  items: { label: string; value: number; color: string }[]
  format: (v: number) => string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const pct = Math.max((item.value / max) * 100, 2)
        return (
          <div key={`${item.label}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-tp-text truncate">{item.label}</span>
              <span className="font-mono text-tp-muted shrink-0 ml-2">{format(item.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-tp-surface-mid overflow-hidden">
              <div className={`h-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthlyFlow({ data }: { data: MesFlujo[] }) {
  const max = Math.max(...data.flatMap((d) => [d.ingresos, d.egresos]), 1)
  const heightPx = 160

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((m) => {
          const hIn = (m.ingresos / max) * heightPx
          const hOut = (m.egresos / max) * heightPx
          return (
            <div key={m.periodo} className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-1 h-40">
                <div
                  className="w-4 bg-tp-green/70 rounded-t transition-all"
                  style={{ height: `${Math.max(hIn, 2)}px` }}
                  title={`Ingresos: ${formatPesos(m.ingresos)}`}
                />
                <div
                  className="w-4 bg-tp-red/70 rounded-t transition-all"
                  style={{ height: `${Math.max(hOut, 2)}px` }}
                  title={`Egresos: ${formatPesos(m.egresos)}`}
                />
              </div>
              <p className="font-mono text-[10px] text-tp-muted uppercase">{m.label}</p>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 justify-center">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-tp-green/70" />
          <span className="text-tp-secondary">Ingresos</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-tp-red/70" />
          <span className="text-tp-secondary">Egresos</span>
        </div>
      </div>
    </div>
  )
}
