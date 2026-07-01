import { Landmark } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function TesoreriaPage() {
  return (
    <ComingSoon
      title="Tesorería básica"
      description="Cobros pendientes, pagos por vencer y resumen mensual de ingresos vs. egresos."
      phase="Fase 2 · Ola C (Plata)"
      icon={Landmark}
    />
  )
}
