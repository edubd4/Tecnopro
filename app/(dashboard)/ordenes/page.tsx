import Link from "next/link"
import { Plus } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table"
import { SearchInput } from "@/components/ui/search-input"
import { EstadoFilterSelect } from "@/components/ordenes/EstadoFilterSelect"
import { OrdenListRow } from "@/components/ordenes/OrdenListRow"

type OrdenRow = {
  id: string
  id_publico: string
  cliente_id: string | null
  estado: string
  prioridad: string
  equipo_desc: string | null
  fecha_recepcion: string
  fecha_entrega_estimada: string | null
  clientes: { id_publico: string; nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
  tecnico: { nombre: string } | null
}

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: { q?: string; estado?: string }
}) {
  const supabase = await createServerClient()

  const q = (searchParams.q ?? "").trim()
  const filtroEstado = searchParams.estado ?? ""

  let query = supabase
    .from("ordenes")
    .select(`
      id, id_publico, cliente_id, estado, prioridad, equipo_desc, fecha_recepcion, fecha_entrega_estimada,
      clientes:cliente_id ( id_publico, nombre, apellido, razon_social, tipo ),
      tecnico:tecnico_asignado_id ( nombre )
    `)
    .order("fecha_recepcion", { ascending: false })
    .limit(200)

  if (filtroEstado === "ACTIVAS") {
    query = query.not("estado", "in", "(ENTREGADA,CANCELADA)")
  } else if (filtroEstado) {
    query = query.eq("estado", filtroEstado)
  }

  if (q.length > 0) {
    const like = `%${q}%`
    query = query.or(`id_publico.ilike.${like},equipo_desc.ilike.${like}`)
  }

  const { data: ordenes, error } = await query
  const rows = (ordenes ?? []) as unknown as OrdenRow[]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
              Módulo · Órdenes
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Órdenes de trabajo
            </h1>
            <p className="text-tp-secondary mt-1">
              Alta y seguimiento de trabajos por cliente.
            </p>
          </div>

          <Button asChild>
            <Link href="/ordenes/nuevo">
              <Plus className="w-4 h-4" />
              Nueva orden
            </Link>
          </Button>
        </header>

        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput basePath="/ordenes" placeholder="Buscar por OT, equipo…" />
          <EstadoFilterSelect />
          <p className="font-mono text-[11px] text-tp-muted self-center">
            {rows.length} orden{rows.length === 1 ? "" : "es"}
          </p>
        </div>

        <p className="font-mono text-[10.5px] text-tp-muted -mt-2">
          Tip: click en la fila abre la orden · click en el nombre abre el cliente · cambiá el estado desde el select
        </p>

        {error ? (
          <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
            Error al cargar órdenes: {error.message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead className="w-[160px]">Estado</TableHead>
                <TableHead className="w-[100px]">Prioridad</TableHead>
                <TableHead className="w-[120px]">Técnico</TableHead>
                <TableHead className="w-[120px]">Recibida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7}>
                  {q || filtroEstado
                    ? "No hay órdenes que coincidan con el filtro."
                    : "Todavía no hay órdenes cargadas. Creá la primera arriba."}
                </TableEmpty>
              ) : (
                rows.map((o) => (
                  <OrdenListRow
                    key={o.id}
                    id={o.id}
                    id_publico={o.id_publico}
                    cliente_id={o.cliente_id}
                    estado={o.estado}
                    prioridad={o.prioridad}
                    equipo_desc={o.equipo_desc}
                    fecha_recepcion={o.fecha_recepcion}
                    clientes={o.clientes}
                    tecnico={o.tecnico}
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
