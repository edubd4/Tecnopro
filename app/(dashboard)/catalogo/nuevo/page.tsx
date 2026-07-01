import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { ServicioForm } from "@/components/servicios/ServicioForm"
import { ROL } from "@/lib/constants"

export default async function NuevoServicioPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user!.id)
    .single()

  if (profile?.rol !== ROL.ADMIN || !profile.activo) {
    redirect("/catalogo")
  }

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al catálogo
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Nuevo servicio
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Agregar servicio
          </h1>
          <p className="text-tp-secondary">
            El ID SRV-XXXX se asigna al guardar.
          </p>
        </div>

        <ServicioForm mode="create" />
      </div>
    </div>
  )
}
