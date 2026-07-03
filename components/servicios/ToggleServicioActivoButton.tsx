"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { toggleServicioActivo } from "@/app/(dashboard)/catalogo/actions"

type Props = { servicioId: string; activo: boolean }

export function ToggleServicioActivoButton({ servicioId, activo }: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    const ok = await confirm({
      title: activo ? "¿Desactivar este servicio?" : "¿Reactivar este servicio?",
      description: activo
        ? "No se elimina. Simplemente deja de aparecer al armar órdenes y presupuestos."
        : "Vuelve a estar disponible al armar órdenes y presupuestos.",
      confirmLabel: activo ? "Desactivar" : "Reactivar",
      tone: activo ? "warning" : "default",
    })
    if (!ok) return

    startTransition(async () => {
      const result = await toggleServicioActivo(servicioId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(activo ? "Servicio desactivado" : "Servicio reactivado")
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
