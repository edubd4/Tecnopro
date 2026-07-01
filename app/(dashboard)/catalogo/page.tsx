import Link from "next/link"
import { Plus } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table"
import { SearchInput } from "@/components/ui/search-input"
import { ROL } from "@/lib/constants"
import { formatPesos } from "@/lib/utils"

type Servicio = {
  id: string
  id_publico: string
  nombre: string
  categoria: string
  precio_base: number
  tiempo_estimado_min: number | null
  activo: boolean
}

const CATEGORIA_LABEL: Record<string, string> = {
  REPARACION: "Reparación",
  REDES: "Redes",
  ACONDICIONAMIENTO: "Acondicionamiento",
  INSTALACION: "Instalación",
  DIAGNOSTICO: "Diagnóstico",
  OTRO: "Otro",
}

export default async function CatalogoPage({
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
    .from("servicios")
    .select("id, id_publico, nombre, categoria, precio_base, tiempo_estimado_min, activo")
    .order("activo", { ascending: false })
    .order("nombre", { ascending: true })
    .limit(200)

  if (q.length > 0) {
    const like = `%${q}%`
    query = query.or(`nombre.ilike.${like},id_publico.ilike.${like}`)
  }

  const { data: servicios, error } = await query
  const rows = (servicios ?? []) as Servicio[]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
              Módulo · Catálogo
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Servicios del catálogo
            </h1>
            <p className="text-tp-secondary mt-1">
              Estos son los servicios reutilizables en órdenes y presupuestos.
            </p>
          </div>

          {esAdmin && (
            <Button asChild>
              <Link href="/catalogo/nuevo">
                <Plus className="w-4 h-4" />
                Nuevo servicio
              </Link>
            </Button>
          )}
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput basePath="/catalogo" placeholder="Buscar por nombre o ID…" />
          <p className="font-mono text-[11px] text-tp-muted">
            {rows.length} servicio{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
            Error al cargar servicios: {error.message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[170px]">Categoría</TableHead>
                <TableHead className="w-[140px] text-right">Precio</TableHead>
                <TableHead className="w-[100px] text-right">Min.</TableHead>
                <TableHead className="w-[110px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>
                  {q
                    ? `No hay servicios que coincidan con "${q}".`
                    : esAdmin
                    ? "Cargá tu primer servicio para empezar a usarlo en presupuestos."
                    : "No hay servicios cargados todavía."}
                </TableEmpty>
              ) : (
                rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-tp-cyan">
                      <Link href={`/catalogo/${s.id}`}>{s.id_publico}</Link>
                    </TableCell>
                    <TableCell className="text-tp-text font-medium">
                      <Link href={`/catalogo/${s.id}`}>{s.nombre}</Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="cyan">
                        {CATEGORIA_LABEL[s.categoria] ?? s.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPesos(Number(s.precio_base))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-tp-muted">
                      {s.tiempo_estimado_min ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.activo ? "green" : "gray"}>
                        {s.activo ? "ACTIVO" : "INACTIVO"}
                      </Badge>
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
