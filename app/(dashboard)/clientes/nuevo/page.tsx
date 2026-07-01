import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { ClienteForm } from "@/components/clientes/ClienteForm"
import { ROL } from "@/lib/constants"

export default async function NuevoClientePage() {
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
    redirect("/clientes")
  }

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <Link
            href="/clientes"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la lista
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Alta de cliente
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Nuevo cliente
          </h1>
          <p className="text-tp-secondary">
            El ID legible (CLI-XXXX) se asigna automáticamente al guardar.
          </p>
        </div>

        <ClienteForm mode="create" />
      </div>
    </div>
  )
}
