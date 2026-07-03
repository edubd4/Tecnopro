import Link from "next/link"
import { Download, TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell, TableEmpty } from "@/components/ui/table"
import { formatPesos, formatFechaHora, formatFecha } from "@/lib/utils"
import { rangoMesActual, rangoAnioActual, nombreMes } from "@/lib/fechas"
import {
  TIPO_MOV_CAJA_LABEL,
  TIPO_MOV_CAJA_VARIANT,
  ORIGEN_MOV_CAJA_LABEL,
  METODO_PAGO_LABEL,
} from "@/lib/caja-ui"
import { ESTADO_ORDEN_LABEL, ESTADO_ORDEN_VARIANT } from "@/lib/ordenes-ui"
import { cn } from "@/lib/utils"

// ============================================================================
// Contabilidad — Wave 1.6.
//   Tab "Libro"       (default): libro de movimientos filtrable + export CSV.
//   Tab "Por cobrar":            órdenes con saldo pendiente + resumen mes
//                                 (lo que antes era el módulo Tesorería).
// ============================================================================

type Tab = "libro" | "por-cobrar"

type Params = {
  tab?: string
  preset?: string
  desde?: string
  hasta?: string
}

export default async function ContabilidadPage({
  searchParams,
}: {
  searchParams: Params
}) {
  const tab: Tab = searchParams.tab === "por-cobrar" ? "por-cobrar" : "libro"

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Módulo · Contabilidad
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
            Libro y cobros pendientes
          </h1>
          <p className="text-tp-secondary mt-1">
            El libro de movimientos con filtros y export para el contador, más
            el estado de cobros pendientes en un solo lugar.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-tp-line-soft">
          <TabLink current={tab} value="libro" label="Libro" />
          <TabLink current={tab} value="por-cobrar" label="Por cobrar" />
        </div>

        {tab === "libro"
          ? await LibroContent(searchParams)
          : await PorCobrarContent()}
      </div>
    </div>
  )
}

function TabLink({ current, value, label }: { current: Tab; value: Tab; label: string }) {
  const active = current === value
  const href = value === "libro" ? "/contabilidad" : "/contabilidad?tab=por-cobrar"
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-2 font-mono text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px",
        active
          ? "border-tp-cyan text-tp-cyan"
          : "border-transparent text-tp-muted hover:text-tp-text",
      )}
    >
      {label}
    </Link>
  )
}

// ─── Tab · Libro ────────────────────────────────────────────────────────────
type Preset = "mes" | "anio" | "custom"

function resolvePeriodo(params: Params): {
  preset: Preset
  desde: string
  hasta: string
  label: string
} {
  const preset: Preset =
    params.preset === "anio"
      ? "anio"
      : params.preset === "custom"
        ? "custom"
        : "mes"

  if (preset === "anio") {
    const r = rangoAnioActual()
    return { preset, desde: r.desde, hasta: r.hasta, label: `Año ${new Date().getFullYear()}` }
  }
  if (preset === "custom" && params.desde && params.hasta) {
    return {
      preset,
      desde: params.desde,
      hasta: params.hasta,
      label: `${params.desde} → ${params.hasta}`,
    }
  }
  const r = rangoMesActual()
  return { preset: "mes", desde: r.desde, hasta: r.hasta, label: nombreMes() }
}

type MovimientoRow = {
  id: string
  id_publico: string
  tipo: string
  origen: string
  monto: number
  metodo_pago: string
  descripcion: string
  fecha: string
  orden_id: string | null
  ordenes: { id_publico: string } | null
  gastos: { id_publico: string; categoria: { nombre: string } | null }[] | null
}

async function LibroContent(params: Params) {
  const supabase = await createServerClient()
  const periodo = resolvePeriodo(params)

  const { data, error } = await supabase
    .from("movimientos_caja")
    .select(`
      id, id_publico, tipo, origen, monto, metodo_pago, descripcion, fecha, orden_id,
      ordenes:orden_id ( id_publico ),
      gastos ( id_publico, categoria:categoria_id ( nombre ) )
    `)
    .gte("fecha", periodo.desde)
    .lt("fecha", periodo.hasta)
    .order("fecha", { ascending: false })
    .limit(1000)

  const rows = (data ?? []) as unknown as MovimientoRow[]

  const ingresos = rows.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + Number(m.monto), 0)
  const egresos = rows.filter((m) => m.tipo === "EGRESO").reduce((s, m) => s + Number(m.monto), 0)
  const neto = ingresos - egresos

  const csvHref = `/api/contabilidad/csv?preset=${periodo.preset}${
    periodo.preset === "custom" ? `&desde=${periodo.desde}&hasta=${periodo.hasta}` : ""
  }`

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-tp-secondary">
          Período: <span className="text-tp-text font-medium capitalize">{periodo.label}</span>
        </p>
        <Button asChild>
          <a href={csvHref} download>
            <Download className="w-4 h-4" />
            Exportar CSV
          </a>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10.5px] text-tp-muted uppercase tracking-widest mr-1">
          Período:
        </span>
        <PresetLink current={periodo.preset} value="mes" label="Mes actual" />
        <PresetLink current={periodo.preset} value="anio" label="Año actual" />
        <CustomForm desde={params.desde ?? periodo.desde} hasta={params.hasta ?? periodo.hasta} />
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ResumenCard icon={<TrendingUp className="w-4 h-4" />} label="Ingresos" value={formatPesos(ingresos)} tone="green" />
        <ResumenCard icon={<TrendingDown className="w-4 h-4" />} label="Egresos" value={formatPesos(egresos)} tone="red" />
        <ResumenCard icon={<Wallet className="w-4 h-4" />} label="Resultado neto" value={formatPesos(neto)} tone={neto >= 0 ? "green" : "red"} />
      </section>

      {error ? (
        <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
          Error al cargar movimientos: {error.message}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead className="w-[80px]">Tipo</TableHead>
              <TableHead className="w-[140px]">Origen / Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[100px]">Método</TableHead>
              <TableHead className="w-[130px] text-right">Monto</TableHead>
              <TableHead className="w-[140px]">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={7}>Sin movimientos en el período seleccionado.</TableEmpty>
            ) : (
              rows.map((m) => {
                const gasto = Array.isArray(m.gastos) ? m.gastos[0] : null
                const categoria = (gasto?.categoria as unknown as { nombre: string } | null)?.nombre
                const origenLabel = categoria ? categoria : ORIGEN_MOV_CAJA_LABEL[m.origen] ?? m.origen
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-tp-cyan text-xs">{m.id_publico}</TableCell>
                    <TableCell>
                      <Badge variant={TIPO_MOV_CAJA_VARIANT[m.tipo] ?? "gray"}>
                        {TIPO_MOV_CAJA_LABEL[m.tipo] ?? m.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-tp-secondary text-xs font-mono uppercase tracking-wider">
                      {origenLabel}
                    </TableCell>
                    <TableCell className="text-tp-text">
                      {m.descripcion}
                      {m.ordenes?.id_publico && (
                        <div className="font-mono text-[10.5px] text-tp-muted mt-0.5">
                          → {m.ordenes.id_publico}
                        </div>
                      )}
                      {gasto?.id_publico && (
                        <div className="font-mono text-[10.5px] text-tp-muted mt-0.5">
                          → {gasto.id_publico}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-tp-secondary text-xs">
                      {METODO_PAGO_LABEL[m.metodo_pago] ?? m.metodo_pago}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-semibold",
                        m.tipo === "INGRESO" ? "text-tp-green" : "text-tp-red",
                      )}
                    >
                      {m.tipo === "INGRESO" ? "+" : "−"} {formatPesos(Number(m.monto))}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-tp-muted">
                      {formatFechaHora(m.fecha)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      )}
    </>
  )
}

function PresetLink({ current, value, label }: { current: Preset; value: "mes" | "anio"; label: string }) {
  return (
    <Link
      href={`/contabilidad?preset=${value}`}
      className={cn(
        "px-3 py-1 rounded-md text-xs font-mono border",
        current === value
          ? "border-tp-cyan/50 bg-tp-cyan/10 text-tp-cyan"
          : "border-tp-line text-tp-muted hover:text-tp-text",
      )}
    >
      {label}
    </Link>
  )
}

function CustomForm({ desde, hasta }: { desde: string; hasta: string }) {
  return (
    <form action="/contabilidad" method="get" className="flex items-center gap-2 flex-wrap">
      <input type="hidden" name="preset" value="custom" />
      <input
        type="date"
        name="desde"
        defaultValue={desde}
        className="h-8 rounded-md border border-tp-line bg-tp-input px-2 text-xs text-tp-text font-mono"
        required
      />
      <span className="text-tp-muted text-xs">→</span>
      <input
        type="date"
        name="hasta"
        defaultValue={hasta}
        className="h-8 rounded-md border border-tp-line bg-tp-input px-2 text-xs text-tp-text font-mono"
        required
      />
      <button
        type="submit"
        className="h-8 px-3 rounded-md border border-tp-line text-xs font-mono text-tp-secondary hover:text-tp-text"
      >
        Custom
      </button>
    </form>
  )
}

// ─── Tab · Por cobrar (ex Tesorería) ────────────────────────────────────────
type OrdenPendienteRow = {
  id: string
  id_publico: string
  estado: string
  fecha_recepcion: string
  fecha_entrega_estimada: string | null
  fecha_entrega_real: string | null
  total: number
  cobrado: number
  saldo_pendiente: number
  clientes: {
    id_publico: string
    nombre: string
    apellido: string | null
    razon_social: string | null
    tipo: string
  } | null
}

function nombreCliente(c: OrdenPendienteRow["clientes"]): string {
  if (!c) return "—"
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

async function PorCobrarContent() {
  const supabase = await createServerClient()
  const { desde, hasta } = rangoMesActual()

  const [ordenesPendientesRes, movimientosMesRes] = await Promise.all([
    supabase
      .from("ordenes_con_saldo")
      .select(`
        id, id_publico, estado, fecha_recepcion, fecha_entrega_estimada, fecha_entrega_real,
        total, cobrado, saldo_pendiente,
        clientes:cliente_id ( id_publico, nombre, apellido, razon_social, tipo )
      `)
      .gt("saldo_pendiente", 0)
      .neq("estado", "CANCELADA")
      .order("saldo_pendiente", { ascending: false })
      .limit(100),
    supabase
      .from("movimientos_caja")
      .select("tipo, monto")
      .gte("fecha", desde)
      .lt("fecha", hasta),
  ])

  const rows = (ordenesPendientesRes.data ?? []) as unknown as OrdenPendienteRow[]

  const movimientos = (movimientosMesRes.data ?? []) as { tipo: string; monto: number }[]
  const ingresosMes = movimientos.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + Number(m.monto), 0)
  const egresosMes = movimientos.filter((m) => m.tipo === "EGRESO").reduce((s, m) => s + Number(m.monto), 0)
  const netoMes = ingresosMes - egresosMes
  const totalPorCobrar = rows.reduce((s, r) => s + Number(r.saldo_pendiente), 0)

  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ResumenCard icon={<AlertCircle className="w-4 h-4" />} label="Total por cobrar" value={formatPesos(totalPorCobrar)} tone="amber" />
        <ResumenCard icon={<TrendingUp className="w-4 h-4" />} label={`Ingresos ${nombreMes()}`} value={formatPesos(ingresosMes)} tone="green" />
        <ResumenCard icon={<TrendingDown className="w-4 h-4" />} label={`Egresos ${nombreMes()}`} value={formatPesos(egresosMes)} tone="red" />
        <ResumenCard icon={<Wallet className="w-4 h-4" />} label={`Neto ${nombreMes()}`} value={formatPesos(netoMes)} tone={netoMes >= 0 ? "green" : "red"} />
      </section>

      <div>
        <h2 className="font-display text-xl font-semibold">Órdenes con saldo pendiente</h2>
        <p className="text-sm text-tp-secondary">
          Click en la orden abre la ficha. Registrá el cobro desde ahí.
        </p>
      </div>

      {ordenesPendientesRes.error ? (
        <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
          Error al cargar órdenes: {ordenesPendientesRes.error.message}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-[130px]">Estado</TableHead>
              <TableHead className="w-[130px] text-right">Total</TableHead>
              <TableHead className="w-[130px] text-right">Cobrado</TableHead>
              <TableHead className="w-[130px] text-right">Saldo</TableHead>
              <TableHead className="w-[120px]">Recibida</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={7}>
                No hay órdenes con saldo pendiente. Todo cobrado.
              </TableEmpty>
            ) : (
              rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-tp-cyan">
                    <Link href={`/ordenes/${o.id}`} className="hover:underline underline-offset-4">
                      {o.id_publico}
                    </Link>
                  </TableCell>
                  <TableCell className="text-tp-text">{nombreCliente(o.clientes)}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_ORDEN_VARIANT[o.estado] ?? "gray"}>
                      {ESTADO_ORDEN_LABEL[o.estado] ?? o.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-tp-secondary">
                    {formatPesos(Number(o.total))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-tp-green">
                    {formatPesos(Number(o.cobrado))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-tp-amber font-semibold">
                    {formatPesos(Number(o.saldo_pendiente))}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-tp-muted">
                    {formatFecha(o.fecha_recepcion)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </>
  )
}

// ─── Card reusable ──────────────────────────────────────────────────────────
function ResumenCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "green" | "red" | "amber"
}) {
  const toneClasses = {
    green: "text-tp-green",
    red: "text-tp-red",
    amber: "text-tp-amber",
  }[tone]
  return (
    <div className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
      <div className={cn("flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest", toneClasses)}>
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl mt-2 text-tp-text">{value}</p>
    </div>
  )
}
