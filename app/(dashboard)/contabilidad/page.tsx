import { Calculator } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function ContabilidadPage() {
  return (
    <ComingSoon
      title="Contabilidad básica"
      description="Libro de ingresos y egresos, resultado mensual, exportación a Excel / CSV."
      phase="Fase 2 · Ola C (Plata)"
      icon={Calculator}
    />
  )
}
