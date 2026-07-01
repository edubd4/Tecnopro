import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { TurnoForm } from "@/components/turnos/TurnoForm"

function labelCliente(c: {
  nombre: string
  apellido: string | null
  razon_social: string | null
  tipo: string
}): string {
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export default async function NuevoTurnoPage() {
  const supabase = await createServerClient()

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
      .not("estado", "in", "(ENTREGADA,CANCELADA)")
      .order("fecha_recepcion", { ascending: false })
      .limit(200),
  ])

  const clientes = (clientesRes.data ?? []).map((c) => ({
    id: c.id,
    id_publico: c.id_publico,
    label: labelCliente(c),
  }))
  const tecnicos = (tecnicosRes.data ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    rol: t.rol,
  }))
  const ordenes = (ordenesRes.data ?? []).map((o) => ({
    id: o.id,
    id_publico: o.id_publico,
    label: o.equipo_desc ?? o.estado,
  }))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/turnos"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la agenda
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Nuevo turno
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Programar turno
          </h1>
          <p className="text-tp-secondary">
            Si asignás un técnico, el sistema detecta si tiene otro turno superpuesto.
          </p>
        </div>

        <TurnoForm mode="create" clientes={clientes} tecnicos={tecnicos} ordenes={ordenes} />
      </div>
    </div>
  )
}
