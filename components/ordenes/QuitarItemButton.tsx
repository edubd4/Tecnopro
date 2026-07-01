"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { quitarServicioDeOrden, quitarRepuestoDeOrden } from "@/app/(dashboard)/ordenes/items-actions"

type Props = {
  itemId: number
  ordenId: string
  tipo: "servicio" | "repuesto"
  descripcion: string
}

export function QuitarItemButton({ itemId, ordenId, tipo, descripcion }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const msg =
      tipo === "repuesto"
        ? `¿Quitar "${descripcion}" de la orden?\n\nSe devolverá al stock automáticamente (ENTRADA compensatoria).`
        : `¿Quitar "${descripcion}" de la orden?`
    if (!window.confirm(msg)) return

    startTransition(async () => {
      const result =
        tipo === "servicio"
          ? await quitarServicioDeOrden(itemId, ordenId)
          : await quitarRepuestoDeOrden(itemId, ordenId)
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
      title="Quitar de la orden"
      className="p-1.5 rounded-md text-tp-muted hover:text-tp-red hover:bg-tp-red/10 disabled:opacity-50 transition-colors"
      aria-label="Quitar"
    >
      <X className="w-4 h-4" />
    </button>
  )
}
