import { BarChart3 } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function AnalyticsPage() {
  return (
    <ComingSoon
      title="Analytics"
      description="Órdenes por estado y técnico, servicios más rentables, clientes activos y tendencias mensuales."
      phase="Fase 2 · Ola D (Visión)"
      icon={BarChart3}
    />
  )
}
