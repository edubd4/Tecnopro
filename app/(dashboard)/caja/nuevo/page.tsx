import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MovimientoForm } from "@/components/caja/MovimientoForm"

export default function NuevoMovimientoPage() {
  return (
    <div className="tp-circuit min-h-[calc(100vh-4rem)] px-6 md:px-10 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
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
            Los cobros por orden se registran automáticamente desde la ficha de cada orden. Acá van ajustes, aperturas, cierres y gastos ad-hoc.
          </p>
        </div>

        <MovimientoForm />
      </div>
    </div>
  )
}
