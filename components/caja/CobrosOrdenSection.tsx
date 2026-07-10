import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { formatPesos, formatFechaHora } from "@/lib/utils"
import { CobrarOrdenForm } from "./CobrarOrdenForm"
import { METODO_PAGO_LABEL } from "@/lib/caja-ui"

type MovRow = {
  id: string
  id_publico: string
  monto: number
  metodo_pago: string
  descripcion: string
  fecha: string
}

type Props = {
  ordenId: string
  ordenIdPublico: string
  ordenEstado: string
  puedeCobrar: boolean       // esAdmin && estado != CANCELADA
  totalOrden: number
}

export async function CobrosOrdenSection({
  ordenId,
  ordenIdPublico,
  ordenEstado,
  puedeCobrar,
  totalOrden,
}: Props) {
  const supabase = await createServerClient()

  const { data } = await supabase
    .from("movimientos_caja")
    .select("id, id_publico, monto, metodo_pago, descripcion, fecha")
    .eq("orden_id", ordenId)
    .eq("tipo", "INGRESO")
    .eq("origen", "COBRO_ORDEN")
    .order("fecha", { ascending: true })

  const movimientos = ((data ?? []) as MovRow[]).map((m) => ({
    ...m,
    monto: Number(m.monto),
  }))
  const totalCobrado = movimientos.reduce((sum, m) => sum + m.monto, 0)
  const saldoPendiente = Math.max(totalOrden - totalCobrado, 0)
  const estaCancelada = ordenEstado === "CANCELADA"
  // Pagada por completo: hay total y ya se cobró todo. Ocultamos el form para
  // no invitar a un doble cobro (los movimientos de caja son append-only).
  const estaPagada = totalOrden > 0 && totalCobrado >= totalOrden

  return (
    <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase">
            Cobros
          </p>
          <h2 className="font-display text-lg font-semibold mt-1">Cobros de la orden</h2>
        </div>
        <Badge variant={saldoPendiente === 0 && totalCobrado > 0 ? "green" : totalCobrado > 0 ? "amber" : "gray"}>
          {saldoPendiente === 0 && totalCobrado > 0
            ? "Pagada"
            : totalCobrado > 0
              ? "Pago parcial"
              : "Sin cobrar"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ResumenCard label="Total orden" value={formatPesos(totalOrden)} />
        <ResumenCard label="Cobrado" value={formatPesos(totalCobrado)} tone="green" />
        <ResumenCard label="Saldo pendiente" value={formatPesos(saldoPendiente)} tone={saldoPendiente > 0 ? "amber" : "muted"} />
      </div>

      {movimientos.length > 0 && (
        <div className="rounded-lg border border-tp-line-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-tp-surface-low/50">
              <tr className="border-b border-tp-line-soft">
                <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-tp-cyan">ID</th>
                <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-tp-cyan">Método</th>
                <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-tp-cyan">Descripción</th>
                <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-36">Monto</th>
                <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-44">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} className="border-b border-tp-line-soft last:border-0">
                  <td className="px-4 py-2 font-mono text-tp-cyan text-xs">{m.id_publico}</td>
                  <td className="px-4 py-2 text-tp-secondary text-xs">
                    {METODO_PAGO_LABEL[m.metodo_pago] ?? m.metodo_pago}
                  </td>
                  <td className="px-4 py-2 text-tp-text">{m.descripcion}</td>
                  <td className="px-4 py-2 text-right font-mono text-tp-green font-semibold">
                    +{formatPesos(m.monto)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-tp-muted">
                    {formatFechaHora(m.fecha)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {puedeCobrar && !estaCancelada && !estaPagada && (
        <CobrarOrdenForm
          ordenId={ordenId}
          ordenIdPublico={ordenIdPublico}
          saldoPendiente={saldoPendiente}
        />
      )}

      {puedeCobrar && !estaCancelada && estaPagada && (
        <p className="text-sm text-tp-green font-mono">
          La orden ya está cobrada por completo. No queda saldo pendiente.
        </p>
      )}

      {estaCancelada && (
        <p className="text-sm text-tp-muted font-mono">
          La orden está cancelada. No se pueden registrar cobros.
        </p>
      )}
    </section>
  )
}

function ResumenCard({
  label,
  value,
  tone = "text",
}: {
  label: string
  value: string
  tone?: "text" | "green" | "amber" | "muted"
}) {
  const toneClasses = {
    text: "text-tp-text",
    green: "text-tp-green",
    amber: "text-tp-amber",
    muted: "text-tp-muted",
  }[tone]

  return (
    <div className="rounded-lg bg-tp-surface-mid/40 px-4 py-3">
      <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">{label}</p>
      <p className={`font-display text-lg mt-1 ${toneClasses}`}>{value}</p>
    </div>
  )
}
