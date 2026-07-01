"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toggleClienteEstado } from "@/app/(dashboard)/clientes/actions"

type Props = {
  clienteId: string
  estado: "ACTIVO" | "INACTIVO"
}

export function ToggleClienteEstadoButton({ clienteId, estado }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const irAInactivo = estado === "ACTIVO"
    const confirmMsg = irAInactivo
      ? "¿Marcar este cliente como INACTIVO? No se elimina, solo se oculta de operación."
      : "¿Reactivar este cliente?"
    if (!confirm(confirmMsg)) return

    startTransition(async () => {
      const result = await toggleClienteEstado(clienteId)
      if (!result.ok) {
        alert(result.error)
        return
      }
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
