import Link from "next/link"
import { Plus, Receipt, Tag, TrendingDown } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell, TableEmpty } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatPesos, formatFecha } from "@/lib/utils"
import { METODO_PAGO_LABEL } from "@/lib/caja-ui"
import { rangoMesActual, nombreMes } from "@/lib/gastos-ui"

type GastoRow = {
  id: string
  id_publico: string
  monto: number
  descripcion: string
  fecha: string
  categoria: { id: number; nombre: string } | null
  movimiento: { metodo_pago: string } | null
}

type CategoriaOption = {
  id: number
  nombre: string
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: { categoria?: string }
}) {
  const supabase = await createServerClient()
  const { desde, hasta } = rangoMesActual()

  const filtroCategoria = searchParams.categoria ? Number(searchParams.categoria) : null

  // Query base
  let query = supabase
    .from("gastos")
    .select(`
      id, id_publico, monto, descripcion, fecha,
      categoria:categoria_id ( id, nombre ),
      movimiento:movimiento_id ( metodo_pago )
    `)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200)

  if (filtroCategoria) {
    query = query.eq("categoria_id", filtroCategoria)
  }

  const [gastosRes, resumenMesRes, resumenPorCategoriaRes, categoriasRes] = await Promise.all([
    query,
    supabase
      .from("gastos")
      .select("monto")
      .gte("fecha", desde)
      .lt("fecha", hasta),
    supabase
      .from("gastos")
      .select(`monto, categoria:categoria_id ( id, nombre )`)
      .gte("fecha", desde)
      .lt("fecha", hasta),
    supabase
      .from("categorias_gasto")
      .select("id, nombre")
      .eq("activo", true)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true }),
  ])

  const rows = (gastosRes.data ?? []) as unknown as GastoRow[]
  const totalMes = (resumenMesRes.data ?? []).reduce((s, g) => s + Number(g.monto), 0)
  const cantMes = (resumenMesRes.data ?? []).length
  const categorias = (categoriasRes.data ?? []) as CategoriaOption[]

  // Top 3 categorias del mes
  const porCategoria: Record<string, number> = {}
  for (const g of (resumenPorCategoriaRes.data ?? []) as unknown as {
    monto: number
    categoria: { id: number; nombre: string } | null
  }[]) {
    const nombre = g.categoria?.nombre ?? "—"
    porCategoria[nombre] = (porCategoria[nombre] ?? 0) + Number(g.monto)
  }
  const topCategoria = Object.entries(porCategoria)
    .sort(([, a], [, b]) => b - a)[0]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
              Módulo · Gastos
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Egresos del negocio
            </h1>
            <p className="text-tp-secondary mt-1">
              Cada gasto registra automáticamente un egreso en caja. Son inmutables — corrigelos con un ajuste desde /caja.
            </p>
          </div>

          <Button asChild>
            <Link href="/gastos/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo gasto
            </Link>
          </Button>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ResumenCard
            icon={<TrendingDown className="w-4 h-4" />}
            label={`Total ${nombreMes()}`}
            value={formatPesos(totalMes)}
            tone="red"
          />
          <ResumenCard
            icon={<Receipt className="w-4 h-4" />}
            label="Gastos del mes"
            value={String(cantMes)}
            tone="cyan"
          />
          <ResumenCard
            icon={<Tag className="w-4 h-4" />}
            label="Categoría top"
            value={topCategoria ? `${topCategoria[0]} · ${formatPesos(topCategoria[1])}` : "—"}
            tone="amber"
          />
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10.5px] text-tp-muted uppercase tracking-widest mr-1">
            Filtrar categoría:
          </span>
          <Link
            href="/gastos"
            className={`px-3 py-1 rounded-md text-xs font-mono border ${
              !filtroCategoria
                ? "border-tp-cyan/50 bg-tp-cyan/10 text-tp-cyan"
                : "border-tp-line text-tp-muted hover:text-tp-text"
            }`}
          >
            Todas
          </Link>
          {categorias.map((c) => (
            <Link
              key={c.id}
              href={`/gastos?categoria=${c.id}`}
              className={`px-3 py-1 rounded-md text-xs font-mono border ${
                filtroCategoria === c.id
                  ? "border-tp-cyan/50 bg-tp-cyan/10 text-tp-cyan"
                  : "border-tp-line text-tp-muted hover:text-tp-text"
              }`}
            >
              {c.nombre}
            </Link>
          ))}
        </div>

        {gastosRes.error ? (
          <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
            Error al cargar gastos: {gastosRes.error.message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead className="w-[140px]">Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[110px]">Método</TableHead>
                <TableHead className="w-[130px] text-right">Monto</TableHead>
                <TableHead className="w-[110px]">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>
                  {filtroCategoria
                    ? "No hay gastos en esta categoría."
                    : "Todavía no hay gastos registrados."}
                </TableEmpty>
              ) : (
                rows.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-tp-cyan">{g.id_publico}</TableCell>
                    <TableCell>
                      <Badge variant="gray">{g.categoria?.nombre ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-tp-text">{g.descripcion}</TableCell>
                    <TableCell className="text-tp-secondary text-xs">
                      {METODO_PAGO_LABEL[g.movimiento?.metodo_pago ?? ""] ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-tp-red">
                      − {formatPesos(Number(g.monto))}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-tp-muted">
                      {formatFecha(g.fecha)}
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
  tone: "red" | "cyan" | "amber"
}) {
  const toneClasses = {
    red: "text-tp-red",
    cyan: "text-tp-cyan",
    amber: "text-tp-amber",
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
