import { Package } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function StockPage() {
  return (
    <ComingSoon
      title="Inventario / Stock"
      description="Repuestos con costo, ubicación y stock mínimo. Descuento automático al imputar a una orden."
      phase="Fase 2 · Ola A (Maestros)"
      icon={Package}
    />
  )
}
