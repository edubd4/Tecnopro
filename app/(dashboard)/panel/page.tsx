import Link from "next/link"
import {
  Wallet,
  AlertCircle,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
} from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { formatPesos, formatFechaHora, formatFecha } from "@/lib/utils"
import { toISODate } from "@/lib/fechas"
import { ROL } from "@/lib/constants"
import { ESTADO_ORDEN_LABEL, ESTADO_ORDEN_VARIANT } from "@/lib/ordenes-ui"
import { TIPO_MOV_CAJA_VARIANT } from "@/lib/caja-ui"

// ============================================================================
// Panel principal — landing del dashboard
// - Admin: KPIs de plata + alertas + últimas órdenes + últimos movimientos
// - Técnico: sus órdenes activas + sus turnos de hoy
// ============================================================================

export default async function PanelPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .single()

  const nombre = profile?.nombre ?? user.email
  const esAdmin = profile?.rol === ROL.ADMIN

  if (esAdmin) {
    return <PanelAdmin nombre={nombre ?? "Admin"} />
  }
  return <PanelTecnico nombre={nombre ?? "Técnico"} userId={user.id} />
}

// ─── Admin ──────────────────────────────────────────────────────────────────
async function PanelAdmin({ nombre }: { nombre: string }) {
  const supabase = await createServerClient()
  const hoyISO = toISODate(new Date())
  const finHoyISO = toISODate(new Date(Date.now() + 24 * 3600_000))
  const proximosDiasISO = toISODate(new Date(Date.now() + 7 * 24 * 3600_000))

  const [
    saldoRes,
    porCobrarRes,
    ordenesActivasRes,
    turnosHoyRes,
    entregasVencidasRes,
    presupuestosPorVencerRes,
    ultimasOrdenesRes,
    ultimosMovsRes,
  ] = await Promise.all([
    supabase.from("saldo_caja").select("saldo").maybeSingle(),
    supabase
      .from("ordenes_con_saldo")
      .select("saldo_pendiente")
      .gt("saldo_pendiente", 0)
      .neq("estado", "CANCELADA"),
    supabase
      .from("ordenes")
      .select("id", { count: "exact", head: true })
      .not("estado", "in", "(ENTREGADA,CANCELADA)"),
    supabase
      .from("turnos")
      .select("id", { count: "exact", head: true })
      .gte("fecha_inicio", hoyISO)
      .lt("fecha_inicio", finHoyISO),
    supabase
      .from("ordenes")
      .select("id", { count: "exact", head: true })
      .lt("fecha_entrega_estimada", hoyISO)
      .not("estado", "in", "(ENTREGADA,CANCELADA)"),
    supabase
      .from("presupuestos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "ENVIADO")
      .gte("validez_hasta", hoyISO)
      .lte("validez_hasta", proximosDiasISO),
    supabase
      .from("ordenes")
      .select(`
        id, id_publico, estado, fecha_recepcion,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("movimientos_caja")
      .select("id, id_publico, tipo, monto, descripcion, fecha")
      .order("fecha", { ascending: false })
      .limit(5),
  ])

  const saldo = Number(saldoRes.data?.saldo ?? 0)
  const totalPorCobrar = ((porCobrarRes.data ?? []) as { saldo_pendiente: number }[])
    .reduce((s, r) => s + Number(r.saldo_pendiente), 0)
  const ordenesActivas = ordenesActivasRes.count ?? 0
  const turnosHoy = turnosHoyRes.count ?? 0
  const entregasVencidas = entregasVencidasRes.count ?? 0
  // Recontamos stock bajo con query específica porque no podemos comparar columnas.
  const stockBajoCount = await countStockBajo(supabase)
  const presupuestosPorVencer = presupuestosPorVencerRes.count ?? 0

  const totalAlertas = entregasVencidas + stockBajoCount + presupuestosPorVencer

  const ordenes = (ultimasOrdenesRes.data ?? []) as unknown as {
    id: string
    id_publico: string
    estado: string
    fecha_recepcion: string
    clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
  }[]
  const movs = (ultimosMovsRes.data ?? []) as {
    id: string; id_publico: string; tipo: string; monto: number; descripcion: string; fecha: string
  }[]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Panel · Admin
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
            Hola, {nombre}
          </h1>
          <p className="text-tp-secondary mt-1">
            Resumen operativo del día. Todo lo importante en una pantalla.
          </p>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={<Wallet className="w-4 h-4" />} label="Saldo caja" value={formatPesos(saldo)} href="/caja" tone="cyan" />
          <KPI icon={<AlertCircle className="w-4 h-4" />} label="Por cobrar" value={formatPesos(totalPorCobrar)} href="/tesoreria" tone="amber" />
          <KPI icon={<ClipboardList className="w-4 h-4" />} label="Órdenes activas" value={String(ordenesActivas)} href="/ordenes" tone="violet" />
          <KPI icon={<CalendarDays className="w-4 h-4" />} label="Turnos hoy" value={String(turnosHoy)} href="/turnos" tone="green" />
        </section>

        {/* Banner de alertas */}
        {totalAlertas > 0 && (
          <Link
            href="/alertas"
            className="flex items-center justify-between rounded-xl border border-tp-amber/40 bg-tp-amber/10 px-5 py-4 hover:bg-tp-amber/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-tp-amber" />
              <div>
                <p className="font-display font-semibold text-tp-amber">
                  {totalAlertas} alerta{totalAlertas === 1 ? "" : "s"} activa{totalAlertas === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-tp-secondary font-mono mt-0.5">
                  {entregasVencidas > 0 && <span className="mr-3">{entregasVencidas} entrega{entregasVencidas === 1 ? "" : "s"} vencida{entregasVencidas === 1 ? "" : "s"}</span>}
                  {stockBajoCount > 0 && <span className="mr-3">{stockBajoCount} stock bajo</span>}
                  {presupuestosPorVencer > 0 && <span>{presupuestosPorVencer} presupuesto{presupuestosPorVencer === 1 ? "" : "s"} por vencer</span>}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-tp-amber" />
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Últimas órdenes */}
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-tp-cyan" />
                <h2 className="font-display font-semibold">Últimas órdenes</h2>
              </div>
              <Link href="/ordenes" className="text-xs font-mono text-tp-muted hover:text-tp-cyan">
                Ver todas →
              </Link>
            </div>
            {ordenes.length === 0 ? (
              <p className="text-sm text-tp-muted font-mono">Sin órdenes todavía.</p>
            ) : (
              <ul className="space-y-1">
                {ordenes.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/ordenes/${o.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-tp-surface-mid/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-tp-cyan text-xs shrink-0">{o.id_publico}</span>
                        <span className="text-sm text-tp-text truncate">{nombreCliente(o.clientes)}</span>
                      </div>
                      <Badge variant={ESTADO_ORDEN_VARIANT[o.estado] ?? "gray"}>
                        {ESTADO_ORDEN_LABEL[o.estado] ?? o.estado}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Últimos movimientos */}
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-tp-cyan" />
                <h2 className="font-display font-semibold">Últimos movimientos</h2>
              </div>
              <Link href="/caja" className="text-xs font-mono text-tp-muted hover:text-tp-cyan">
                Ver caja →
              </Link>
            </div>
            {movs.length === 0 ? (
              <p className="text-sm text-tp-muted font-mono">Sin movimientos todavía.</p>
            ) : (
              <ul className="space-y-1">
                {movs.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={TIPO_MOV_CAJA_VARIANT[m.tipo] ?? "gray"}>
                        {m.tipo === "INGRESO" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm text-tp-text truncate">{m.descripcion}</p>
                        <p className="text-[10.5px] font-mono text-tp-muted">{formatFechaHora(m.fecha)}</p>
                      </div>
                    </div>
                    <span
                      className={`font-mono font-semibold text-sm shrink-0 ${
                        m.tipo === "INGRESO" ? "text-tp-green" : "text-tp-red"
                      }`}
                    >
                      {m.tipo === "INGRESO" ? "+" : "−"}{formatPesos(Number(m.monto))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// Contar stock bajo con query directa: no podemos comparar dos columnas en supabase-js.
// Traemos ids + stock_actual + stock_minimo y filtramos en JS.
async function countStockBajo(supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<number> {
  const { data } = await supabase
    .from("repuestos")
    .select("stock_actual, stock_minimo")
    .eq("activo", true)
    .gt("stock_minimo", 0)
  if (!data) return 0
  return data.filter((r) => Number(r.stock_actual) <= Number(r.stock_minimo)).length
}

function nombreCliente(c: {
  nombre: string; apellido: string | null; razon_social: string | null; tipo: string
} | null): string {
  if (!c) return "—"
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

// ─── Técnico ────────────────────────────────────────────────────────────────
async function PanelTecnico({ nombre, userId }: { nombre: string; userId: string }) {
  const supabase = await createServerClient()
  const hoyISO = toISODate(new Date())
  const finHoyISO = toISODate(new Date(Date.now() + 24 * 3600_000))

  const [misOrdenesRes, misTurnosRes] = await Promise.all([
    supabase
      .from("ordenes")
      .select(`
        id, id_publico, estado, fecha_recepcion, fecha_entrega_estimada,
        clientes:cliente_id ( nombre, apellido, razon_social, tipo )
      `)
      .eq("tecnico_asignado_id", userId)
      .not("estado", "in", "(ENTREGADA,CANCELADA)")
      .order("prioridad", { ascending: false })
      .order("fecha_recepcion", { ascending: true })
      .limit(20),
    supabase
      .from("turnos")
      .select("id, id_publico, titulo, fecha_inicio, fecha_fin, estado")
      .eq("tecnico_id", userId)
      .gte("fecha_inicio", hoyISO)
      .lt("fecha_inicio", finHoyISO)
      .order("fecha_inicio", { ascending: true }),
  ])

  const ordenes = (misOrdenesRes.data ?? []) as unknown as {
    id: string
    id_publico: string
    estado: string
    fecha_recepcion: string
    fecha_entrega_estimada: string | null
    clientes: { nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
  }[]
  const turnos = (misTurnosRes.data ?? []) as {
    id: string; id_publico: string; titulo: string; fecha_inicio: string; fecha_fin: string; estado: string
  }[]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Panel · Técnico
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
            Hola, {nombre}
          </h1>
          <p className="text-tp-secondary mt-1">
            Tus órdenes activas y turnos de hoy.
          </p>
        </header>

        <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-tp-cyan" />
            <h2 className="font-display font-semibold">Turnos de hoy</h2>
          </div>
          {turnos.length === 0 ? (
            <p className="text-sm text-tp-muted font-mono">Sin turnos programados para hoy.</p>
          ) : (
            <ul className="space-y-1">
              {turnos.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/turnos/${t.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-tp-surface-mid/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="w-4 h-4 text-tp-muted shrink-0" />
                      <span className="font-mono text-tp-cyan text-xs shrink-0">
                        {formatFechaHora(t.fecha_inicio).split(" ").slice(-1)[0]}
                      </span>
                      <span className="text-sm text-tp-text truncate">{t.titulo}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-tp-cyan" />
              <h2 className="font-display font-semibold">Mis órdenes activas</h2>
            </div>
            <Link href="/ordenes" className="text-xs font-mono text-tp-muted hover:text-tp-cyan">
              Ver todas →
            </Link>
          </div>
          {ordenes.length === 0 ? (
            <p className="text-sm text-tp-muted font-mono">No tenés órdenes asignadas.</p>
          ) : (
            <ul className="space-y-1">
              {ordenes.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/ordenes/${o.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-tp-surface-mid/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-tp-cyan text-xs shrink-0">{o.id_publico}</span>
                      <span className="text-sm text-tp-text truncate">{nombreCliente(o.clientes)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {o.fecha_entrega_estimada && (
                        <span className="font-mono text-[10.5px] text-tp-muted">
                          {formatFecha(o.fecha_entrega_estimada)}
                        </span>
                      )}
                      <Badge variant={ESTADO_ORDEN_VARIANT[o.estado] ?? "gray"}>
                        {ESTADO_ORDEN_LABEL[o.estado] ?? o.estado}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

// ─── KPI card ───────────────────────────────────────────────────────────────
function KPI({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href: string
  tone: "cyan" | "amber" | "violet" | "green"
}) {
  const toneClasses = {
    cyan: "text-tp-cyan",
    amber: "text-tp-amber",
    violet: "text-tp-violet",
    green: "text-tp-green",
  }[tone]

  return (
    <Link
      href={href}
      className="group rounded-xl border border-tp-line-soft bg-tp-card p-5 hover:border-tp-cyan/40 transition-colors"
    >
      <div className={`flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest ${toneClasses}`}>
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl mt-2 text-tp-text group-hover:text-tp-cyan transition-colors">
        {value}
      </p>
    </Link>
  )
}
