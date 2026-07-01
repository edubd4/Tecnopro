"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toggleRepuestoActivo } from "@/app/(dashboard)/stock/actions"

type Props = { repuestoId: string; activo: boolean }

export function ToggleRepuestoActivoButton({ repuestoId, activo }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const msg = activo
      ? "¿Desactivar este repuesto? No se elimina, solo deja de aparecer en órdenes."
      : "¿Reactivar este repuesto?"
    if (!confirm(msg)) return

    startTransition(async () => {
      const result = await toggleRepuestoActivo(repuestoId)
      if (!result.ok) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <Button
      variant={activo ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? "Guardando…" : activo ? "Desactivar" : "Reactivar"}
    </Button>
  )
}
