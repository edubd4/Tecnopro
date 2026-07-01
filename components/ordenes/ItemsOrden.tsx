import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { AgregarServicioForm } from "./AgregarServicioForm"
import { AgregarRepuestoForm } from "./AgregarRepuestoForm"
import { QuitarItemButton } from "./QuitarItemButton"
import { formatPesos } from "@/lib/utils"

type ServicioItem = {
  id: number
  descripcion_snapshot: string
  precio: number
  cantidad: number
}

type RepuestoItem = {
  id: number
  descripcion_snapshot: string
  precio_unitario: number
  cantidad: number
}

type Props = {
  ordenId: string
  puedeEditar: boolean
}

export async function ItemsOrden({ ordenId, puedeEditar }: Props) {
  const supabase = await createServerClient()

  const [serviciosRes, repuestosRes, catalogoRes, stockRes] = await Promise.all([
    supabase
      .from("orden_servicios")
      .select("id, descripcion_snapshot, precio, cantidad")
      .eq("orden_id", ordenId)
      .order("id", { ascending: true }),
    supabase
      .from("orden_repuestos")
      .select("id, descripcion_snapshot, precio_unitario, cantidad")
      .eq("orden_id", ordenId)
      .order("id", { ascending: true }),
    puedeEditar
      ? supabase
          .from("servicios")
          .select("id, id_publico, nombre, precio_base")
          .eq("activo", true)
          .order("nombre", { ascending: true })
      : Promise.resolve({ data: [] }),
    puedeEditar
      ? supabase
          .from("repuestos")
          .select("id, id_publico, nombre, precio_venta, stock_actual")
          .eq("activo", true)
          .gt("stock_actual", 0)
          .order("nombre", { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const servicios = (serviciosRes.data ?? []) as ServicioItem[]
  const repuestos = (repuestosRes.data ?? []) as RepuestoItem[]

  const totalServicios = servicios.reduce((sum, s) => sum + Number(s.precio) * s.cantidad, 0)
  const totalRepuestos = repuestos.reduce((sum, r) => sum + Number(r.precio_unitario) * r.cantidad, 0)
  const total = totalServicios + totalRepuestos

  return (
    <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-6">
      <div>
        <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase">
          Items imputados
        </p>
        <h2 className="font-display text-lg font-semibold mt-1">
          Servicios y repuestos de la orden
        </h2>
      </div>

      {/* Servicios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2">
            Servicios
            <Badge variant="cyan">{servicios.length}</Badge>
          </h3>
          {puedeEditar && (
            <AgregarServicioForm
              ordenId={ordenId}
              servicios={(catalogoRes.data ?? []).map((s) => ({
                id: s.id,
                id_publico: s.id_publico,
                nombre: s.nombre,
                precio_base: Number(s.precio_base),
              }))}
            />
          )}
        </div>

        {servicios.length === 0 ? (
          <p className="text-sm text-tp-muted font-mono">
            Todavía no hay servicios imputados.
          </p>
        ) : (
          <div className="rounded-lg border border-tp-line-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-tp-surface-low/50">
                <tr className="border-b border-tp-line-soft">
                  <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-tp-cyan">Servicio</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-20">Cant.</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-32">Precio</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-32">Subtotal</th>
                  {puedeEditar && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {servicios.map((s) => (
                  <tr key={s.id} className="border-b border-tp-line-soft last:border-0">
                    <td className="px-4 py-2 text-tp-text">{s.descripcion_snapshot}</td>
                    <td className="px-4 py-2 text-right font-mono text-tp-secondary">{s.cantidad}</td>
                    <td className="px-4 py-2 text-right font-mono text-tp-secondary">{formatPesos(Number(s.precio))}</td>
                    <td className="px-4 py-2 text-right font-mono text-tp-text font-medium">
                      {formatPesos(Number(s.precio) * s.cantidad)}
                    </td>
                    {puedeEditar && (
                      <td className="px-2 py-2 text-right">
                        <QuitarItemButton
                          itemId={s.id}
                          ordenId={ordenId}
                          tipo="servicio"
                          descripcion={s.descripcion_snapshot}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Repuestos */}
      <div className="space-y-3 pt-3 border-t border-tp-line-soft">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold flex items-center gap-2">
            Repuestos
            <Badge variant="violet">{repuestos.length}</Badge>
          </h3>
          {puedeEditar && (
            <AgregarRepuestoForm
              ordenId={ordenId}
              repuestos={(stockRes.data ?? []).map((r) => ({
                id: r.id,
                id_publico: r.id_publico,
                nombre: r.nombre,
                precio_venta: Number(r.precio_venta),
                stock_actual: r.stock_actual,
              }))}
            />
          )}
        </div>

        {repuestos.length === 0 ? (
          <p className="text-sm text-tp-muted font-mono">
            Todavía no hay repuestos imputados.
          </p>
        ) : (
          <div className="rounded-lg border border-tp-line-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-tp-surface-low/50">
                <tr className="border-b border-tp-line-soft">
                  <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-tp-cyan">Repuesto</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-20">Cant.</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-32">Unitario</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-32">Subtotal</th>
                  {puedeEditar && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {repuestos.map((r) => (
                  <tr key={r.id} className="border-b border-tp-line-soft last:border-0">
                    <td className="px-4 py-2 text-tp-text">{r.descripcion_snapshot}</td>
                    <td className="px-4 py-2 text-right font-mono text-tp-secondary">{r.cantidad}</td>
                    <td className="px-4 py-2 text-right font-mono text-tp-secondary">{formatPesos(Number(r.precio_unitario))}</td>
                    <td className="px-4 py-2 text-right font-mono text-tp-text font-medium">
                      {formatPesos(Number(r.precio_unitario) * r.cantidad)}
                    </td>
                    {puedeEditar && (
                      <td className="px-2 py-2 text-right">
                        <QuitarItemButton
                          itemId={r.id}
                          ordenId={ordenId}
                          tipo="repuesto"
                          descripcion={r.descripcion_snapshot}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="pt-4 border-t border-tp-line-soft grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-tp-surface-mid/40 px-4 py-3">
          <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">Servicios</p>
          <p className="font-display text-lg text-tp-text mt-1">{formatPesos(totalServicios)}</p>
        </div>
        <div className="rounded-lg bg-tp-surface-mid/40 px-4 py-3">
          <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">Repuestos</p>
          <p className="font-display text-lg text-tp-text mt-1">{formatPesos(totalRepuestos)}</p>
        </div>
        <div className="rounded-lg bg-tp-grad px-4 py-3">
          <p className="font-mono text-[10px] text-tp-bg uppercase tracking-widest font-semibold">Total orden</p>
          <p className="font-display text-lg text-tp-bg font-bold mt-1">{formatPesos(total)}</p>
        </div>
      </div>
    </section>
  )
}
