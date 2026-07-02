import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { PresupuestoForm } from "@/components/presupuestos/PresupuestoForm"
import { CambiarEstadoPresupuestoBloque } from "@/components/presupuestos/CambiarEstadoPresupuesto"
import { ItemsPresupuesto } from "@/components/presupuestos/ItemsPresupuesto"
import { MensajePresupuesto } from "@/components/presupuestos/MensajePresupuesto"
import { ROL } from "@/lib/constants"
import { formatFecha, formatFechaHora } from "@/lib/utils"
import { ESTADO_PRES_LABEL, ESTADO_PRES_VARIANT } from "@/lib/presupuestos-ui"

type PresupuestoRow = {
  id: string
  id_publico: string
  cliente_id: string
  orden_id: string | null
  titulo: string
  descripcion: string | null
  estado: string
  validez_hasta: string
  margen_pct: number
  mensaje_generado: string | null
  notas_internas: string | null
  enviado_at: string | null
  respondido_at: string | null
  created_at: string
  updated_at: string
  clientes: {
    id_publico: string
    nombre: string
    apellido: string | null
    razon_social: string | null
    tipo: string
    telefono: string | null
  } | null
  ordenes: { id_publico: string; equipo_desc: string | null } | null
}

function nombreCliente(c: PresupuestoRow["clientes"]): string {
  if (!c) return "—"
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

export default async function PresupuestoDetallePage({
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

  const { data: presupuesto } = await supabase
    .from("presupuestos")
    .select(`
      id, id_publico, cliente_id, orden_id, titulo, descripcion, estado,
      validez_hasta, margen_pct, mensaje_generado, notas_internas,
      enviado_at, respondido_at, created_at, updated_at,
      clientes:cliente_id ( id_publico, nombre, apellido, razon_social, tipo, telefono ),
      ordenes:orden_id ( id_publico, equipo_desc )
    `)
    .eq("id", params.id)
    .maybeSingle()

  if (!presupuesto) notFound()
  const p = presupuesto as unknown as PresupuestoRow

  const [clientesRes, ordenesRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, id_publico, nombre, apellido, razon_social, tipo")
      .eq("estado", "ACTIVO")
      .order("nombre", { ascending: true })
      .limit(500),
    supabase
      .from("ordenes")
      .select("id, id_publico, equipo_desc, estado")
      .order("fecha_recepcion", { ascending: false })
      .limit(200),
  ])

  const clientes = (clientesRes.data ?? []).map((c) => ({
    id: c.id, id_publico: c.id_publico, label: labelClienteRaw(c),
  }))
  const ordenes = (ordenesRes.data ?? []).map((o) => ({
    id: o.id, id_publico: o.id_publico, label: o.equipo_desc ?? o.estado,
  }))

  const puedeEditar = esAdmin && p.estado !== "APROBADO" && p.estado !== "RECHAZADO"

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          href="/presupuestos"
          className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a presupuestos
        </Link>

        <header className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[14px] text-tp-cyan font-semibold tracking-wider">
              {p.id_publico}
            </span>
            <Badge variant={ESTADO_PRES_VARIANT[p.estado] ?? "gray"}>
              {ESTADO_PRES_LABEL[p.estado] ?? p.estado}
            </Badge>
            {p.orden_id && p.ordenes && (
              <Link
                href={`/ordenes/${p.orden_id}`}
                className="font-mono text-xs text-tp-violet hover:underline"
              >
                Orden {p.ordenes.id_publico}
              </Link>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            {p.titulo}
          </h1>
          <p className="text-tp-secondary">
            Para{" "}
            <Link
              href={`/clientes/${p.cliente_id}`}
              className="text-tp-text hover:text-tp-cyan hover:underline"
            >
              {nombreCliente(p.clientes)}
            </Link>
            {p.clientes?.telefono && (
              <span className="text-tp-muted font-mono text-sm"> · {p.clientes.telefono}</span>
            )}
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FactCard label="Válido hasta" value={formatFecha(p.validez_hasta)} />
          <FactCard
            label="Margen"
            value={`${p.margen_pct}%`}
          />
          <FactCard
            label="Enviado"
            value={p.enviado_at ? formatFechaHora(p.enviado_at) : "—"}
          />
          <FactCard
            label="Respondido"
            value={p.respondido_at ? formatFechaHora(p.respondido_at) : "—"}
          />
        </section>

        {p.descripcion && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Descripción
            </p>
            <p className="text-sm text-tp-secondary whitespace-pre-wrap">{p.descripcion}</p>
          </section>
        )}

        <ItemsPresupuesto
          presupuestoId={p.id}
          puedeEditar={puedeEditar}
          margenPct={Number(p.margen_pct)}
        />

        <MensajePresupuesto
          presupuestoId={p.id}
          mensajeActual={p.mensaje_generado}
          puedeEditar={puedeEditar}
        />

        <CambiarEstadoPresupuestoBloque presupuestoId={p.id} estado={p.estado} />

        {p.notas_internas && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Notas internas
            </p>
            <p className="text-sm text-tp-secondary whitespace-pre-wrap">{p.notas_internas}</p>
          </section>
        )}

        <p className="text-xs font-mono text-tp-muted">
          Creado {formatFechaHora(p.created_at)} · Actualizado {formatFechaHora(p.updated_at)}
        </p>

        {puedeEditar && (
          <section className="pt-6 border-t border-tp-line-soft space-y-4">
            <h2 className="font-display text-xl font-semibold">Editar datos</h2>
            <PresupuestoForm
              mode="edit"
              presupuestoId={p.id}
              clientes={clientes}
              ordenes={ordenes}
              margenDefault={Number(p.margen_pct)}
              validezDefaultDias={7}
              initial={{
                cliente_id: p.cliente_id,
                orden_id: p.orden_id,
                titulo: p.titulo,
                descripcion: p.descripcion,
                validez_hasta: p.validez_hasta,
                margen_pct: Number(p.margen_pct),
                notas_internas: p.notas_internas,
              }}
            />
          </section>
        )}
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
