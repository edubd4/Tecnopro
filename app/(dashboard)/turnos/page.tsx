import { CalendarDays } from "lucide-react"
import { ComingSoon } from "@/components/ComingSoon"

export default function TurnosPage() {
  return (
    <ComingSoon
      title="Turnos y calendario"
      description="Agenda visual con vista día/semana/mes. Asignación por técnico y detección de superposiciones."
      phase="Fase 2 · Ola B (Operación)"
      icon={CalendarDays}
    />
  )
}
