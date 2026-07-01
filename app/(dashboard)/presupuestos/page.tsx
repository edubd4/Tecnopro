import { FileText } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function PresupuestosPage() {
  return (
    <ComingSoon
      title="Presupuestos"
      description="Cotización con servicios y repuestos del catálogo. Margen configurable, estado y generación de mensaje con IA."
      phase="Fase 2 · Ola B (Operación)"
      icon={FileText}
    />
  )
}
