"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createPresupuesto, updatePresupuesto } from "@/app/(dashboard)/presupuestos/actions"
import type { PresupuestoCreateInput } from "@/lib/validators/presupuesto"

type ClienteOption = { id: string; id_publico: string; label: string }
type OrdenOption = { id: string; id_publico: string; label: string }

type Props = {
  mode: "create" | "edit"
  presupuestoId?: string
  clientes: ClienteOption[]
  ordenes: OrdenOption[]
  margenDefault: number
  validezDefaultDias: number
  initial?: Partial<PresupuestoCreateInput>
}

function defaultValidezDate(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function PresupuestoForm({
  mode,
  presupuestoId,
  clientes,
  ordenes,
  margenDefault,
  validezDefaultDias,
  initial,
}: Props) {
  const router = useRouter()
  const [form, setForm] = useState<PresupuestoCreateInput>({
    cliente_id: initial?.cliente_id ?? "",
    orden_id: initial?.orden_id ?? null,
    titulo: initial?.titulo ?? "",
    descripcion: initial?.descripcion ?? null,
    validez_hasta: initial?.validez_hasta ?? (mode === "create" ? defaultValidezDate(validezDefaultDias) : ""),
    margen_pct: initial?.margen_pct ?? margenDefault,
    notas_internas: initial?.notas_internas ?? null,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof PresupuestoCreateInput>(key: K, value: PresupuestoCreateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.cliente_id) {
      setError("Elegí un cliente")
      return
    }
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPresupuesto(form)
          : await updatePresupuesto(presupuestoId!, form)
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
        <h2 className="font-display text-lg font-semibold">Datos del presupuesto</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              required
              value={form.titulo}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ej. Reparación notebook Lenovo"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="descripcion">Descripción visible en el mensaje</Label>
            <Textarea
              id="descripcion"
              rows={2}
              value={form.descripcion ?? ""}
              onChange={(e) => update("descripcion", e.target.value)}
              placeholder="Detalle breve del trabajo cotizado."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente *</Label>
            <Select
              id="cliente_id"
              required
              value={form.cliente_id}
              onChange={(e) => update("cliente_id", e.target.value)}
              disabled={mode === "edit"}
            >
              <option value="">— Elegir cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id_publico} · {c.label}
                </option>
              ))}
            </Select>
            {mode === "edit" && (
              <p className="text-[11px] text-tp-muted">
                No se puede cambiar el cliente de un presupuesto ya creado.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="orden_id">Orden vinculada</Label>
            <Select
              id="orden_id"
              value={form.orden_id ?? ""}
              onChange={(e) => update("orden_id", e.target.value === "" ? null : e.target.value)}
            >
              <option value="">— Sin orden —</option>
              {ordenes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id_publico} · {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold">Vigencia y margen</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="validez_hasta">Válido hasta</Label>
            <Input
              id="validez_hasta"
              type="date"
              value={form.validez_hasta ?? ""}
              onChange={(e) => update("validez_hasta", e.target.value)}
            />
            <p className="text-[11px] text-tp-muted">
              Default: {validezDefaultDias} días desde hoy (configurable en Configuración).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="margen_pct">Margen sobre repuestos (%)</Label>
            <NumberInput
              id="margen_pct"
              min={0}
              max={500}
              required
              value={form.margen_pct}
              onChange={(v) => update("margen_pct", v ?? 0)}
            />
            <p className="text-[11px] text-tp-muted">
              Sugiere el precio al agregar repuestos: <code className="font-mono">costo × (1 + margen/100)</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-tp-line-soft bg-tp-card p-6 space-y-3">
        <Label htmlFor="notas_internas">Notas internas</Label>
        <Textarea
          id="notas_internas"
          rows={2}
          value={form.notas_internas ?? ""}
          onChange={(e) => update("notas_internas", e.target.value)}
          placeholder="No se muestran al cliente."
        />
      </section>

      {error && (
        <div role="alert" className="rounded-md border border-tp-red/40 bg-tp-red/10 px-4 py-3 text-sm text-tp-red">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" asChild disabled={isPending}>
          <Link href={mode === "create" ? "/presupuestos" : `/presupuestos/${presupuestoId}`}>
            Cancelar
          </Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending
            ? mode === "create" ? "Creando…" : "Guardando…"
            : mode === "create" ? "Crear presupuesto" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
