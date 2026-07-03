"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Check, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  crearCategoriaGasto,
  renombrarCategoriaGasto,
  toggleCategoriaGasto,
} from "@/app/(dashboard)/configuracion/categorias-gasto/actions"

export type Categoria = {
  id: number
  nombre: string
  activo: boolean
  usos: number         // cantidad de gastos históricos con esta categoría
}

type Props = {
  categorias: Categoria[]
}

export function CategoriasGastoManager({ categorias }: Props) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [nombreNuevo, setNombreNuevo] = useState("")
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nombreEditado, setNombreEditado] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreNuevo.trim()) return
    startTransition(async () => {
      const result = await crearCategoriaGasto(nombreNuevo.trim())
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Categoría "${nombreNuevo.trim()}" creada`)
      setNombreNuevo("")
      router.refresh()
    })
  }

  function empezarEdicion(cat: Categoria) {
    setEditandoId(cat.id)
    setNombreEditado(cat.nombre)
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setNombreEditado("")
  }

  function handleRenombrar(id: number) {
    if (!nombreEditado.trim()) return
    startTransition(async () => {
      const result = await renombrarCategoriaGasto(id, nombreEditado.trim())
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Categoría renombrada")
      setEditandoId(null)
      setNombreEditado("")
      router.refresh()
    })
  }

  async function handleToggle(cat: Categoria) {
    const ok = await confirm({
      title: cat.activo
        ? `¿Desactivar "${cat.nombre}"?`
        : `¿Reactivar "${cat.nombre}"?`,
      description: cat.activo
        ? "Los gastos históricos siguen intactos, pero la categoría no aparece más al cargar un gasto nuevo."
        : "La categoría vuelve a aparecer en el dropdown al cargar un gasto.",
      confirmLabel: cat.activo ? "Desactivar" : "Reactivar",
      tone: cat.activo ? "warning" : "default",
    })
    if (!ok) return

    startTransition(async () => {
      const result = await toggleCategoriaGasto(cat.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(cat.activo ? "Categoría desactivada" : "Categoría reactivada")
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Form de crear */}
      <form onSubmit={handleCrear} className="rounded-xl border border-tp-line-soft bg-tp-card p-5 space-y-3">
        <div>
          <p className="font-mono text-[10.5px] text-tp-cyan tracking-[0.14em] uppercase">
            Crear categoría
          </p>
          <p className="text-sm text-tp-secondary mt-1">
            Estas categorías aparecen en el dropdown al cargar un gasto.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Ej. Combustible, Marketing, Seguros"
            disabled={isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={isPending || !nombreNuevo.trim()}>
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>
      </form>

      {/* Lista */}
      <div className="rounded-xl border border-tp-line-soft bg-tp-card overflow-hidden">
        <div className="px-4 py-3 border-b border-tp-line-soft flex items-center justify-between">
          <h2 className="font-display font-semibold text-sm">Categorías cargadas</h2>
          <span className="font-mono text-[10.5px] text-tp-muted">
            {categorias.length} · {categorias.filter((c) => c.activo).length} activa(s)
          </span>
        </div>
        {categorias.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tp-muted font-mono text-center">
            Todavía no hay categorías. Crea la primera arriba.
          </p>
        ) : (
          <ul className="divide-y divide-tp-line-soft">
            {categorias.map((cat) => (
              <li key={cat.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                {editandoId === cat.id ? (
                  <>
                    <Input
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      disabled={isPending}
                      className="flex-1 min-w-[200px]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleRenombrar(cat.id)
                        } else if (e.key === "Escape") {
                          cancelarEdicion()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleRenombrar(cat.id)}
                      disabled={isPending || !nombreEditado.trim()}
                    >
                      <Check className="w-4 h-4" />
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={cancelarEdicion}
                      disabled={isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span
                        className={
                          cat.activo ? "text-tp-text font-medium" : "text-tp-muted line-through"
                        }
                      >
                        {cat.nombre}
                      </span>
                      {cat.usos > 0 && (
                        <span className="font-mono text-[10.5px] text-tp-muted">
                          · {cat.usos} gasto{cat.usos === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <Badge variant={cat.activo ? "green" : "gray"}>
                      {cat.activo ? "Activa" : "Inactiva"}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => empezarEdicion(cat)}
                      disabled={isPending}
                      aria-label="Renombrar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(cat)}
                      disabled={isPending}
                    >
                      {cat.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs font-mono text-tp-muted">
        Las categorías con gastos históricos no se pueden borrar — solo desactivar.
        Los gastos ya cargados mantienen su categoría original.
      </p>
    </div>
  )
}
