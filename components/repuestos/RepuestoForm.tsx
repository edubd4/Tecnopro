"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ComboBox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput, NumberInput } from "@/components/ui/number-input"
import { Textarea } from "@/components/ui/textarea"
import { createRepuesto, updateRepuesto } from "@/app/(dashboard)/stock/actions"
import type { RepuestoInput } from "@/lib/validators/repuesto"

type Props = {
  mode: "create" | "edit"
  repuestoId?: string
  initial?: Partial<RepuestoInput>
  // Sugerencias de valores ya usados (para el ComboBox). Se computan server-side
  // con SELECT DISTINCT en la página que renderiza el form.
  categoriasExistentes?: string[]
  ubicacionesExistentes?: string[]
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

export function RepuestoForm({
  mode,
  repuestoId,
  initial,
  categoriasExistentes = [],
  ubicacionesExistentes = [],
}: Props) {
  const router = useRouter()
  const [form, setForm] = useState<RepuestoInput>({ ...DEFAULTS, ...initial })
  const [stockInicial, setStockInicial] = useState<number | null>(null)
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
          ? await createRepuesto(form, stockInicial ?? 0)
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
              placeholder={mode === "create" ? "Si lo dejás vacío usamos REP-XXXX" : "Ej. MEM-DDR4-8"}
            />
            {mode === "create" && (
              <p className="text-[11px] text-tp-muted">
                Podés dejarlo vacío. Se asigna el mismo REP-XXXX del sistema automáticamente.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <ComboBox
              id="categoria"
              value={form.categoria ?? null}
              onChange={(v) => update("categoria", v)}
              options={categoriasExistentes}
              placeholder="Ej. Memorias RAM"
              emptyMessage="Todavía no hay categorías cargadas"
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
            <MoneyInput
              id="costo"
              min={0}
              required
              value={form.costo}
              onChange={(v) => update("costo", v ?? 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="precio_venta">Precio venta (ARS)</Label>
            <MoneyInput
              id="precio_venta"
              min={0}
              required
              value={form.precio_venta}
              onChange={(v) => update("precio_venta", v ?? 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_minimo">Stock mínimo</Label>
            <NumberInput
              id="stock_minimo"
              min={0}
              required
              value={form.stock_minimo}
              onChange={(v) => update("stock_minimo", v ?? 0)}
            />
            <p className="text-[11px] text-tp-muted">
              Se muestra alerta cuando el stock actual baja de este valor.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación en depósito</Label>
            <ComboBox
              id="ubicacion"
              value={form.ubicacion ?? null}
              onChange={(v) => update("ubicacion", v)}
              options={ubicacionesExistentes}
              placeholder="Ej. Estante A, caja 3"
              emptyMessage="Todavía no hay ubicaciones cargadas"
            />
          </div>
        </div>
      </section>

      {mode === "create" && (
        <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Stock inicial</h2>
            <p className="text-sm text-tp-secondary mt-1">
              Si ya tenés unidades de este repuesto en tu depósito, cargalas acá.{" "}
              <span className="text-tp-green font-medium">No afecta la caja</span>{" "}
              — asumimos que las tenías desde antes.
            </p>
          </div>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="stock_inicial">Unidades</Label>
            <NumberInput
              id="stock_inicial"
              min={0}
              value={stockInicial}
              onChange={setStockInicial}
              placeholder="0"
            />
            <p className="text-[11px] text-tp-muted">
              Si lo dejás en 0, se registra el repuesto sin stock y lo cargás
              después con un movimiento tipo ENTRADA.
            </p>
          </div>
        </section>
      )}

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
