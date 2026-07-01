"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { cambiarEstadoOrden } from "@/app/(dashboard)/ordenes/actions"

const ESTADOS = [
  "RECIBIDA",
  "DIAGNOSTICO",
  "PRESUPUESTADA",
  "EN_REPARACION",
  "LISTA",
  "ENTREGADA",
  "CANCELADA",
] as const

const ESTADO_LABEL: Record<string, string> = {
  RECIBIDA: "Recibida",
  DIAGNOSTICO: "En diagnóstico",
  PRESUPUESTADA: "Presupuestada",
  EN_REPARACION: "En reparación",
  LISTA: "Lista para entrega",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",
}

type Props = { ordenId: string; estado: string }

export function CambiarEstadoOrden({ ordenId, estado }: Props) {
  const router = useRouter()
  const [nuevo, setNuevo] = useState(estado)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    if (nuevo === estado) return
    if (nuevo === "CANCELADA" && !window.confirm("¿Cancelar esta orden?")) return

    setError(null)
    startTransition(async () => {
      const result = await cambiarEstadoOrden(ordenId, {
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
        <h3 className="font-display text-base font-semibold mt-1">Avanzar la orden</h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 space-y-2">
          <Select value={nuevo} onChange={(e) => setNuevo(e.target.value)}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          onClick={handleClick}
          disabled={!cambio || isPending}
        >
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
