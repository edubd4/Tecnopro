"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { crearMovimiento } from "@/app/(dashboard)/caja/actions"
import type { MovimientoCreateInput } from "@/lib/validators/caja"
import {
  TIPO_MOV_CAJA_LABEL,
  ORIGEN_MOV_CAJA_LABEL,
  METODO_PAGO_LABEL,
  ORIGENES_MANUALES,
} from "@/lib/caja-ui"

const TIPOS = ["INGRESO", "EGRESO"] as const
const METODOS = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA_DEBITO",
  "TARJETA_CREDITO",
  "MERCADO_PAGO",
  "OTRO",
] as const

export function MovimientoForm() {
  const [form, setForm] = useState<MovimientoCreateInput>({
    tipo: "EGRESO",
    origen: "OTRO",
    monto: 0,
    metodo_pago: "EFECTIVO",
    descripcion: "",
    orden_id: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof MovimientoCreateInput>(key: K, value: MovimientoCreateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.descripcion || String(form.descripcion).trim() === "") {
      setError("La descripción es obligatoria")
      return
    }
    if (!form.monto || Number(form.monto) <= 0) {
      setError("El monto debe ser mayor a 0")
      return
    }
    startTransition(async () => {
      const result = await crearMovimiento(form)
      if (result && !result.ok) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Datos del movimiento</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select
              id="tipo"
              required
              value={form.tipo}
              onChange={(e) => update("tipo", e.target.value as "INGRESO" | "EGRESO")}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_MOV_CAJA_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origen">Origen *</Label>
            <Select
              id="origen"
              required
              value={form.origen}
              onChange={(e) => update("origen", e.target.value as MovimientoCreateInput["origen"])}
            >
              {ORIGENES_MANUALES.map((o) => (
                <option key={o} value={o}>
                  {ORIGEN_MOV_CAJA_LABEL[o]}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-tp-muted">
              &quot;Cobro de orden&quot; no aparece: se registra automáticamente desde la ficha de cada orden.
            </p>
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
            <Label htmlFor="metodo_pago">Método de pago *</Label>
            <Select
              id="metodo_pago"
              required
              value={form.metodo_pago}
              onChange={(e) => update("metodo_pago", e.target.value as MovimientoCreateInput["metodo_pago"])}
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
            <Textarea
              id="descripcion"
              rows={2}
              required
              value={form.descripcion ?? ""}
              onChange={(e) => update("descripcion", e.target.value)}
              placeholder="Ej. Pago proveedor cables · Apertura de caja del día · Ajuste conteo"
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
          <Link href="/caja">Cancelar</Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Registrando…" : "Registrar movimiento"}
        </Button>
      </div>
    </form>
  )
}
