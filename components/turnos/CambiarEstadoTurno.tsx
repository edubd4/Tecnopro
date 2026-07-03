"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { cambiarEstadoTurno } from "@/app/(dashboard)/turnos/actions"
import { ESTADO_TURNO_LABEL } from "@/lib/turnos-ui"

const ESTADOS = ["PROGRAMADO", "EN_CURSO", "COMPLETADO", "NO_ASISTIO", "CANCELADO"] as const

type Props = { turnoId: string; estado: string }

export function CambiarEstadoTurnoBloque({ turnoId, estado }: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [nuevo, setNuevo] = useState(estado)
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    if (nuevo === estado) return

    if (nuevo === "CANCELADO") {
      const ok = await confirm({
        title: "¿Cancelar este turno?",
        description: "El turno queda registrado con estado CANCELADO. Podés volverlo a activar cambiando el estado.",
        confirmLabel: "Cancelar turno",
        tone: "danger",
      })
      if (!ok) return
    }

    startTransition(async () => {
      const result = await cambiarEstadoTurno(turnoId, {
        estado: nuevo as typeof ESTADOS[number],
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Turno ahora en estado ${ESTADO_TURNO_LABEL[nuevo] ?? nuevo}`)
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
    </div>
  )
}
