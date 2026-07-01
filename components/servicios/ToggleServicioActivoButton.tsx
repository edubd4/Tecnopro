"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toggleServicioActivo } from "@/app/(dashboard)/catalogo/actions"

type Props = { servicioId: string; activo: boolean }

export function ToggleServicioActivoButton({ servicioId, activo }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const msg = activo
      ? "¿Desactivar este servicio? No se elimina, solo deja de aparecer en presupuestos."
      : "¿Reactivar este servicio?"
    if (!confirm(msg)) return

    startTransition(async () => {
      const result = await toggleServicioActivo(servicioId)
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
