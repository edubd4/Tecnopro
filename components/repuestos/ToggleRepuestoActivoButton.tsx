"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { toggleRepuestoActivo } from "@/app/(dashboard)/stock/actions"

type Props = { repuestoId: string; activo: boolean }

export function ToggleRepuestoActivoButton({ repuestoId, activo }: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    const ok = await confirm({
      title: activo ? "¿Desactivar este repuesto?" : "¿Reactivar este repuesto?",
      description: activo
        ? "No se elimina. Simplemente deja de aparecer al armar órdenes y presupuestos. El stock actual se mantiene."
        : "Vuelve a estar disponible al armar órdenes y presupuestos.",
      confirmLabel: activo ? "Desactivar" : "Reactivar",
      tone: activo ? "warning" : "default",
    })
    if (!ok) return

    startTransition(async () => {
      const result = await toggleRepuestoActivo(repuestoId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(activo ? "Repuesto desactivado" : "Repuesto reactivado")
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
