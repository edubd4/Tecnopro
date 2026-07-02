"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  weekStartISO: string       // "YYYY-MM-DD" del lunes visible (calculado en server)
}

// Aritmetica de fechas con mediodia para evitar drift de TZ.
// Si sumamos dias con Date creado a T00:00, el paso a client (AR = UTC-3) puede
// retroceder el dia. Con T12:00 quedamos con margen a ambos lados.
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function humanRange(iso: string): string {
  const start = new Date(`${iso}T12:00:00`)
  const end = new Date(`${iso}T12:00:00`)
  end.setDate(end.getDate() + 6)
  return `${start.getDate()}/${start.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`
}

export function NavegadorSemana({ weekStartISO }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  function navigate(offsetDias: number) {
    const nuevaISO = addDaysISO(weekStartISO, offsetDias)
    const sp = new URLSearchParams(params.toString())
    sp.set("semana", nuevaISO)
    // push (no replace) para tener history back/forward + garantia de refetch.
    router.push(`/turnos?${sp.toString()}`)
  }

  function hoy() {
    const sp = new URLSearchParams(params.toString())
    sp.delete("semana")
    const qs = sp.toString()
    router.push(qs ? `/turnos?${qs}` : "/turnos")
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={() => navigate(-7)}>
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </Button>
      <Button variant="outline" size="sm" onClick={hoy}>
        <CalendarDays className="w-4 h-4" />
        Hoy
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(7)}>
        Siguiente
        <ChevronRight className="w-4 h-4" />
      </Button>
      <p className="font-mono text-xs text-tp-muted ml-2">{humanRange(weekStartISO)}</p>
    </div>
  )
}
