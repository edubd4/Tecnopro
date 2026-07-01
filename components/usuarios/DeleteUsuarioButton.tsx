"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteUsuario } from "@/app/(dashboard)/usuarios/actions"

type Props = {
  usuarioId: string
  usuarioEmail: string
  disabled?: boolean
  disabledReason?: string
}

export function DeleteUsuarioButton({ usuarioId, usuarioEmail, disabled, disabledReason }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    if (disabled) return

    const confirmMsg =
      `¿Eliminar al usuario ${usuarioEmail}?\n\n` +
      `Se borra su cuenta de acceso al sistema (Auth + profile).\n` +
      `El historial de acciones que hizo se preserva para auditoría.\n\n` +
      `Esta acción NO se puede deshacer.`

    if (!window.confirm(confirmMsg)) return

    setError(null)
    startTransition(async () => {
      const result = await deleteUsuario(usuarioId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/usuarios")
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        onClick={handleClick}
        disabled={disabled || isPending}
        title={disabledReason}
      >
        <Trash2 className="w-4 h-4" />
        {isPending ? "Eliminando…" : "Eliminar usuario"}
      </Button>
      {disabled && disabledReason && (
        <p className="text-[11px] text-tp-muted">{disabledReason}</p>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-tp-red">
          {error}
        </p>
      )}
    </div>
  )
}
