import { Settings } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function ConfiguracionPage() {
  return (
    <ComingSoon
      title="Configuración"
      description="Datos del negocio, categorías, márgenes por defecto, plantillas de mensajes y conexión con la API de IA."
      phase="Fase 2 · Ola A (Maestros)"
      icon={Settings}
    />
  )
}
