import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { OrdenForm } from "@/components/ordenes/OrdenForm"
import { CambiarEstadoOrden } from "@/components/ordenes/CambiarEstadoOrden"
import { AsignarTecnicoOrden } from "@/components/ordenes/AsignarTecnicoOrden"
import { ItemsOrden } from "@/components/ordenes/ItemsOrden"
import { ROL } from "@/lib/constants"
import { formatFecha, formatFechaHora } from "@/lib/utils"
import { ESTADO_ORDEN_LABEL, ESTADO_ORDEN_VARIANT, PRIORIDAD_LABEL, PRIORIDAD_VARIANT } from "@/lib/ordenes-ui"

type OrdenRow = {
  id: string
  id_publico: string
  estado: string
  prioridad: string
  cliente_id: string
  equipo_desc: string | null
  falla_declarada: string | null
  diagnostico: string | null
  tecnico_asignado_id: string | null
  fecha_recepcion: string
  fecha_entrega_estimada: string | null
  fecha_entrega_real: string | null
  notas_internas: string | null
  created_at: string
  updated_at: string
  clientes: {
    id: string
    id_publico: string
    nombre: string
    apellido: string | null
    razon_social: string | null
    tipo: string
    telefono: string | null
  } | null
}

function nombreCliente(c: OrdenRow["clientes"]): string {
  if (!c) return "—"
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export default async function OrdenDetallePage({
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

  const { data: orden } = await supabase
    .from("ordenes")
    .select(`
      id, id_publico, estado, prioridad, cliente_id, equipo_desc, falla_declarada,
      diagnostico, tecnico_asignado_id, fecha_recepcion, fecha_entrega_estimada,
      fecha_entrega_real, notas_internas, created_at, updated_at,
      clientes:cliente_id ( id, id_publico, nombre, apellido, razon_social, tipo, telefono )
    `)
    .eq("id", params.id)
    .maybeSingle()

  if (!orden) notFound()
  const o = orden as unknown as OrdenRow

  // Clientes y tecnicos para el form de edicion (solo si admin)
  const [clientesRes, tecnicosRes] = await Promise.all([
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
  ])

  const clientes = (clientesRes.data ?? []).map((c) => ({
    id: c.id,
    id_publico: c.id_publico,
    label: c.tipo === "EMPRESA" ? (c.razon_social ?? c.nombre) : [c.nombre, c.apellido].filter(Boolean).join(" "),
  }))
  const tecnicos = (tecnicosRes.data ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    rol: t.rol,
  }))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          href="/ordenes"
          className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a órdenes
        </Link>

        <header className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[14px] text-tp-cyan font-semibold tracking-wider">
              {o.id_publico}
            </span>
            <Badge variant={ESTADO_ORDEN_VARIANT[o.estado] ?? "gray"}>
              {ESTADO_ORDEN_LABEL[o.estado] ?? o.estado}
            </Badge>
            <Badge variant={PRIORIDAD_VARIANT[o.prioridad] ?? "gray"}>
              Prioridad {PRIORIDAD_LABEL[o.prioridad] ?? o.prioridad}
            </Badge>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            {nombreCliente(o.clientes)}
          </h1>
          {o.clientes && (
            <p className="text-sm text-tp-muted font-mono">
              {o.clientes.id_publico}
              {o.clientes.telefono && ` · ${o.clientes.telefono}`}
            </p>
          )}
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FactCard label="Recibida" value={formatFecha(o.fecha_recepcion)} />
          <FactCard
            label="Entrega estimada"
            value={o.fecha_entrega_estimada ? formatFecha(o.fecha_entrega_estimada) : "—"}
          />
          <FactCard
            label="Entregada"
            value={o.fecha_entrega_real ? formatFechaHora(o.fecha_entrega_real) : "—"}
          />
        </section>

        {o.equipo_desc && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Equipo
            </p>
            <p className="text-sm text-tp-text whitespace-pre-wrap">{o.equipo_desc}</p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {o.falla_declarada && (
            <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
              <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
                Falla declarada
              </p>
              <p className="text-sm text-tp-secondary whitespace-pre-wrap">{o.falla_declarada}</p>
            </section>
          )}
          {o.diagnostico && (
            <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
              <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
                Diagnóstico
              </p>
              <p className="text-sm text-tp-secondary whitespace-pre-wrap">{o.diagnostico}</p>
            </section>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CambiarEstadoOrden ordenId={o.id} estado={o.estado} />
          {esAdmin && (
            <AsignarTecnicoOrden
              ordenId={o.id}
              tecnicoActualId={o.tecnico_asignado_id}
              tecnicos={tecnicos}
            />
          )}
        </div>

        <ItemsOrden
          ordenId={o.id}
          puedeEditar={
            (esAdmin || o.tecnico_asignado_id === user!.id)
            && o.estado !== "ENTREGADA"
            && o.estado !== "CANCELADA"
          }
        />

        {o.notas_internas && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Notas internas
            </p>
            <p className="text-sm text-tp-secondary whitespace-pre-wrap">{o.notas_internas}</p>
          </section>
        )}

        <p className="text-xs font-mono text-tp-muted">
          Creada {formatFechaHora(o.created_at)} · Actualizada {formatFechaHora(o.updated_at)}
        </p>

        <section className="pt-6 border-t border-tp-line-soft space-y-4">
          <h2 className="font-display text-xl font-semibold">Editar datos</h2>
          <OrdenForm
            mode="edit"
            ordenId={o.id}
            clientes={clientes}
            tecnicos={tecnicos}
            initial={{
              cliente_id: o.cliente_id,
              equipo_desc: o.equipo_desc,
              falla_declarada: o.falla_declarada,
              diagnostico: o.diagnostico,
              prioridad: o.prioridad as "BAJA" | "NORMAL" | "ALTA" | "URGENTE",
              tecnico_asignado_id: o.tecnico_asignado_id,
              fecha_entrega_estimada: o.fecha_entrega_estimada,
              notas_internas: o.notas_internas,
            }}
          />
        </section>
      </div>
    </div>
  )
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4">
      <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">{label}</p>
      <p className="font-display text-lg mt-1 text-tp-text">{value}</p>
    </div>
  )
}
