import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { AgregarServicioPresForm } from "./AgregarServicioPresForm"
import { AgregarRepuestoPresForm } from "./AgregarRepuestoPresForm"
import { QuitarItemPresButton } from "./QuitarItemPresButton"
import { formatPesos } from "@/lib/utils"

type ServicioItem = { id: number; descripcion_snapshot: string; precio: number; cantidad: number }
type RepuestoItem = { id: number; descripcion_snapshot: string; precio_unitario: number; cantidad: number }

type Props = {
  presupuestoId: string
  puedeEditar: boolean
  margenPct: number
}

export async function ItemsPresupuesto({ presupuestoId, puedeEditar, margenPct }: Props) {
  const supabase = await createServerClient()

  const [serviciosRes, repuestosRes, catalogoRes, stockRes] = await Promise.all([
    supabase
      .from("presupuesto_servicios")
      .select("id, descripcion_snapshot, precio, cantidad")
      .eq("presupuesto_id", presupuestoId)
      .order("id", { ascending: true }),
    supabase
      .from("presupuesto_repuestos")
      .select("id, descripcion_snapshot, precio_unitario, cantidad")
      .eq("presupuesto_id", presupuestoId)
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
          .select("id, id_publico, nombre, costo, precio_venta")
          .eq("activo", true)
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
          Detalle del presupuesto
        </p>
        <h2 className="font-display text-lg font-semibold mt-1">
          Servicios y repuestos cotizados
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
            <AgregarServicioPresForm
              presupuestoId={presupuestoId}
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
          <p className="text-sm text-tp-muted font-mono">Sin servicios cotizados.</p>
        ) : (
          <TablaItems
            filas={servicios.map((s) => ({
              id: s.id,
              descripcion: s.descripcion_snapshot,
              cantidad: s.cantidad,
              precio: Number(s.precio),
            }))}
            tipo="servicio"
            presupuestoId={presupuestoId}
            puedeEditar={puedeEditar}
          />
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
            <AgregarRepuestoPresForm
              presupuestoId={presupuestoId}
              repuestos={(stockRes.data ?? []).map((r) => ({
                id: r.id,
                id_publico: r.id_publico,
                nombre: r.nombre,
                costo: Number(r.costo),
                precio_venta: Number(r.precio_venta),
              }))}
              margenPct={margenPct}
            />
          )}
        </div>

        {repuestos.length === 0 ? (
          <p className="text-sm text-tp-muted font-mono">Sin repuestos cotizados.</p>
        ) : (
          <TablaItems
            filas={repuestos.map((r) => ({
              id: r.id,
              descripcion: r.descripcion_snapshot,
              cantidad: r.cantidad,
              precio: Number(r.precio_unitario),
            }))}
            tipo="repuesto"
            presupuestoId={presupuestoId}
            puedeEditar={puedeEditar}
          />
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
          <p className="font-mono text-[10px] text-tp-bg uppercase tracking-widest font-semibold">Total cotizado</p>
          <p className="font-display text-lg text-tp-bg font-bold mt-1">{formatPesos(total)}</p>
        </div>
      </div>
    </section>
  )
}

function TablaItems({
  filas,
  tipo,
  presupuestoId,
  puedeEditar,
}: {
  filas: Array<{ id: number; descripcion: string; cantidad: number; precio: number }>
  tipo: "servicio" | "repuesto"
  presupuestoId: string
  puedeEditar: boolean
}) {
  return (
    <div className="rounded-lg border border-tp-line-soft overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-tp-surface-low/50">
          <tr className="border-b border-tp-line-soft">
            <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-tp-cyan">
              {tipo === "servicio" ? "Servicio" : "Repuesto"}
            </th>
            <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-20">Cant.</th>
            <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-32">
              {tipo === "servicio" ? "Precio" : "Unitario"}
            </th>
            <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-widest text-tp-cyan w-32">Subtotal</th>
            {puedeEditar && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="border-b border-tp-line-soft last:border-0">
              <td className="px-4 py-2 text-tp-text">{f.descripcion}</td>
              <td className="px-4 py-2 text-right font-mono text-tp-secondary">{f.cantidad}</td>
              <td className="px-4 py-2 text-right font-mono text-tp-secondary">{formatPesos(f.precio)}</td>
              <td className="px-4 py-2 text-right font-mono text-tp-text font-medium">
                {formatPesos(f.precio * f.cantidad)}
              </td>
              {puedeEditar && (
                <td className="px-2 py-2 text-right">
                  <QuitarItemPresButton
                    itemId={f.id}
                    presupuestoId={presupuestoId}
                    tipo={tipo}
                    descripcion={f.descripcion}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
