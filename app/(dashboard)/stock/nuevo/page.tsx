import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { RepuestoForm } from "@/components/repuestos/RepuestoForm"
import { ROL } from "@/lib/constants"

export default async function NuevoRepuestoPage() {
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
    redirect("/stock")
  }

  // Sugerencias para el ComboBox: categorías y ubicaciones ya usadas.
  const [categoriasRes, ubicacionesRes] = await Promise.all([
    supabase
      .from("repuestos")
      .select("categoria")
      .eq("activo", true)
      .not("categoria", "is", null),
    supabase
      .from("repuestos")
      .select("ubicacion")
      .eq("activo", true)
      .not("ubicacion", "is", null),
  ])

  const categoriasExistentes = Array.from(
    new Set(
      ((categoriasRes.data ?? []) as { categoria: string | null }[])
        .map((r) => r.categoria?.trim())
        .filter((c): c is string => !!c),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"))

  const ubicacionesExistentes = Array.from(
    new Set(
      ((ubicacionesRes.data ?? []) as { ubicacion: string | null }[])
        .map((r) => r.ubicacion?.trim())
        .filter((u): u is string => !!u),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/stock"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a stock
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Nuevo repuesto
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Agregar repuesto
          </h1>
          <p className="text-tp-secondary">
            El ID REP-XXXX se asigna al guardar. Si dejás el código interno vacío, se completa solo.
          </p>
        </div>

        <RepuestoForm
          mode="create"
          categoriasExistentes={categoriasExistentes}
          ubicacionesExistentes={ubicacionesExistentes}
        />
      </div>
    </div>
  )
}
