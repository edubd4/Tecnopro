"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { crearGasto } from "@/app/(dashboard)/gastos/actions"
import type { GastoCreateInput } from "@/lib/validators/gasto"
import { METODO_PAGO_LABEL } from "@/lib/caja-ui"

const METODOS = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA_DEBITO",
  "TARJETA_CREDITO",
  "MERCADO_PAGO",
  "OTRO",
] as const

type CategoriaOption = { id: number; nombre: string }

function hoyISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function GastoForm({ categorias }: { categorias: CategoriaOption[] }) {
  const [form, setForm] = useState<GastoCreateInput>({
    categoria_id: categorias[0]?.id ?? 0,
    monto: 0,
    descripcion: "",
    fecha: hoyISO(),
    metodo_pago: "EFECTIVO",
    notas: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof GastoCreateInput>(key: K, value: GastoCreateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.categoria_id) {
      setError("Elegí una categoría")
      return
    }
    if (!form.monto || Number(form.monto) <= 0) {
      setError("El monto debe ser mayor a 0")
      return
    }
    if (!form.descripcion || String(form.descripcion).trim() === "") {
      setError("La descripción es obligatoria")
      return
    }
    startTransition(async () => {
      const result = await crearGasto(form)
      if (result && !result.ok) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Datos del gasto</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="categoria_id">Categoría *</Label>
            <Select
              id="categoria_id"
              required
              value={form.categoria_id || ""}
              onChange={(e) => update("categoria_id", Number(e.target.value))}
            >
              <option value="">— Elegir —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto">Monto (ARS) *</Label>
            <Input
              id="monto"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.monto || ""}
              onChange={(e) => update("monto", Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              type="date"
              required
              value={form.fecha ?? ""}
              onChange={(e) => update("fecha", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodo_pago">Método de pago *</Label>
            <Select
              id="metodo_pago"
              required
              value={form.metodo_pago}
              onChange={(e) => update("metodo_pago", e.target.value as GastoCreateInput["metodo_pago"])}
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {METODO_PAGO_LABEL[m]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              required
              value={form.descripcion ?? ""}
              onChange={(e) => update("descripcion", e.target.value)}
              placeholder="Ej. Cables UTP proveedor XYZ · Factura de luz Junio"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notas">Notas internas</Label>
            <Textarea
              id="notas"
              rows={2}
              value={form.notas ?? ""}
              onChange={(e) => update("notas", e.target.value)}
              placeholder="Solo visible para vos."
            />
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" asChild disabled={isPending}>
          <Link href="/gastos">Cancelar</Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Registrando…" : "Registrar gasto"}
        </Button>
      </div>
    </form>
  )
}
