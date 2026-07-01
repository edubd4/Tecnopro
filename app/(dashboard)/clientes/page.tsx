import { Users } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function ClientesPage() {
  return (
    <ComingSoon
      title="Clientes"
      description="Cartera de clientes con ficha, historial de órdenes, equipos y saldos pendientes."
      phase="Fase 2 · Ola A (Maestros)"
      icon={Users}
    />
  )
}
