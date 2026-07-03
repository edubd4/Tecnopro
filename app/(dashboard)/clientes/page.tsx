import Link from "next/link"
import { Plus } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table"
import { LinkRow } from "@/components/ui/link-row"
import { ClientesSearchInput } from "@/components/clientes/ClientesSearchInput"
import { ROL } from "@/lib/constants"

type Cliente = {
  id: string
  id_publico: string
  tipo: "PARTICULAR" | "EMPRESA"
  nombre: string
  apellido: string | null
  razon_social: string | null
  telefono: string | null
  ciudad: string | null
  estado: "ACTIVO" | "INACTIVO"
}

function nombreVisible(c: Cliente): string {
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export default async function ClientesPage({
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
    .from("clientes")
    .select("id, id_publico, tipo, nombre, apellido, razon_social, telefono, ciudad, estado")
    .order("created_at", { ascending: false })
    .limit(100)

  if (q.length > 0) {
    const like = `%${q}%`
    query = query.or(
      [
        `nombre.ilike.${like}`,
        `apellido.ilike.${like}`,
        `razon_social.ilike.${like}`,
        `telefono.ilike.${like}`,
        `documento.ilike.${like}`,
        `id_publico.ilike.${like}`,
      ].join(",")
    )
  }

  const { data: clientes, error } = await query
  const rows = (clientes ?? []) as Cliente[]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
              Módulo · Clientes
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Cartera de clientes
            </h1>
            <p className="text-tp-secondary mt-1">
              Buscá por nombre, teléfono, DNI o ID legible.
            </p>
          </div>

          {esAdmin && (
            <Button asChild>
              <Link href="/clientes/nuevo">
                <Plus className="w-4 h-4" />
                Nuevo cliente
              </Link>
            </Button>
          )}
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <ClientesSearchInput />
          <p className="font-mono text-[11px] text-tp-muted">
            {rows.length} resultado{rows.length === 1 ? "" : "s"}
            {q && ` para "${q}"`}
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
            Error al cargar clientes: {error.message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[130px]">Tipo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead className="w-[110px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>
                  {q
                    ? `No hay clientes que coincidan con "${q}".`
                    : esAdmin
                    ? "Todavía no cargaste ningún cliente. Empezá con el botón de arriba."
                    : "No hay clientes cargados."}
                </TableEmpty>
              ) : (
                rows.map((c) => (
                  <LinkRow key={c.id} href={`/clientes/${c.id}`}>
                    <TableCell className="font-mono text-tp-cyan">{c.id_publico}</TableCell>
                    <TableCell className="text-tp-text font-medium">{nombreVisible(c)}</TableCell>
                    <TableCell>
                      <Badge variant={c.tipo === "EMPRESA" ? "violet" : "cyan"}>
                        {c.tipo === "EMPRESA" ? "Empresa" : "Particular"}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.telefono ?? "—"}</TableCell>
                    <TableCell>{c.ciudad ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.estado === "ACTIVO" ? "green" : "gray"}>
                        {c.estado}
                      </Badge>
                    </TableCell>
                  </LinkRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
