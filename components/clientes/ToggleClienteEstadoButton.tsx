"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { toggleClienteEstado } from "@/app/(dashboard)/clientes/actions"

type Props = {
  clienteId: string
  estado: "ACTIVO" | "INACTIVO"
}

export function ToggleClienteEstadoButton({ clienteId, estado }: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    const irAInactivo = estado === "ACTIVO"
    const ok = await confirm({
      title: irAInactivo ? "¿Marcar cliente como inactivo?" : "¿Reactivar cliente?",
      description: irAInactivo
        ? "No se elimina, solo se oculta de operación. Podés reactivarlo cuando quieras."
        : "El cliente vuelve a aparecer en órdenes y presupuestos.",
      confirmLabel: irAInactivo ? "Marcar inactivo" : "Reactivar",
      tone: irAInactivo ? "warning" : "default",
    })
    if (!ok) return

    startTransition(async () => {
      const result = await toggleClienteEstado(clienteId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(irAInactivo ? "Cliente marcado como inactivo" : "Cliente reactivado")
      router.refresh()
    })
  }

  return (
    <Button
      variant={estado === "ACTIVO" ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending
        ? "Guardando…"
        : estado === "ACTIVO"
        ? "Marcar como inactivo"
        : "Reactivar cliente"}
    </Button>
  )
}
