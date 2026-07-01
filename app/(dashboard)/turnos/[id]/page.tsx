import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { TurnoForm } from "@/components/turnos/TurnoForm"
import { CambiarEstadoTurnoBloque } from "@/components/turnos/CambiarEstadoTurno"
import { formatFechaHora } from "@/lib/utils"
import { ESTADO_TURNO_LABEL, ESTADO_TURNO_VARIANT } from "@/lib/turnos-ui"

type TurnoRow = {
  id: string
  id_publico: string
  titulo: string
  descripcion: string | null
  cliente_id: string | null
  orden_id: string | null
  tecnico_id: string | null
  fecha_inicio: string
  fecha_fin: string
  estado: string
  color: string | null
  notas_internas: string | null
  created_at: string
  updated_at: string
  clientes: { id_publico: string; nombre: string; apellido: string | null; razon_social: string | null; tipo: string } | null
  ordenes: { id_publico: string; equipo_desc: string | null } | null
  tecnico: { nombre: string } | null
}

function nombreCliente(c: TurnoRow["clientes"]): string | null {
  if (!c) return null
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

function labelClienteRaw(c: {
  nombre: string
  apellido: string | null
  razon_social: string | null
  tipo: string
}): string {
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

// Convierte ISO timestamp a formato datetime-local para el <input>
function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const h = String(d.getHours()).padStart(2, "0")
  const mn = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${day}T${h}:${mn}`
}

export default async function TurnoDetallePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerClient()

  const { data: turno } = await supabase
    .from("turnos")
    .select(`
      id, id_publico, titulo, descripcion, cliente_id, orden_id, tecnico_id,
      fecha_inicio, fecha_fin, estado, color, notas_internas, created_at, updated_at,
      clientes:cliente_id ( id_publico, nombre, apellido, razon_social, tipo ),
      ordenes:orden_id ( id_publico, equipo_desc ),
      tecnico:tecnico_id ( nombre )
    `)
    .eq("id", params.id)
    .maybeSingle()

  if (!turno) notFound()
  const t = turno as unknown as TurnoRow

  const [clientesRes, tecnicosRes, ordenesRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, id_publico, nombre, apellido, razon_social, tipo")
      .eq("estado", "ACTIVO")
      .order("nombre", { ascending: true })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, nombre, rol")
      .eq("activo", true)
      .in("rol", ["admin", "tecnico"])
      .order("nombre", { ascending: true }),
    supabase
      .from("ordenes")
      .select("id, id_publico, equipo_desc, estado")
      .order("fecha_recepcion", { ascending: false })
      .limit(200),
  ])

  const clientes = (clientesRes.data ?? []).map((c) => ({
    id: c.id, id_publico: c.id_publico, label: labelClienteRaw(c),
  }))
  const tecnicos = (tecnicosRes.data ?? []).map((tc) => ({
    id: tc.id, nombre: tc.nombre, rol: tc.rol,
  }))
  const ordenes = (ordenesRes.data ?? []).map((o) => ({
    id: o.id, id_publico: o.id_publico, label: o.equipo_desc ?? o.estado,
  }))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/turnos"
          className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la agenda
        </Link>

        <header className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[13px] text-tp-cyan font-semibold tracking-wider">
              {t.id_publico}
            </span>
            <Badge variant={ESTADO_TURNO_VARIANT[t.estado] ?? "gray"}>
              {ESTADO_TURNO_LABEL[t.estado] ?? t.estado}
            </Badge>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            {t.titulo}
          </h1>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-tp-surface-mid border border-tp-line flex items-center justify-center text-tp-cyan shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
                Inicio
              </p>
              <p className="text-sm text-tp-text mt-1">
                {formatFechaHora(t.fecha_inicio)}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-tp-surface-mid border border-tp-line flex items-center justify-center text-tp-cyan shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
                Fin
              </p>
              <p className="text-sm text-tp-text mt-1">
                {formatFechaHora(t.fecha_fin)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4">
            <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
              Técnico
            </p>
            <p className="text-sm text-tp-text mt-1">
              {t.tecnico?.nombre ?? "Sin asignar"}
            </p>
          </div>
          <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4">
            <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
              Cliente
            </p>
            <p className="text-sm text-tp-text mt-1">
              {t.cliente_id ? (
                <Link href={`/clientes/${t.cliente_id}`} className="hover:text-tp-cyan hover:underline">
                  {nombreCliente(t.clientes) ?? "—"}
                </Link>
              ) : (
                <span className="text-tp-muted">—</span>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4">
            <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
              Orden vinculada
            </p>
            <p className="text-sm text-tp-text mt-1">
              {t.orden_id && t.ordenes ? (
                <Link href={`/ordenes/${t.orden_id}`} className="hover:text-tp-cyan hover:underline font-mono">
                  {t.ordenes.id_publico}
                </Link>
              ) : (
                <span className="text-tp-muted">—</span>
              )}
            </p>
          </div>
        </section>

        {t.descripcion && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Descripción
            </p>
            <p className="text-sm text-tp-secondary whitespace-pre-wrap">{t.descripcion}</p>
          </section>
        )}

        <CambiarEstadoTurnoBloque turnoId={t.id} estado={t.estado} />

        {t.notas_internas && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Notas internas
            </p>
            <p className="text-sm text-tp-secondary whitespace-pre-wrap">{t.notas_internas}</p>
          </section>
        )}

        <p className="text-xs font-mono text-tp-muted">
          Creado {formatFechaHora(t.created_at)} · Actualizado {formatFechaHora(t.updated_at)}
        </p>

        <section className="pt-6 border-t border-tp-line-soft space-y-4">
          <h2 className="font-display text-xl font-semibold">Editar datos</h2>
          <TurnoForm
            mode="edit"
            turnoId={t.id}
            clientes={clientes}
            tecnicos={tecnicos}
            ordenes={ordenes}
            initial={{
              titulo: t.titulo,
              descripcion: t.descripcion,
              cliente_id: t.cliente_id,
              orden_id: t.orden_id,
              tecnico_id: t.tecnico_id,
              fecha_inicio: isoToLocalInput(t.fecha_inicio),
              fecha_fin: isoToLocalInput(t.fecha_fin),
              color: t.color,
              notas_internas: t.notas_internas,
            }}
          />
        </section>
      </div>
    </div>
  )
}
