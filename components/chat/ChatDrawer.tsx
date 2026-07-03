"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Sparkles, X, Send, Plus, MessageCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { cn, formatFechaHora } from "@/lib/utils"

// ============================================================================
// ChatDrawer — panel lateral flotante para consultas NL con Claude Haiku.
// Fase 3.3. Solo admin.
//
// Estructura interna:
//   [Sidebar] Historial de conversaciones (últimas 20)
//   [Main]    Mensajes + input al pie
//
// El botón flotante trigger vive abajo a la derecha, siempre visible en el
// dashboard cuando el user es admin.
// ============================================================================

type Conversacion = { id: string; titulo: string; updated_at: string }

type Mensaje = {
  id?: number
  rol: "user" | "assistant"
  contenido: string
  created_at?: string
}

export function ChatDrawer() {
  const toast = useToast()
  const [open, setOpen] = React.useState(false)
  const [conversaciones, setConversaciones] = React.useState<Conversacion[]>([])
  const [conversacionActualId, setConversacionActualId] = React.useState<string | null>(null)
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([])
  const [input, setInput] = React.useState("")
  const [enviando, setEnviando] = React.useState(false)
  const [cargando, setCargando] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje.
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [mensajes, enviando])

  // Cargar lista de conversaciones al abrir.
  React.useEffect(() => {
    if (!open) return
    let cancelado = false
    ;(async () => {
      setCargando(true)
      try {
        const res = await fetch("/api/ia/conversaciones")
        const body = await res.json()
        if (!cancelado && body.ok) {
          setConversaciones(body.data)
        }
      } catch (err) {
        console.error("[ChatDrawer] no se cargaron conversaciones:", err)
      } finally {
        if (!cancelado) setCargando(false)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [open])

  async function abrirConversacion(id: string) {
    setConversacionActualId(id)
    setCargando(true)
    try {
      const res = await fetch(`/api/ia/conversaciones/${id}`)
      const body = await res.json()
      if (body.ok) {
        setMensajes(body.data.mensajes)
      } else {
        toast.error(body.error ?? "No se pudo cargar la conversación")
      }
    } catch (err) {
      toast.error("Error al cargar la conversación")
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  function nuevaConversacion() {
    setConversacionActualId(null)
    setMensajes([])
  }

  async function enviar() {
    const texto = input.trim()
    if (!texto || enviando) return

    const nuevoMensajeUser: Mensaje = { rol: "user", contenido: texto }
    setMensajes((prev) => [...prev, nuevoMensajeUser])
    setInput("")
    setEnviando(true)

    try {
      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversacion_id: conversacionActualId ?? undefined,
          message: texto,
        }),
      })
      const body = await res.json()
      if (!body.ok) {
        toast.error(body.error ?? "Falló la consulta")
        // Rollback: quitamos el mensaje del user si falló
        setMensajes((prev) => prev.slice(0, -1))
        setInput(texto)
        return
      }
      setConversacionActualId(body.data.conversacion_id)
      setMensajes((prev) => [
        ...prev,
        { rol: "assistant", contenido: body.data.mensaje },
      ])
      // Refresh de la lista de conversaciones (para que suba la actual)
      fetch("/api/ia/conversaciones")
        .then((r) => r.json())
        .then((b) => {
          if (b.ok) setConversaciones(b.data)
        })
        .catch(() => {
          // silencioso: solo es refresco de sidebar
        })
    } catch (err) {
      toast.error("Error de red al enviar")
      console.error(err)
      setMensajes((prev) => prev.slice(0, -1))
      setInput(texto)
    } finally {
      setEnviando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* Botón flotante trigger */}
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "fixed z-40 bottom-6 right-6 h-14 w-14 rounded-full shadow-xl",
            "bg-tp-grad text-tp-bg flex items-center justify-center",
            "hover:scale-105 active:scale-95 transition-transform",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-tp-cyan/40",
          )}
          aria-label="Abrir chat con IA"
          title="Preguntale al asistente"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-150" />
        <Dialog.Content
          className={cn(
            "fixed z-[96] top-0 right-0 h-full w-full sm:w-[720px] max-w-full",
            "bg-tp-bg border-l border-tp-line-soft shadow-2xl",
            "flex flex-col md:flex-row",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200",
          )}
        >
          <Dialog.Title className="sr-only">Asistente TECNOPRO</Dialog.Title>
          <Dialog.Description className="sr-only">
            Consultá sobre el estado del negocio: caja, órdenes, cobros, alertas.
          </Dialog.Description>

          {/* Sidebar de conversaciones (visible en desktop) */}
          <aside className="hidden md:flex md:w-56 border-r border-tp-line-soft bg-tp-card/40 flex-col">
            <div className="px-4 py-3 border-b border-tp-line-soft">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={nuevaConversacion}
              >
                <Plus className="w-4 h-4" />
                Nueva
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {conversaciones.length === 0 ? (
                <p className="px-4 py-6 text-xs text-tp-muted font-mono text-center">
                  Sin conversaciones todavía.
                </p>
              ) : (
                <ul className="space-y-1 px-2">
                  {conversaciones.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => abrirConversacion(c.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-xs transition-colors",
                          conversacionActualId === c.id
                            ? "bg-tp-cyan/10 text-tp-cyan"
                            : "text-tp-secondary hover:bg-tp-surface-mid hover:text-tp-text",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.titulo}</span>
                        </div>
                        <p className="text-[10px] text-tp-muted mt-0.5 font-mono">
                          {formatFechaHora(c.updated_at)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* Main: mensajes + input */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-tp-line-soft">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-tp-cyan/10 text-tp-cyan p-1.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">Asistente TECNOPRO</p>
                  <p className="text-[10.5px] text-tp-muted">
                    Solo lectura de datos. No hace cambios.
                  </p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-2 rounded-md text-tp-muted hover:text-tp-text hover:bg-tp-surface-mid"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {mensajes.length === 0 && !cargando && (
                <div className="text-center space-y-4 pt-8">
                  <div className="mx-auto rounded-full bg-tp-cyan/10 text-tp-cyan p-4 w-fit">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-tp-text">Preguntale lo que quieras</p>
                    <p className="text-sm text-tp-secondary mt-1 max-w-md mx-auto">
                      Sobre caja, órdenes, cobros pendientes, gastos, alertas del día. El asistente lee el estado actual del negocio.
                    </p>
                  </div>
                  <div className="pt-2 space-y-1.5">
                    <SugerenciaBtn onClick={() => setInput("¿Cómo va el mes?")}>
                      ¿Cómo va el mes?
                    </SugerenciaBtn>
                    <SugerenciaBtn onClick={() => setInput("¿Cuánto tengo por cobrar?")}>
                      ¿Cuánto tengo por cobrar?
                    </SugerenciaBtn>
                    <SugerenciaBtn onClick={() => setInput("¿Qué hay urgente hoy?")}>
                      ¿Qué hay urgente hoy?
                    </SugerenciaBtn>
                  </div>
                </div>
              )}

              {cargando && mensajes.length === 0 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-tp-cyan animate-spin" />
                </div>
              )}

              {mensajes.map((m, i) => (
                <BurbujaMensaje key={m.id ?? `msg-${i}`} mensaje={m} />
              ))}

              {enviando && (
                <div className="flex items-center gap-2 text-tp-muted text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pensando…
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-tp-line-soft p-3 flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu pregunta…"
                rows={2}
                disabled={enviando}
                className={cn(
                  "flex-1 rounded-md border border-tp-line bg-tp-input px-3 py-2 text-sm text-tp-text resize-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-cyan/50 focus-visible:border-tp-cyan/40",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              />
              <Button
                type="button"
                onClick={enviar}
                disabled={enviando || !input.trim()}
                size="icon"
                className="shrink-0"
                aria-label="Enviar"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────────
function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
  const esUser = mensaje.rol === "user"
  return (
    <div className={cn("flex", esUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
          esUser
            ? "bg-tp-cyan/15 text-tp-text border border-tp-cyan/30"
            : "bg-tp-card text-tp-text border border-tp-line-soft",
        )}
      >
        {mensaje.contenido}
      </div>
    </div>
  )
}

function SugerenciaBtn({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block mx-auto text-xs text-tp-cyan hover:bg-tp-cyan/10 border border-tp-cyan/30 rounded-full px-3 py-1 transition-colors"
    >
      {children}
    </button>
  )
}
