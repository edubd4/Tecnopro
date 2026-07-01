"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createRepuesto, updateRepuesto } from "@/app/(dashboard)/stock/actions"
import type { RepuestoInput } from "@/lib/validators/repuesto"

type Props = {
  mode: "create" | "edit"
  repuestoId?: string
  initial?: Partial<RepuestoInput>
}

const DEFAULTS: RepuestoInput = {
  nombre: "",
  codigo: null,
  descripcion: null,
  categoria: null,
  costo: 0,
  precio_venta: 0,
  stock_minimo: 0,
  ubicacion: null,
  activo: true,
}

export function RepuestoForm({ mode, repuestoId, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<RepuestoInput>({ ...DEFAULTS, ...initial })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof RepuestoInput>(key: K, value: RepuestoInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRepuesto(form)
          : await updateRepuesto(repuestoId!, form)
      if (result && !result.ok) {
        setError(result.error)
        return
      }
      if (mode === "edit") router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Datos del repuesto</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              required
              value={form.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              placeholder="Ej. Memoria RAM DDR4 8GB"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo">Código interno / SKU</Label>
            <Input
              id="codigo"
              value={form.codigo ?? ""}
              onChange={(e) => update("codigo", e.target.value)}
              placeholder="Ej. MEM-DDR4-8"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Input
              id="categoria"
              value={form.categoria ?? ""}
              onChange={(e) => update("categoria", e.target.value)}
              placeholder="Ej. Memorias"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              rows={2}
              value={form.descripcion ?? ""}
              onChange={(e) => update("descripcion", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Precios y stock</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="costo">Costo (ARS)</Label>
            <Input
              id="costo"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.costo}
              onChange={(e) => update("costo", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="precio_venta">Precio venta (ARS)</Label>
            <Input
              id="precio_venta"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.precio_venta}
              onChange={(e) => update("precio_venta", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_minimo">Stock mínimo</Label>
            <Input
              id="stock_minimo"
              type="number"
              min="0"
              step="1"
              required
              value={form.stock_minimo}
              onChange={(e) => update("stock_minimo", Number(e.target.value))}
            />
            <p className="text-[11px] text-tp-muted">
              Se muestra alerta cuando el stock actual baja de este valor.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación en depósito</Label>
            <Input
              id="ubicacion"
              value={form.ubicacion ?? ""}
              onChange={(e) => update("ubicacion", e.target.value)}
              placeholder="Ej. Estante A, caja 3"
            />
          </div>
        </div>

        {mode === "create" && (
          <p className="text-xs font-mono text-tp-muted">
            El stock inicial es 0. Cargalo desde la ficha del repuesto con un movimiento tipo ENTRADA.
          </p>
        )}
      </section>

      {error && (
        <div role="alert" className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" asChild disabled={isPending}>
          <Link href={mode === "create" ? "/stock" : `/stock/${repuestoId}`}>
            Cancelar
          </Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? mode === "create" ? "Creando…" : "Guardando…"
            : mode === "create" ? "Crear repuesto" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
