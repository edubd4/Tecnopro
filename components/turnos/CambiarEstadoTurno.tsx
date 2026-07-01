"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { cambiarEstadoTurno } from "@/app/(dashboard)/turnos/actions"
import { ESTADO_TURNO_LABEL } from "@/lib/turnos-ui"

const ESTADOS = ["PROGRAMADO", "EN_CURSO", "COMPLETADO", "NO_ASISTIO", "CANCELADO"] as const

type Props = { turnoId: string; estado: string }

export function CambiarEstadoTurnoBloque({ turnoId, estado }: Props) {
  const router = useRouter()
  const [nuevo, setNuevo] = useState(estado)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    if (nuevo === estado) return
    if (nuevo === "CANCELADO" && !window.confirm("¿Cancelar este turno?")) return

    setError(null)
    startTransition(async () => {
      const result = await cambiarEstadoTurno(turnoId, {
        estado: nuevo as typeof ESTADOS[number],
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const cambio = nuevo !== estado

  return (
    <div className="rounded-xl border border-tp-line-soft bg-tp-card p-5 space-y-3">
      <div>
        <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase">
          Cambiar estado
        </p>
        <h3 className="font-display text-base font-semibold mt-1">Avanzar el turno</h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <Select value={nuevo} onChange={(e) => setNuevo(e.target.value)}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_TURNO_LABEL[e]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={handleClick} disabled={!cambio || isPending}>
          {isPending ? "Guardando…" : "Aplicar"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-tp-red">
          {error}
        </p>
      )}
    </div>
  )
}
