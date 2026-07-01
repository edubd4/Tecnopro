import { BookOpen } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function CatalogoPage() {
  return (
    <ComingSoon
      title="Catálogo de servicios"
      description="Menú de trabajos parametrizados: reparación, redes, acondicionamiento, instalación."
      phase="Fase 2 · Ola A (Maestros)"
      icon={BookOpen}
    />
  )
}
