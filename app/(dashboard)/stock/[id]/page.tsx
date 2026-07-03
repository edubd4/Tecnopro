import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table"
import { RepuestoForm } from "@/components/repuestos/RepuestoForm"
import { MovimientoStockForm } from "@/components/repuestos/MovimientoStockForm"
import { ToggleRepuestoActivoButton } from "@/components/repuestos/ToggleRepuestoActivoButton"
import { ROL } from "@/lib/constants"
import { formatFechaHora, formatPesos } from "@/lib/utils"

type Movimiento = {
  id: number
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE"
  cantidad: number
  stock_anterior: number | null
  stock_nuevo: number | null
  motivo: string | null
  created_at: string
}

const MOV_VARIANT = {
  ENTRADA: "green",
  SALIDA: "red",
  AJUSTE: "amber",
} as const

export default async function RepuestoDetallePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user!.id)
    .single()
  const esAdmin = profile?.rol === ROL.ADMIN

  const { data: repuesto } = await supabase
    .from("repuestos")
    .select("id, id_publico, nombre, codigo, descripcion, categoria, costo, precio_venta, stock_actual, stock_minimo, ubicacion, activo, created_at, updated_at")
    .eq("id", params.id)
    .maybeSingle()

  if (!repuesto) notFound()

  const [movRes, categoriasRes, ubicacionesRes] = await Promise.all([
    supabase
      .from("repuestos_movimientos")
      .select("id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, created_at")
      .eq("repuesto_id", params.id)
      .order("created_at", { ascending: false })
      .limit(50),
    // Categorías y ubicaciones existentes (para el ComboBox del form de edición)
    supabase
      .from("repuestos")
      .select("categoria")
      .eq("activo", true)
      .not("categoria", "is", null),
    supabase
      .from("repuestos")
      .select("ubicacion")
      .eq("activo", true)
      .not("ubicacion", "is", null),
  ])
  const movimientos = movRes.data

  const categoriasExistentes = Array.from(
    new Set(
      ((categoriasRes.data ?? []) as { categoria: string | null }[])
        .map((r) => r.categoria?.trim())
        .filter((c): c is string => !!c),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"))

  const ubicacionesExistentes = Array.from(
    new Set(
      ((ubicacionesRes.data ?? []) as { ubicacion: string | null }[])
        .map((r) => r.ubicacion?.trim())
        .filter((u): u is string => !!u),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"))

  const movs = (movimientos ?? []) as Movimiento[]
  const bajo = repuesto.activo && repuesto.stock_minimo > 0 && repuesto.stock_actual <= repuesto.stock_minimo

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/stock"
          className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a stock
        </Link>

        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[13px] text-tp-cyan font-semibold tracking-wider">
                {repuesto.id_publico}
              </span>
              {repuesto.codigo && (
                <span className="font-mono text-[12px] text-tp-muted">· {repuesto.codigo}</span>
              )}
              <Badge variant={repuesto.activo ? "green" : "gray"}>
                {repuesto.activo ? "ACTIVO" : "INACTIVO"}
              </Badge>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">{repuesto.nombre}</h1>
            {repuesto.categoria && (
              <p className="text-sm text-tp-muted font-mono">{repuesto.categoria}</p>
            )}
          </div>

          {esAdmin && (
            <ToggleRepuestoActivoButton repuestoId={repuesto.id} activo={repuesto.activo} />
          )}
        </header>

        {bajo && (
          <div className="rounded-lg border border-tp-amber/40 bg-tp-amber/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-tp-amber shrink-0 mt-0.5" />
            <p className="text-sm text-tp-text">
              Este repuesto está en <b>alerta de stock</b>: {repuesto.stock_actual} unidad(es), mínimo {repuesto.stock_minimo}.
            </p>
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Stock actual" value={String(repuesto.stock_actual)} highlight={bajo} />
          <StatCard label="Stock mínimo" value={String(repuesto.stock_minimo)} />
          <StatCard label="Costo" value={formatPesos(Number(repuesto.costo))} />
          <StatCard label="Precio venta" value={formatPesos(Number(repuesto.precio_venta))} />
        </section>

        {repuesto.ubicacion && (
          <p className="text-sm text-tp-secondary">
            <span className="font-mono text-[10px] text-tp-muted uppercase tracking-widest mr-2">Ubicación</span>
            {repuesto.ubicacion}
          </p>
        )}

        {repuesto.descripcion && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Descripción
            </p>
            <p className="text-sm text-tp-secondary whitespace-pre-wrap">
              {repuesto.descripcion}
            </p>
          </section>
        )}

        {esAdmin && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-4">
            <div>
              <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase">
                Registrar movimiento
              </p>
              <h2 className="font-display text-lg font-semibold mt-1">Entrada, salida o ajuste</h2>
            </div>
            <MovimientoStockForm
              repuestoId={repuesto.id}
              stockActual={repuesto.stock_actual}
            />
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Movimientos recientes</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Fecha</TableHead>
                <TableHead className="w-[110px]">Tipo</TableHead>
                <TableHead className="w-[100px] text-right">Cant.</TableHead>
                <TableHead className="w-[120px] text-right">Stock resultante</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.length === 0 ? (
                <TableEmpty colSpan={5}>
                  Todavía no hay movimientos.
                </TableEmpty>
              ) : (
                movs.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs text-tp-muted">
                      {formatFechaHora(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={MOV_VARIANT[m.tipo]}>{m.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{m.cantidad}</TableCell>
                    <TableCell className="text-right font-mono">
                      {m.stock_anterior ?? "—"} → <b className="text-tp-text">{m.stock_nuevo ?? "—"}</b>
                    </TableCell>
                    <TableCell className="text-tp-muted">{m.motivo ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>

        <p className="text-xs font-mono text-tp-muted">
          Creado {formatFechaHora(repuesto.created_at)} · Actualizado {formatFechaHora(repuesto.updated_at)}
        </p>

        {esAdmin && (
          <section className="pt-6 border-t border-tp-line-soft space-y-4">
            <h2 className="font-display text-xl font-semibold">Editar datos</h2>
            <RepuestoForm
              mode="edit"
              repuestoId={repuesto.id}
              categoriasExistentes={categoriasExistentes}
              ubicacionesExistentes={ubicacionesExistentes}
              initial={{
                nombre: repuesto.nombre,
                codigo: repuesto.codigo,
                descripcion: repuesto.descripcion,
                categoria: repuesto.categoria,
                costo: Number(repuesto.costo),
                precio_venta: Number(repuesto.precio_venta),
                stock_minimo: repuesto.stock_minimo,
                ubicacion: repuesto.ubicacion,
                activo: repuesto.activo,
              }}
            />
          </section>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-tp-amber/40 bg-tp-amber/10" : "border-tp-line-soft bg-tp-card"}`}>
      <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">{label}</p>
      <p className={`font-display text-2xl mt-1 ${highlight ? "text-tp-amber" : "text-tp-text"}`}>
        {value}
      </p>
    </div>
  )
}
