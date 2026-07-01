import Link from "next/link"
import { Plus } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table"
import { SemanaCalendario } from "@/components/turnos/SemanaCalendario"
import { NavegadorSemana } from "@/components/turnos/NavegadorSemana"
import { formatFechaHora } from "@/lib/utils"
import { ESTADO_TURNO_LABEL, ESTADO_TURNO_VARIANT } from "@/lib/turnos-ui"

function lunesDeSemana(base: Date): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()              // 0=domingo, 1=lunes, ..., 6=sábado
  const diff = (dow + 6) % 7          // días desde el lunes
  d.setDate(d.getDate() - diff)
  return d
}

type TurnoRow = {
  id: string
  id_publico: string
  titulo: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  tecnico: { nombre: string } | null
  cliente: { id_publico: string; nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
}

function nombreCliente(c: TurnoRow["cliente"]): string | null {
  if (!c) return null
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: { vista?: string; semana?: string }
}) {
  const supabase = await createServerClient()
  const vista = searchParams.vista === "lista" ? "lista" : "semana"

  const baseSemana = searchParams.semana ? new Date(searchParams.semana + "T00:00:00") : new Date()
  const weekStart = lunesDeSemana(baseSemana)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const query = supabase
    .from("turnos")
    .select(`
      id, id_publico, titulo, fecha_inicio, fecha_fin, estado,
      tecnico:tecnico_id ( nombre ),
      cliente:cliente_id ( id_publico, nombre, apellido, razon_social, tipo )
    `)
    .order("fecha_inicio", { ascending: true })

  if (vista === "semana") {
    query.gte("fecha_inicio", weekStart.toISOString()).lt("fecha_inicio", weekEnd.toISOString())
  } else {
    // Lista: proximos 60 dias
    const hasta = new Date()
    hasta.setDate(hasta.getDate() + 60)
    query.gte("fecha_inicio", new Date().toISOString()).lt("fecha_inicio", hasta.toISOString()).limit(200)
  }

  const { data: turnos, error } = await query
  const rows = (turnos ?? []) as unknown as TurnoRow[]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
              Módulo · Turnos
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              Agenda de turnos
            </h1>
            <p className="text-tp-secondary mt-1">
              Vista semana con detección de superposiciones al asignar.
            </p>
          </div>

          <Button asChild>
            <Link href="/turnos/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo turno
            </Link>
          </Button>
        </header>

        {/* Tabs vista */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/turnos"
            className={`px-3 py-1.5 rounded-md text-sm font-mono border ${
              vista === "semana"
                ? "border-tp-cyan/50 bg-tp-cyan/10 text-tp-cyan"
                : "border-tp-line text-tp-muted hover:text-tp-text"
            }`}
          >
            Semana
          </Link>
          <Link
            href="/turnos?vista=lista"
            className={`px-3 py-1.5 rounded-md text-sm font-mono border ${
              vista === "lista"
                ? "border-tp-cyan/50 bg-tp-cyan/10 text-tp-cyan"
                : "border-tp-line text-tp-muted hover:text-tp-text"
            }`}
          >
            Lista
          </Link>

          {vista === "semana" && (
            <div className="ml-auto">
              <NavegadorSemana weekStart={weekStart} />
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
            Error al cargar turnos: {error.message}
          </div>
        )}

        {vista === "semana" ? (
          <SemanaCalendario
            weekStart={weekStart}
            turnos={rows.map((t) => ({
              id: t.id,
              id_publico: t.id_publico,
              titulo: t.titulo,
              fecha_inicio: t.fecha_inicio,
              fecha_fin: t.fecha_fin,
              estado: t.estado,
              tecnico_nombre: t.tecnico?.nombre ?? null,
            }))}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-[160px]">Fecha</TableHead>
                <TableHead className="w-[130px]">Estado</TableHead>
                <TableHead className="w-[140px]">Técnico</TableHead>
                <TableHead>Cliente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>
                  No hay turnos próximos.
                </TableEmpty>
              ) : (
                rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-tp-cyan">
                      <Link href={`/turnos/${t.id}`}>{t.id_publico}</Link>
                    </TableCell>
                    <TableCell className="text-tp-text font-medium">
                      <Link href={`/turnos/${t.id}`}>{t.titulo}</Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-tp-muted">
                      {formatFechaHora(t.fecha_inicio)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_TURNO_VARIANT[t.estado] ?? "gray"}>
                        {ESTADO_TURNO_LABEL[t.estado] ?? t.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-tp-muted text-sm">
                      {t.tecnico?.nombre ?? "Sin asignar"}
                    </TableCell>
                    <TableCell className="text-tp-muted text-sm">
                      {nombreCliente(t.cliente) ?? "—"}
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
