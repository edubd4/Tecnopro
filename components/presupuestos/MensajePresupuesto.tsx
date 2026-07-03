"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Sparkles, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  generarMensajeAutomatico,
  guardarMensajeManual,
} from "@/app/(dashboard)/presupuestos/actions"

type Props = {
  presupuestoId: string
  mensajeActual: string | null
  puedeEditar: boolean
}

export function MensajePresupuesto({ presupuestoId, mensajeActual, puedeEditar }: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [mensaje, setMensaje] = useState(mensajeActual ?? "")
  const [copiado, setCopiado] = useState(false)
  const [isGenerando, startGenerando] = useTransition()
  const [isGuardando, startGuardando] = useTransition()

  async function handleGenerar() {
    if (mensaje) {
      const ok = await confirm({
        title: "¿Reemplazar el mensaje actual?",
        description: "Ya hay un mensaje guardado. Al generar uno nuevo, el anterior se pierde.",
        confirmLabel: "Regenerar",
        tone: "warning",
      })
      if (!ok) return
    }
    startGenerando(async () => {
      const result = await generarMensajeAutomatico(presupuestoId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.data) setMensaje(result.data)
      toast.success("Mensaje generado")
      router.refresh()
    })
  }

  async function handleGuardar() {
    startGuardando(async () => {
      const result = await guardarMensajeManual(presupuestoId, { mensaje })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Mensaje guardado")
      router.refresh()
    })
  }

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
      toast.success("Copiado al portapapeles")
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      toast.error("No se pudo copiar. Seleccionalo manualmente.")
    }
  }

  const sinCambios = (mensajeActual ?? "") === mensaje

  return (
    <section className="rounded-xl border border-tp-violet/30 bg-tp-violet/5 p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10.5px] text-tp-violet tracking-[0.14em] uppercase">
            Mensaje para el cliente
          </p>
          <h2 className="font-display text-lg font-semibold mt-1">
            Copiá y pegá al chat
          </h2>
          <p className="text-xs text-tp-muted mt-1">
            Fase 2: template automático · Fase 3: generación con IA Claude Haiku
          </p>
        </div>

        {puedeEditar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerar}
            disabled={isGenerando}
          >
            <Sparkles className="w-4 h-4" />
            {isGenerando ? "Generando…" : mensaje ? "Regenerar" : "Generar mensaje"}
          </Button>
        )}
      </div>

      <Textarea
        rows={12}
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="Todavía no hay mensaje. Cargá items al presupuesto y hacé click en 'Generar mensaje'."
        disabled={!puedeEditar}
        className="font-mono text-sm bg-tp-card"
      />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopiar}
          disabled={!mensaje}
        >
          {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copiado ? "Copiado" : "Copiar"}
        </Button>
        {puedeEditar && (
          <Button
            type="button"
            size="sm"
            onClick={handleGuardar}
            disabled={isGuardando || sinCambios}
          >
            {isGuardando ? "Guardando…" : "Guardar edición"}
          </Button>
        )}
      </div>
    </section>
  )
}
