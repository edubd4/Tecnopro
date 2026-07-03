import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Tag } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { ROL } from "@/lib/constants"
import {
  CategoriasGastoManager,
  type Categoria,
} from "@/components/gastos/CategoriasGastoManager"

export default async function CategoriasGastoPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user!.id)
    .single()

  if (profile?.rol !== ROL.ADMIN || !profile.activo) {
    redirect("/panel")
  }

  const [categoriasRes, usosRes] = await Promise.all([
    supabase
      .from("categorias_gasto")
      .select("id, nombre, activo, orden")
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true }),
    // Contamos los gastos por categoría para mostrar cuáles están en uso.
    supabase.from("gastos").select("categoria_id"),
  ])

  const usosPorCategoria: Record<number, number> = {}
  for (const g of (usosRes.data ?? []) as { categoria_id: number }[]) {
    usosPorCategoria[g.categoria_id] = (usosPorCategoria[g.categoria_id] ?? 0) + 1
  }

  const categorias: Categoria[] = ((categoriasRes.data ?? []) as {
    id: number
    nombre: string
    activo: boolean
  }[]).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    activo: c.activo,
    usos: usosPorCategoria[c.id] ?? 0,
  }))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/configuracion"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a configuración
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="rounded-lg bg-tp-cyan/10 text-tp-cyan p-2">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase">
                Configuración · Gastos
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
                Categorías de gasto
              </h1>
            </div>
          </div>
          <p className="text-tp-secondary mt-2">
            Manejá las categorías que se muestran al registrar un gasto. Las que
            tengan gastos históricos no se pueden borrar — solo desactivar.
          </p>
        </div>

        <CategoriasGastoManager categorias={categorias} />
      </div>
    </div>
  )
}
