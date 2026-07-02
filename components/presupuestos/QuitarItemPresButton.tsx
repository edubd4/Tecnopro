"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import {
  quitarServicioDePresupuesto,
  quitarRepuestoDePresupuesto,
} from "@/app/(dashboard)/presupuestos/actions"

type Props = {
  itemId: number
  presupuestoId: string
  tipo: "servicio" | "repuesto"
  descripcion: string
}

export function QuitarItemPresButton({ itemId, presupuestoId, tipo, descripcion }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`¿Quitar "${descripcion}" del presupuesto?`)) return
    startTransition(async () => {
      const result =
        tipo === "servicio"
          ? await quitarServicioDePresupuesto(itemId, presupuestoId)
          : await quitarRepuestoDePresupuesto(itemId, presupuestoId)
      if (!result.ok) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title="Quitar del presupuesto"
      className="p-1.5 rounded-md text-tp-muted hover:text-tp-red hover:bg-tp-red/10 disabled:opacity-50 transition-colors"
      aria-label="Quitar"
    >
      <X className="w-4 h-4" />
    </button>
  )
}
