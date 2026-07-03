import Link from "next/link"
import { AlertTriangle, Plus } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table"
import { LinkRow } from "@/components/ui/link-row"
import { SearchInput } from "@/components/ui/search-input"
import { ROL } from "@/lib/constants"
import { formatPesos } from "@/lib/utils"

type Repuesto = {
  id: string
  id_publico: string
  nombre: string
  codigo: string | null
  categoria: string | null
  costo: number
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  ubicacion: string | null
  activo: boolean
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: { q?: string }
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

  const q = (searchParams.q ?? "").trim()

  let query = supabase
    .from("repuestos")
    .select("id, id_publico, nombre, codigo, categoria, costo, precio_venta, stock_actual, stock_minimo, ubicacion, activo")
    .order("activo", { ascending: false })
    .order("nombre", { ascending: true })
    .limit(300)

  if (q.length > 0) {
    const like = `%${q}%`
    query = query.or(
      [
        `nombre.ilike.${like}`,
        `codigo.ilike.${like}`,
        `categoria.ilike.${like}`,
        `id_publico.ilike.${like}`,
      ].join(",")
    )
  }

  const { data: repuestos, error } = await query
  const rows = (repuestos ?? []) as Repuesto[]
  const enAlerta = rows.filter((r) => r.activo && r.stock_minimo > 0 && r.stock_actual <= r.stock_minimo)

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
              Módulo · Stock
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Inventario de repuestos
            </h1>
            <p className="text-tp-secondary mt-1">
              Cargá los movimientos desde la ficha de cada repuesto.
            </p>
          </div>

          {esAdmin && (
            <Button asChild>
              <Link href="/stock/nuevo">
                <Plus className="w-4 h-4" />
                Nuevo repuesto
              </Link>
            </Button>
          )}
        </header>

        {enAlerta.length > 0 && (
          <div className="rounded-xl border border-tp-amber/40 bg-tp-amber/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-tp-amber shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-display font-semibold text-tp-text">
                {enAlerta.length} repuesto{enAlerta.length === 1 ? "" : "s"} bajo mínimo
              </p>
              <p className="text-sm text-tp-secondary">
                {enAlerta.slice(0, 5).map((r) => r.nombre).join(", ")}
                {enAlerta.length > 5 && `, y ${enAlerta.length - 5} más`}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput basePath="/stock" placeholder="Buscar por nombre, código, categoría o ID…" />
          <p className="font-mono text-[11px] text-tp-muted">
            {rows.length} repuesto{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
            Error al cargar repuestos: {error.message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead className="w-[100px] text-right">Stock</TableHead>
                <TableHead className="w-[140px] text-right">Costo</TableHead>
                <TableHead className="w-[140px] text-right">Precio</TableHead>
                <TableHead className="w-[110px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7}>
                  {q
                    ? `No hay repuestos que coincidan con "${q}".`
                    : esAdmin
                    ? "Cargá tu primer repuesto y después registrás la entrada de stock."
                    : "No hay repuestos cargados todavía."}
                </TableEmpty>
              ) : (
                rows.map((r) => {
                  const bajo = r.activo && r.stock_minimo > 0 && r.stock_actual <= r.stock_minimo
                  return (
                    <LinkRow key={r.id} href={`/stock/${r.id}`}>
                      <TableCell className="font-mono text-tp-cyan">{r.id_publico}</TableCell>
                      <TableCell className="text-tp-text font-medium">
                        {r.nombre}
                        {r.categoria && (
                          <span className="ml-2 text-xs text-tp-muted">· {r.categoria}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-tp-muted">
                        {r.codigo ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {bajo ? (
                          <Badge variant="amber">{r.stock_actual}</Badge>
                        ) : (
                          <span className="text-tp-text">{r.stock_actual}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-tp-muted">
                        {formatPesos(Number(r.costo))}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPesos(Number(r.precio_venta))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.activo ? "green" : "gray"}>
                          {r.activo ? "ACTIVO" : "INACTIVO"}
                        </Badge>
                      </TableCell>
                    </LinkRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
