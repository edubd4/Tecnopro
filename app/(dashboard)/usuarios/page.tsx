import { UserCog } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function UsuariosPage() {
  return (
    <ComingSoon
      title="Usuarios y técnicos"
      description="Alta y gestión de técnicos, asignación de órdenes y permisos por rol."
      phase="Fase 2 · Ola A (Maestros)"
      icon={UserCog}
    />
  )
}
