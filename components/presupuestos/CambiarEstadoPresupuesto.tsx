"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { cambiarEstadoPresupuesto } from "@/app/(dashboard)/presupuestos/actions"
import { ESTADO_PRES_LABEL } from "@/lib/presupuestos-ui"

const ESTADOS = ["BORRADOR", "ENVIADO", "APROBADO", "RECHAZADO", "VENCIDO"] as const

type Props = { presupuestoId: string; estado: string }

export function CambiarEstadoPresupuestoBloque({ presupuestoId, estado }: Props) {
  const router = useRouter()
  const [nuevo, setNuevo] = useState(estado)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    if (nuevo === estado) return
    if ((nuevo === "RECHAZADO" || nuevo === "VENCIDO") && !window.confirm(`¿Marcar como ${ESTADO_PRES_LABEL[nuevo]}?`)) return

    setError(null)
    startTransition(async () => {
      const result = await cambiarEstadoPresupuesto(presupuestoId, {
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
          Estado del presupuesto
        </p>
        <h3 className="font-display text-base font-semibold mt-1">Avanzar la cotización</h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <Select value={nuevo} onChange={(e) => setNuevo(e.target.value)}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_PRES_LABEL[e]}
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
