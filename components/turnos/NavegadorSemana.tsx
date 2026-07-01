"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  weekStart: Date       // lunes 00:00 de la semana visible
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function NavegadorSemana({ weekStart }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  function navigate(offsetDias: number) {
    const nueva = new Date(weekStart)
    nueva.setDate(nueva.getDate() + offsetDias)
    const sp = new URLSearchParams(params.toString())
    sp.set("semana", toISODate(nueva))
    router.replace(`/turnos?${sp.toString()}`)
  }

  function hoy() {
    const sp = new URLSearchParams(params.toString())
    sp.delete("semana")
    const qs = sp.toString()
    router.replace(qs ? `/turnos?${qs}` : "/turnos")
  }

  const finSemana = new Date(weekStart)
  finSemana.setDate(finSemana.getDate() + 6)

  const rango = `${weekStart.getDate()}/${weekStart.getMonth() + 1} – ${finSemana.getDate()}/${finSemana.getMonth() + 1}/${finSemana.getFullYear()}`

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
      <p className="font-mono text-xs text-tp-muted ml-2">{rango}</p>
    </div>
  )
}
