import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { GastoForm } from "@/components/gastos/GastoForm"

export default async function NuevoGastoPage() {
  const supabase = await createServerClient()

  const { data: categorias } = await supabase
    .from("categorias_gasto")
    .select("id, nombre")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true })

  const opciones = (categorias ?? []).map((c) => ({ id: c.id as number, nombre: c.nombre as string }))

  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link
            href="/gastos"
            className="inline-flex items-center gap-2 text-sm text-tp-muted hover:text-tp-text w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a gastos
          </Link>
          <p className="font-mono text-[11px] text-tp-cyan tracking-[0.18em] uppercase mt-3">
            Nuevo gasto
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Registrar egreso</h1>
          <p className="text-tp-secondary">
            Al guardar se registra automáticamente un egreso en caja. El gasto es inmutable — para corregir, hacé un ajuste desde /caja.
          </p>
        </div>

        {opciones.length === 0 ? (
          <div className="rounded-xl border border-tp-amber/40 bg-tp-amber/10 p-5">
            <p className="font-display font-semibold text-tp-text">Sin categorías activas</p>
            <p className="text-sm text-tp-secondary mt-1">
              Todas las categorías están desactivadas. Reactivá al menos una desde la tabla <code className="font-mono">categorias_gasto</code>.
            </p>
          </div>
        ) : (
          <GastoForm categorias={opciones} />
        )}
      </div>
    </div>
  )
}
