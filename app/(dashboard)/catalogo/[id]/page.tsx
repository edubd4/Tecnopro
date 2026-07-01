import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { ServicioForm } from "@/components/servicios/ServicioForm"
import { ToggleServicioActivoButton } from "@/components/servicios/ToggleServicioActivoButton"
import { ROL } from "@/lib/constants"
import { formatFechaHora, formatPesos } from "@/lib/utils"
import type { ServicioInput } from "@/lib/validators/servicio"

const CATEGORIA_LABEL: Record<string, string> = {
  REPARACION: "Reparación",
  REDES: "Redes",
  ACONDICIONAMIENTO: "Acondicionamiento",
  INSTALACION: "Instalación",
  DIAGNOSTICO: "Diagnóstico",
  OTRO: "Otro",
}

export default async function ServicioDetallePage({
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

  const { data: servicio } = await supabase
    .from("servicios")
    .select("id, id_publico, nombre, descripcion, categoria, precio_base, tiempo_estimado_min, activo, created_at, updated_at")
    .eq("id", params.id)
    .maybeSingle()

  if (!servicio) notFound()

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>

        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[13px] text-tp-cyan font-semibold tracking-wider">
                {servicio.id_publico}
              </span>
              <Badge variant="cyan">
                {CATEGORIA_LABEL[servicio.categoria] ?? servicio.categoria}
              </Badge>
              <Badge variant={servicio.activo ? "green" : "gray"}>
                {servicio.activo ? "ACTIVO" : "INACTIVO"}
              </Badge>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              {servicio.nombre}
            </h1>
          </div>

          {esAdmin && (
            <ToggleServicioActivoButton servicioId={servicio.id} activo={servicio.activo} />
          )}
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4">
            <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
              Precio base
            </p>
            <p className="font-display text-2xl mt-1 text-tp-text">
              {formatPesos(Number(servicio.precio_base))}
            </p>
          </div>
          <div className="rounded-lg border border-tp-line-soft bg-tp-card p-4">
            <p className="font-mono text-[10px] text-tp-muted uppercase tracking-widest">
              Tiempo estimado
            </p>
            <p className="font-display text-2xl mt-1 text-tp-text">
              {servicio.tiempo_estimado_min ? `${servicio.tiempo_estimado_min} min` : "—"}
            </p>
          </div>
        </section>

        {servicio.descripcion && (
          <section className="rounded-xl border border-tp-line-soft bg-tp-card p-5">
            <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase mb-2">
              Descripción
            </p>
            <p className="text-sm text-tp-secondary whitespace-pre-wrap">
              {servicio.descripcion}
            </p>
          </section>
        )}

        <p className="text-xs font-mono text-tp-muted">
          Creado {formatFechaHora(servicio.created_at)} · Actualizado {formatFechaHora(servicio.updated_at)}
        </p>

        {esAdmin && (
          <section className="pt-6 border-t border-tp-line-soft space-y-4">
            <h2 className="font-display text-xl font-semibold">Editar datos</h2>
            <ServicioForm
              mode="edit"
              servicioId={servicio.id}
              initial={{
                nombre: servicio.nombre,
                descripcion: servicio.descripcion,
                categoria: servicio.categoria as ServicioInput["categoria"],
                precio_base: Number(servicio.precio_base),
                tiempo_estimado_min: servicio.tiempo_estimado_min,
                activo: servicio.activo,
              }}
            />
          </section>
        )}
      </div>
    </div>
  )
}
