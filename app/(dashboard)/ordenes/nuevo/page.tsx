import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { OrdenForm } from "@/components/ordenes/OrdenForm"

function labelCliente(c: {
  nombre: string
  apellido: string | null
  razon_social: string | null
  tipo: string
}): string {
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export default async function NuevaOrdenPage() {
  const supabase = await createServerClient()

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
    label: labelCliente(c),
  }))
  const tecnicos = (tecnicosRes.data ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    rol: t.rol,
  }))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/ordenes"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a órdenes
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Nueva orden
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Recepción de trabajo
          </h1>
          <p className="text-tp-secondary">
            El ID OT-XXXX se asigna al guardar. Los items (servicios y repuestos) se agregan desde la ficha.
          </p>
        </div>

        {clientes.length === 0 ? (
          <div className="rounded-xl border border-tp-amber/40 bg-tp-amber/10 p-5">
            <p className="font-display font-semibold text-tp-text">Sin clientes activos</p>
            <p className="text-sm text-tp-secondary mt-1">
              Necesitás al menos un cliente activo para crear una orden.{" "}
              <Link href="/clientes/nuevo" className="text-tp-cyan hover:underline">
                Dar de alta un cliente
              </Link>
            </p>
          </div>
        ) : (
          <OrdenForm mode="create" clientes={clientes} tecnicos={tecnicos} />
        )}
      </div>
    </div>
  )
}
