"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Check, Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { regenerarAvisoOrden } from "@/app/(dashboard)/ordenes/actions"
import { estadoGeneraAviso } from "@/lib/aviso-orden"
import { ESTADO_ORDEN_LABEL } from "@/lib/ordenes-ui"

type Props = {
  ordenId: string
  ordenIdPublico: string
  estadoActual: string
  mensajeGuardado: string | null
  mensajeParaEstado: string | null
  puedeRegenerar: boolean       // admin o técnico asignado
}

export function AvisoOrdenSection({
  ordenId,
  ordenIdPublico,
  estadoActual,
  mensajeGuardado,
  mensajeParaEstado,
  puedeRegenerar,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Si el estado actual no amerita aviso, no mostramos la sección.
  if (!estadoGeneraAviso(estadoActual)) return null

  const desactualizado = mensajeParaEstado !== null && mensajeParaEstado !== estadoActual
  const sinMensaje = !mensajeGuardado

  async function handleCopiar() {
    if (!mensajeGuardado) return
    try {
      await navigator.clipboard.writeText(mensajeGuardado)
      setCopiado(true)
      toast.success("Aviso copiado al portapapeles")
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      toast.error("No se pudo copiar. Seleccionalo manualmente.")
    }
  }

  function handleRegenerar() {
    startTransition(async () => {
      const result = await regenerarAvisoOrden(ordenId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Aviso regenerado")
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border border-tp-violet/30 bg-tp-violet/5 p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10.5px] text-tp-violet tracking-[0.14em] uppercase flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Aviso para el cliente
          </p>
          <h2 className="font-display text-lg font-semibold mt-1">
            Mensaje sugerido para {ESTADO_ORDEN_LABEL[estadoActual] ?? estadoActual}
          </h2>
          <p className="text-xs text-tp-muted mt-1">
            Se genera automáticamente al cambiar de estado. Copialo y mandalo por el canal que uses habitualmente.
          </p>
        </div>

        {puedeRegenerar && !sinMensaje && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRegenerar}
            disabled={isPending}
          >
            <RefreshCw className={isPending ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            {isPending ? "Generando…" : "Regenerar"}
          </Button>
        )}
      </div>

      {desactualizado && (
        <Badge variant="amber">
          Aviso corresponde a: {ESTADO_ORDEN_LABEL[mensajeParaEstado ?? ""] ?? mensajeParaEstado}
        </Badge>
      )}

      {sinMensaje ? (
        <div className="rounded-md border border-tp-line-soft bg-tp-card p-6 text-center space-y-3">
          <p className="text-sm text-tp-muted">
            Todavía no hay aviso generado. Se crea al pasar por acá desde otro estado.
          </p>
          {puedeRegenerar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerar}
              disabled={isPending}
            >
              <Sparkles className="w-4 h-4" />
              {isPending ? "Generando…" : "Generar ahora"}
            </Button>
          )}
        </div>
      ) : (
        <>
          <Textarea
            rows={8}
            value={mensajeGuardado ?? ""}
            readOnly
            className="font-mono text-sm bg-tp-card"
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopiar}
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiado ? "Copiado" : "Copiar aviso"}
            </Button>
          </div>
        </>
      )}

      {/* Silencio TS: la prop ordenIdPublico está reservada por si en el futuro
          se muestra el ID en la UI (útil cuando el mensaje no lo incluye). */}
      <span className="hidden">{ordenIdPublico}</span>
    </section>
  )
}
