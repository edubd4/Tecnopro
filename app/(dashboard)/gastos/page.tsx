import { Receipt } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function GastosPage() {
  return (
    <ComingSoon
      title="Gastos"
      description="Registro de egresos por categoría, con comprobante adjunto y filtros por período."
      phase="Fase 2 · Ola C (Plata)"
      icon={Receipt}
    />
  )
}
