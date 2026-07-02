import Link from "next/link"
import { Plus } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table"
import { SearchInput } from "@/components/ui/search-input"
import { PresupuestoListRow } from "@/components/presupuestos/PresupuestoListRow"

type PresupuestoRow = {
  id: string
  id_publico: string
  cliente_id: string | null
  titulo: string
  estado: string
  validez_hasta: string
  created_at: string
  clientes: {
    id_publico: string
    nombre: string
    apellido: string | null
    razon_social: string | null
    tipo: string
  } | null
}

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const supabase = await createServerClient()
  const q = (searchParams.q ?? "").trim()

  let query = supabase
    .from("presupuestos")
    .select(`
      id, id_publico, cliente_id, titulo, estado, validez_hasta, created_at,
      clientes:cliente_id ( id_publico, nombre, apellido, razon_social, tipo )
    `)
    .order("created_at", { ascending: false })
    .limit(200)

  if (q.length > 0) {
    const like = `%${q}%`
    query = query.or(`id_publico.ilike.${like},titulo.ilike.${like}`)
  }

  const { data: presupuestos, error } = await query
  const rows = (presupuestos ?? []) as unknown as PresupuestoRow[]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
              Módulo · Presupuestos
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Presupuestos y cotizaciones
            </h1>
            <p className="text-tp-secondary mt-1">
              Cotizá con servicios y repuestos, generá el mensaje listo para copiar al cliente.
            </p>
          </div>

          <Button asChild>
            <Link href="/presupuestos/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo presupuesto
            </Link>
          </Button>
        </header>

        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput basePath="/presupuestos" placeholder="Buscar por PRES o título…" />
          <p className="font-mono text-[11px] text-tp-muted self-center">
            {rows.length} presupuesto{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        <p className="font-mono text-[10.5px] text-tp-muted -mt-2">
          Tip: click en la fila abre el presupuesto · click en el cliente abre su ficha · cambiá el estado desde el select
        </p>

        {error ? (
          <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
            Error al cargar presupuestos: {error.message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-[130px]">Estado</TableHead>
                <TableHead className="w-[120px]">Válido hasta</TableHead>
                <TableHead className="w-[120px]">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>
                  {q
                    ? `No hay presupuestos que coincidan con "${q}".`
                    : "Todavía no hay presupuestos cargados. Creá el primero arriba."}
                </TableEmpty>
              ) : (
                rows.map((p) => (
                  <PresupuestoListRow
                    key={p.id}
                    id={p.id}
                    id_publico={p.id_publico}
                    cliente_id={p.cliente_id}
                    titulo={p.titulo}
                    estado={p.estado}
                    validez_hasta={p.validez_hasta}
                    created_at={p.created_at}
                    clientes={p.clientes}
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
