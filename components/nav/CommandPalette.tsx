"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { useRouter } from "next/navigation"
import { Search, ClipboardList, FileText, Users, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// CommandPalette — buscador global. Cmd+K / Ctrl+K abre.
// Busca en órdenes, presupuestos y clientes vía /api/search.
// RLS filtra: técnicos solo ven lo suyo.
// ============================================================================

type ClienteInfo = {
  nombre: string
  apellido: string | null
  razon_social: string | null
  tipo: string
}

type OrdenResult = {
  id: string
  id_publico: string
  estado: string
  equipo_desc: string | null
  clientes: ClienteInfo | null
}

type PresupuestoResult = {
  id: string
  id_publico: string
  titulo: string
  estado: string
  clientes: ClienteInfo | null
}

type ClienteResult = {
  id: string
  id_publico: string
  tipo: string
  nombre: string
  apellido: string | null
  razon_social: string | null
  telefono: string | null
}

type SearchData = {
  ordenes: OrdenResult[]
  presupuestos: PresupuestoResult[]
  clientes: ClienteResult[]
}

function nombreCliente(c: ClienteInfo | null): string {
  if (!c) return "—"
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

function nombreClienteFull(c: ClienteResult): string {
  if (c.tipo === "EMPRESA") return c.razon_social ?? c.nombre
  return [c.nombre, c.apellido].filter(Boolean).join(" ")
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [data, setData] = React.useState<SearchData>({ ordenes: [], presupuestos: [], clientes: [] })
  const [cargando, setCargando] = React.useState(false)
  const [seleccionado, setSeleccionado] = React.useState(0)

  // Hotkey global Cmd+K / Ctrl+K
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Búsqueda debounced
  React.useEffect(() => {
    const q = query.trim()
    if (!open) return
    if (q.length < 2) {
      setData({ ordenes: [], presupuestos: [], clientes: [] })
      return
    }
    setCargando(true)
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const body = await res.json()
        if (body.ok) {
          setData(body.data as SearchData)
          setSeleccionado(0)
        }
      } catch (err) {
        console.error("[CommandPalette] error:", err)
      } finally {
        setCargando(false)
      }
    }, 200)
    return () => clearTimeout(timeoutId)
  }, [query, open])

  // Reset al cerrar
  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setData({ ordenes: [], presupuestos: [], clientes: [] })
      setSeleccionado(0)
    }
  }, [open])

  const items = React.useMemo(() => {
    const out: { href: string; label: string; sub: string; kind: "orden" | "presupuesto" | "cliente" }[] = []
    for (const o of data.ordenes) {
      out.push({
        href: `/ordenes/${o.id}`,
        label: `${o.id_publico} · ${o.equipo_desc ?? "sin equipo"}`,
        sub: `Orden · ${nombreCliente(o.clientes)} · ${o.estado}`,
        kind: "orden",
      })
    }
    for (const p of data.presupuestos) {
      out.push({
        href: `/presupuestos/${p.id}`,
        label: `${p.id_publico} · ${p.titulo}`,
        sub: `Presupuesto · ${nombreCliente(p.clientes)} · ${p.estado}`,
        kind: "presupuesto",
      })
    }
    for (const c of data.clientes) {
      out.push({
        href: `/clientes/${c.id}`,
        label: `${c.id_publico} · ${nombreClienteFull(c)}`,
        sub: `Cliente${c.telefono ? ` · ${c.telefono}` : ""}`,
        kind: "cliente",
      })
    }
    return out
  }, [data])

  function irA(href: string) {
    setOpen(false)
    router.push(href)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSeleccionado((s) => Math.min(s + 1, items.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSeleccionado((s) => Math.max(s - 1, 0))
    } else if (e.key === "Enter" && items[seleccionado]) {
      e.preventDefault()
      irA(items[seleccionado].href)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-100" />
        <Dialog.Content
          onKeyDown={handleKeyDown}
          className="fixed z-[91] left-1/2 top-[15%] -translate-x-1/2 w-[calc(100vw-2rem)] sm:max-w-lg rounded-xl border border-tp-line-soft bg-tp-card shadow-2xl overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-150"
        >
          <Dialog.Title className="sr-only">Búsqueda global</Dialog.Title>
          <Dialog.Description className="sr-only">
            Buscá órdenes, presupuestos o clientes por ID, nombre o teléfono.
          </Dialog.Description>

          <div className="flex items-center gap-3 px-4 py-3 border-b border-tp-line-soft">
            <Search className="w-4 h-4 text-tp-muted shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar OT, PRES, CLI, nombre o teléfono…"
              className="flex-1 bg-transparent text-sm text-tp-text placeholder:text-tp-muted focus:outline-none"
            />
            {cargando && <Loader2 className="w-4 h-4 text-tp-cyan animate-spin shrink-0" />}
            <span className="text-[10px] font-mono text-tp-muted shrink-0 hidden sm:inline">Esc</span>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {query.trim().length < 2 ? (
              <p className="px-4 py-8 text-xs text-tp-muted text-center font-mono">
                Escribí al menos 2 caracteres para buscar.
              </p>
            ) : items.length === 0 && !cargando ? (
              <p className="px-4 py-8 text-xs text-tp-muted text-center font-mono">
                Sin resultados para &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <ul className="py-1">
                {items.map((item, idx) => (
                  <li key={`${item.kind}-${item.href}`}>
                    <button
                      type="button"
                      onClick={() => irA(item.href)}
                      onMouseEnter={() => setSeleccionado(idx)}
                      className={cn(
                        "w-full text-left px-4 py-2 flex items-center gap-3 transition-colors",
                        seleccionado === idx
                          ? "bg-tp-cyan/10"
                          : "hover:bg-tp-surface-mid",
                      )}
                    >
                      <span className="shrink-0 text-tp-cyan">
                        {item.kind === "orden" ? (
                          <ClipboardList className="w-4 h-4" />
                        ) : item.kind === "presupuesto" ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Users className="w-4 h-4" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-tp-text truncate">{item.label}</p>
                        <p className="text-[11px] text-tp-muted truncate">{item.sub}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-tp-line-soft px-4 py-2 flex items-center justify-between text-[10px] font-mono text-tp-muted">
            <span>↑↓ para navegar · Enter para abrir</span>
            <span className="hidden sm:inline">Ctrl+K para abrir</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
