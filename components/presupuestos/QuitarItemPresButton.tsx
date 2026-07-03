"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
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
  const toast = useToast()
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    const ok = await confirm({
      title: `¿Quitar "${descripcion}"?`,
      description: "Se elimina del presupuesto. Podés volver a agregarlo si hace falta.",
      confirmLabel: "Quitar",
      tone: "warning",
    })
    if (!ok) return

    startTransition(async () => {
      const result =
        tipo === "servicio"
          ? await quitarServicioDePresupuesto(itemId, presupuestoId)
          : await quitarRepuestoDePresupuesto(itemId, presupuestoId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`${tipo === "servicio" ? "Servicio" : "Repuesto"} quitado`)
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
