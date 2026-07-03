import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { MovimientoForm } from "@/components/caja/MovimientoForm"

export default async function NuevoMovimientoPage() {
  const supabase = await createServerClient()

  // Categorías de gasto activas (para el flow "Gasto categorizado" dentro del form)
  const { data: catData } = await supabase
    .from("categorias_gasto")
    .select("id, nombre")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true })

  const categoriasGasto = (catData ?? []) as { id: number; nombre: string }[]

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/caja"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a caja
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Nuevo movimiento
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Registrar en caja
          </h1>
          <p className="text-tp-secondary">
            Los cobros de órdenes se registran automáticamente desde la ficha de cada orden.
            Acá van gastos, aperturas, cierres y ajustes.
          </p>
        </div>

        <MovimientoForm categoriasGasto={categoriasGasto} />
      </div>
    </div>
  )
}
