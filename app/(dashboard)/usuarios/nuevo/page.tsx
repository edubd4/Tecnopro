import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { UsuarioCreateForm } from "@/components/usuarios/UsuarioCreateForm"
import { ROL } from "@/lib/constants"

export default async function NuevoUsuarioPage() {
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
    redirect("/panel")
  }

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/usuarios"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a usuarios
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Nuevo usuario
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Dar de alta un usuario
          </h1>
          <p className="text-tp-secondary">
            Creá la cuenta con una contraseña inicial y comunicásela al usuario.
          </p>
        </div>

        <UsuarioCreateForm />
      </div>
    </div>
  )
}
