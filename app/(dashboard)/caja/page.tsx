import Link from "next/link"
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table"
import { MovimientoListRow } from "@/components/caja/MovimientoListRow"
import { formatPesos } from "@/lib/utils"

type MovimientoRow = {
  id: string
  id_publico: string
  tipo: string
  origen: string
  monto: number
  metodo_pago: string
  descripcion: string
  orden_id: string | null
  fecha: string
  ordenes: { id_publico: string } | null
}

type SaldoRow = {
  saldo: number
  total_ingresos: number
  total_egresos: number
  movimientos_total: number
}

export default async function CajaPage() {
  const supabase = await createServerClient()

  const [movimientosRes, saldoRes] = await Promise.all([
    supabase
      .from("movimientos_caja")
      .select(`
        id, id_publico, tipo, origen, monto, metodo_pago, descripcion,
        orden_id, fecha,
        ordenes:orden_id ( id_publico )
      `)
      .order("fecha", { ascending: false })
      .limit(200),
    supabase.from("saldo_caja").select("*").maybeSingle(),
  ])

  const rows = (movimientosRes.data ?? []) as unknown as MovimientoRow[]
  const saldo = (saldoRes.data ?? {
    saldo: 0,
    total_ingresos: 0,
    total_egresos: 0,
    movimientos_total: 0,
  }) as SaldoRow

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
              Módulo · Caja
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Movimientos de caja
            </h1>
            <p className="text-tp-secondary mt-1">
              Ingresos y egresos del negocio. Los movimientos son inmutables — para corregir, registrá un ajuste.
            </p>
          </div>

          <Button asChild>
            <Link href="/caja/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo movimiento
            </Link>
          </Button>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SaldoCard
            icon={<Wallet className="w-4 h-4" />}
            label="Saldo actual"
            value={formatPesos(Number(saldo.saldo))}
            tone="cyan"
          />
          <SaldoCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Ingresos acumulados"
            value={formatPesos(Number(saldo.total_ingresos))}
            tone="green"
          />
          <SaldoCard
            icon={<TrendingDown className="w-4 h-4" />}
            label="Egresos acumulados"
            value={formatPesos(Number(saldo.total_egresos))}
            tone="red"
          />
        </section>

        <p className="font-mono text-[10.5px] text-tp-muted">
          Tip: click en la fila con orden vinculada abre la orden. Los movimientos son append-only.
        </p>

        {movimientosRes.error ? (
          <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
            Error al cargar movimientos: {movimientosRes.error.message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[130px]">Origen</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[110px]">Método</TableHead>
                <TableHead className="w-[130px] text-right">Monto</TableHead>
                <TableHead className="w-[140px]">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7}>
                  Todavía no hay movimientos. Registrá el primero arriba (por ejemplo, una apertura de caja).
                </TableEmpty>
              ) : (
                rows.map((m) => (
                  <MovimientoListRow
                    key={m.id}
                    id={m.id}
                    id_publico={m.id_publico}
                    tipo={m.tipo}
                    origen={m.origen}
                    monto={Number(m.monto)}
                    metodo_pago={m.metodo_pago}
                    descripcion={m.descripcion}
                    orden_id={m.orden_id}
                    fecha={m.fecha}
                    orden_id_publico={m.ordenes?.id_publico ?? null}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function SaldoCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "cyan" | "green" | "red"
}) {
  const toneClasses = {
    cyan: "text-tp-cyan",
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
