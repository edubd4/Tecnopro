import Link from "next/link"
import { AlertCircle, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell, TableEmpty } from "@/components/ui/table"
import { formatPesos, formatFecha } from "@/lib/utils"
import { rangoMesActual, nombreMes } from "@/lib/fechas"
import { ESTADO_ORDEN_LABEL, ESTADO_ORDEN_VARIANT } from "@/lib/ordenes-ui"

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

export default async function TesoreriaPage() {
  const supabase = await createServerClient()
  const { desde, hasta } = rangoMesActual()

  const [ordenesPendientesRes, movimientosMesRes] = await Promise.all([
    // Ordenes con saldo pendiente > 0 y no canceladas.
    // Ordenamos por saldo desc para que las mas urgentes salgan primero.
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
    // Ingresos/egresos del mes en curso.
    supabase
      .from("movimientos_caja")
      .select("tipo, monto")
      .gte("fecha", desde)
      .lt("fecha", hasta),
  ])

  const rows = (ordenesPendientesRes.data ?? []) as unknown as OrdenPendienteRow[]

  const movimientos = (movimientosMesRes.data ?? []) as { tipo: string; monto: number }[]
  const ingresosMes = movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0)
  const egresosMes = movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0)
  const netoMes = ingresosMes - egresosMes

  const totalPorCobrar = rows.reduce((s, r) => s + Number(r.saldo_pendiente), 0)

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
            Módulo · Tesorería
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
            Cobros pendientes y flujo del mes
          </h1>
          <p className="text-tp-secondary mt-1">
            Órdenes con saldo pendiente y resumen de ingresos vs egresos de {nombreMes()}.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ResumenCard
            icon={<AlertCircle className="w-4 h-4" />}
            label="Total por cobrar"
            value={formatPesos(totalPorCobrar)}
            tone="amber"
          />
          <ResumenCard
            icon={<TrendingUp className="w-4 h-4" />}
            label={`Ingresos ${nombreMes()}`}
            value={formatPesos(ingresosMes)}
            tone="green"
          />
          <ResumenCard
            icon={<TrendingDown className="w-4 h-4" />}
            label={`Egresos ${nombreMes()}`}
            value={formatPesos(egresosMes)}
            tone="red"
          />
          <ResumenCard
            icon={<Wallet className="w-4 h-4" />}
            label={`Neto ${nombreMes()}`}
            value={formatPesos(netoMes)}
            tone={netoMes >= 0 ? "green" : "red"}
          />
        </section>

        <div>
          <h2 className="font-display text-xl font-semibold">Órdenes con saldo pendiente</h2>
          <p className="text-sm text-tp-secondary">
            Click en la fila abre la orden. Registrá el cobro desde la ficha.
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
                    <TableCell className="text-tp-text">
                      {nombreCliente(o.clientes)}
                    </TableCell>
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
      </div>
    </div>
  )
}

function ResumenCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "amber" | "green" | "red"
}) {
  const toneClasses = {
    amber: "text-tp-amber",
    green: "text-tp-green",
    red: "text-tp-red",
  }[tone]

  return (
    <div className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
      <div className={`flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest ${toneClasses}`}>
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl mt-2 text-tp-text">{value}</p>
    </div>
  )
}
