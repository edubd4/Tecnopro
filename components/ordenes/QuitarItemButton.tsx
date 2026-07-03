"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { quitarServicioDeOrden, quitarRepuestoDeOrden } from "@/app/(dashboard)/ordenes/items-actions"

type Props = {
  itemId: number
  ordenId: string
  tipo: "servicio" | "repuesto"
  descripcion: string
}

export function QuitarItemButton({ itemId, ordenId, tipo, descripcion }: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    const ok = await confirm({
      title: `¿Quitar "${descripcion}"?`,
      description:
        tipo === "repuesto"
          ? "El repuesto se devuelve al stock automáticamente (ENTRADA compensatoria)."
          : "Se elimina de la orden. Podés volver a agregarlo si hace falta.",
      confirmLabel: "Quitar",
      tone: "warning",
    })
    if (!ok) return

    startTransition(async () => {
      const result =
        tipo === "servicio"
          ? await quitarServicioDeOrden(itemId, ordenId)
          : await quitarRepuestoDeOrden(itemId, ordenId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(tipo === "repuesto" ? "Repuesto quitado y devuelto al stock" : "Servicio quitado")
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
