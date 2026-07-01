import { Wallet } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function CajaPage() {
  return (
    <ComingSoon
      title="Caja"
      description="Ingresos y egresos del día, saldo en vivo, cierre diario con resumen."
      phase="Fase 2 · Ola C (Plata)"
      icon={Wallet}
    />
  )
}
