import { ClipboardList } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function OrdenesPage() {
  return (
    <ComingSoon
      title="Órdenes de trabajo"
      description="Alta, edición y seguimiento de cada orden. Estado, técnico asignado, servicios y repuestos imputados, historial completo."
      phase="Fase 2 · Ola B (Operación)"
      icon={ClipboardList}
    />
  )
}
